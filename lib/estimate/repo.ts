import { randomBytes } from "node:crypto";
import { ensureDb } from "./db";
import {
  buildDefaultTemplate,
  reIdEstimate,
  todayIso,
  upgradeEstimate,
  type StoredEstimate,
} from "./defaults";
import type { Estimate, MenuCategoryRecord, MenuItemRecord } from "./types";
import { uid } from "./utils";

const rowToEstimate = (row: Record<string, unknown>): Estimate => {
  const parsed = JSON.parse(String(row.data)) as StoredEstimate;
  const upgraded = upgradeEstimate(parsed);
  return {
    ...upgraded,
    shareToken: row.share_token ? String(row.share_token) : null,
  };
};

/** Generates the next sequential ADCO-YYYY-XXXX number atomically for the current year. */
export async function nextEstimateNumber(): Promise<string> {
  const db = await ensureDb();
  const year = new Date().getFullYear();
  const res = await db.execute({
    sql: `INSERT INTO estimate_counters (year, last_value) VALUES (?, 1)
          ON CONFLICT(year) DO UPDATE SET last_value = last_value + 1
          RETURNING last_value`,
    args: [year],
  });
  const n = Number(res.rows[0]?.last_value ?? 1);
  return `ADCO-${year}-${String(n).padStart(4, "0")}`;
}

/** Syncs counter so newly created estimates never collide with imported numbers. */
async function syncCounterFromNumbers(numbers: string[]) {
  const db = await ensureDb();
  const maxByYear = new Map<number, number>();
  for (const num of numbers) {
    const match = /^ADCO-(\d{4})-(\d+)$/.exec(num.trim());
    if (!match) continue;
    const year = Number(match[1]);
    const val = Number(match[2]);
    if (val > (maxByYear.get(year) ?? 0)) maxByYear.set(year, val);
  }
  for (const [year, maxVal] of maxByYear) {
    await db.execute({
      sql: `INSERT INTO estimate_counters (year, last_value) VALUES (?, ?)
            ON CONFLICT(year) DO UPDATE SET last_value = MAX(last_value, excluded.last_value)`,
      args: [year, maxVal],
    });
  }
}

export async function listEstimates(): Promise<Estimate[]> {
  const db = await ensureDb();
  const res = await db.execute("SELECT data, share_token FROM estimates ORDER BY updated_at DESC");
  return res.rows.map((row) => rowToEstimate(row));
}

export async function getEstimateById(id: string): Promise<Estimate | null> {
  const db = await ensureDb();
  const res = await db.execute({
    sql: "SELECT data, share_token FROM estimates WHERE id = ? LIMIT 1",
    args: [id],
  });
  return res.rows[0] ? rowToEstimate(res.rows[0]) : null;
}

export async function getEstimateByShareToken(token: string): Promise<Estimate | null> {
  const db = await ensureDb();
  const res = await db.execute({
    sql: "SELECT data, share_token FROM estimates WHERE share_token = ? LIMIT 1",
    args: [token],
  });
  return res.rows[0] ? rowToEstimate(res.rows[0]) : null;
}

export async function createEstimateInDb(): Promise<Estimate> {
  const db = await ensureDb();
  const catalog = await getMenuCatalog();
  const number = await nextEstimateNumber();
  const now = Date.now();
  const estimate: Estimate = {
    ...buildDefaultTemplate(catalog),
    id: uid(),
    number,
    date: todayIso(),
    updatedAt: now,
    shareToken: null,
  };
  await db.execute({
    sql: `INSERT INTO estimates (id, number, client_name, data, share_token, updated_at, created_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    args: [estimate.id, estimate.number, estimate.client.name, JSON.stringify(estimate), now, now],
  });
  return estimate;
}

export async function duplicateEstimateInDb(sourceId: string): Promise<Estimate | null> {
  const source = await getEstimateById(sourceId);
  if (!source) return null;
  const db = await ensureDb();
  const number = await nextEstimateNumber();
  const now = Date.now();
  const cloned = reIdEstimate(source);
  const copy: Estimate = {
    ...cloned,
    id: uid(),
    number,
    date: todayIso(),
    updatedAt: now,
    shareToken: null,
  };
  await db.execute({
    sql: `INSERT INTO estimates (id, number, client_name, data, share_token, updated_at, created_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    args: [copy.id, copy.number, copy.client.name, JSON.stringify(copy), now, now],
  });
  return copy;
}

export async function saveEstimateInDb(estimate: Estimate): Promise<Estimate> {
  const db = await ensureDb();
  const now = estimate.updatedAt || Date.now();
  const payload: Estimate = { ...estimate, updatedAt: now };
  delete payload.shareToken;
  const serialized = JSON.stringify(payload);

  await db.execute({
    sql: `INSERT INTO estimates (id, number, client_name, data, share_token, updated_at, created_at)
          VALUES (?, ?, ?, ?, NULL, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            number = excluded.number,
            client_name = excluded.client_name,
            data = excluded.data,
            updated_at = excluded.updated_at`,
    args: [payload.id, payload.number, payload.client.name, serialized, now, now],
  });

  const saved = await getEstimateById(payload.id);
  return saved ?? payload;
}

export async function deleteEstimateInDb(id: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: "DELETE FROM estimates WHERE id = ?", args: [id] });
}

export async function ensureShareToken(id: string): Promise<string | null> {
  const existing = await getEstimateById(id);
  if (!existing) return null;
  if (existing.shareToken) return existing.shareToken;

  const db = await ensureDb();
  const token = randomBytes(16).toString("base64url");
  await db.execute({
    sql: "UPDATE estimates SET share_token = ? WHERE id = ?",
    args: [token, id],
  });
  return token;
}

export async function revokeShareToken(id: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({
    sql: "UPDATE estimates SET share_token = NULL WHERE id = ?",
    args: [id],
  });
}

export async function importEstimatesInDb(rawList: StoredEstimate[]): Promise<number> {
  const db = await ensureDb();
  let imported = 0;
  const numbers: string[] = [];

  for (const raw of rawList) {
    const q = upgradeEstimate(raw);
    if (!q.id) continue;
    numbers.push(q.number);
    const now = q.updatedAt || Date.now();
    const clean = { ...q };
    delete clean.shareToken;
    const res = await db.execute({
      sql: `INSERT OR IGNORE INTO estimates (id, number, client_name, data, share_token, updated_at, created_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      args: [q.id, q.number, q.client.name, JSON.stringify(clean), now, now],
    });
    if (res.rowsAffected > 0) imported += 1;
  }

  if (numbers.length > 0) await syncCounterFromNumbers(numbers);
  return imported;
}

/* ---------------- Master Menu Catalog ---------------- */

export async function getMenuCatalog(): Promise<MenuCategoryRecord[]> {
  const db = await ensureDb();
  const [catRes, itemRes] = await Promise.all([
    db.execute("SELECT id, title, kind, columns, sort_order FROM menu_categories ORDER BY sort_order ASC, title ASC"),
    db.execute("SELECT id, category_id, name, is_optional, sort_order FROM menu_items ORDER BY sort_order ASC, name COLLATE NOCASE ASC"),
  ]);

  const itemsByCat = new Map<string, MenuItemRecord[]>();
  for (const row of itemRes.rows) {
    const categoryId = String(row.category_id);
    const list = itemsByCat.get(categoryId) ?? [];
    list.push({
      id: String(row.id),
      categoryId,
      name: String(row.name),
      isOptional: Number(row.is_optional) === 1,
      sortOrder: Number(row.sort_order),
    });
    itemsByCat.set(categoryId, list);
  }

  return catRes.rows.map((row) => {
    const id = String(row.id);
    return {
      id,
      title: String(row.title),
      kind: row.kind === "utensil" ? "utensil" : "dish",
      columns: Number(row.columns) === 2 ? 2 : 1,
      sortOrder: Number(row.sort_order),
      items: itemsByCat.get(id) ?? [],
    };
  });
}

export async function createMenuCategory(input: {
  title: string;
  kind?: "dish" | "utensil";
  columns?: 1 | 2;
}): Promise<MenuCategoryRecord> {
  const db = await ensureDb();
  const title = input.title.trim();
  if (!title) throw new Error("Category title is required");

  const maxRes = await db.execute("SELECT COALESCE(MAX(sort_order), -1) AS m FROM menu_categories");
  const sortOrder = Number(maxRes.rows[0]?.m ?? -1) + 1;
  const id = `cat_${uid()}`;
  const kind = input.kind === "utensil" ? "utensil" : "dish";
  const columns = input.columns === 2 ? 2 : 1;

  await db.execute({
    sql: "INSERT INTO menu_categories (id, title, kind, columns, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [id, title, kind, columns, sortOrder],
  });

  return { id, title, kind, columns, sortOrder, items: [] };
}

export async function updateMenuCategory(
  id: string,
  patch: { title?: string; columns?: 1 | 2; kind?: "dish" | "utensil" },
): Promise<void> {
  const db = await ensureDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) throw new Error("Category title cannot be empty");
    sets.push("title = ?");
    args.push(t);
  }
  if (patch.columns !== undefined) {
    sets.push("columns = ?");
    args.push(patch.columns === 2 ? 2 : 1);
  }
  if (patch.kind !== undefined) {
    sets.push("kind = ?");
    args.push(patch.kind === "utensil" ? "utensil" : "dish");
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.execute({ sql: `UPDATE menu_categories SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function reorderMenuCategories(orderedIds: string[]): Promise<void> {
  const db = await ensureDb();
  const stmts = orderedIds.map((id, idx) => ({
    sql: "UPDATE menu_categories SET sort_order = ? WHERE id = ?",
    args: [idx, id],
  }));
  if (stmts.length > 0) await db.batch(stmts, "write");
}

export async function deleteMenuCategory(id: string): Promise<void> {
  const db = await ensureDb();
  await db.batch(
    [
      { sql: "DELETE FROM menu_items WHERE category_id = ?", args: [id] },
      { sql: "DELETE FROM menu_categories WHERE id = ?", args: [id] },
    ],
    "write",
  );
}

export async function createMenuItem(input: {
  categoryId: string;
  name: string;
  isOptional?: boolean;
}): Promise<MenuItemRecord> {
  const db = await ensureDb();
  const name = input.name.trim();
  if (!name) throw new Error("Dish name is required");

  // Prevent case-insensitive duplicate in the same category.
  const dup = await db.execute({
    sql: "SELECT id, category_id, name, is_optional, sort_order FROM menu_items WHERE category_id = ? AND LOWER(TRIM(name)) = LOWER(?) LIMIT 1",
    args: [input.categoryId, name],
  });
  if (dup.rows[0]) {
    const r = dup.rows[0];
    return {
      id: String(r.id),
      categoryId: String(r.category_id),
      name: String(r.name),
      isOptional: Number(r.is_optional) === 1,
      sortOrder: Number(r.sort_order),
    };
  }

  const maxRes = await db.execute({
    sql: "SELECT COALESCE(MAX(sort_order), -1) AS m FROM menu_items WHERE category_id = ?",
    args: [input.categoryId],
  });
  const sortOrder = Number(maxRes.rows[0]?.m ?? -1) + 1;
  const id = `item_${uid()}`;
  const isOptional = !!input.isOptional;

  await db.execute({
    sql: "INSERT INTO menu_items (id, category_id, name, is_optional, sort_order) VALUES (?, ?, ?, ?, ?)",
    args: [id, input.categoryId, name, isOptional ? 1 : 0, sortOrder],
  });

  return { id, categoryId: input.categoryId, name, isOptional, sortOrder };
}

export async function updateMenuItem(
  id: string,
  patch: { name?: string; categoryId?: string; isOptional?: boolean },
): Promise<void> {
  const db = await ensureDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) throw new Error("Dish name cannot be empty");
    sets.push("name = ?");
    args.push(n);
  }
  if (patch.categoryId !== undefined) {
    sets.push("category_id = ?");
    args.push(patch.categoryId);
  }
  if (patch.isOptional !== undefined) {
    sets.push("is_optional = ?");
    args.push(patch.isOptional ? 1 : 0);
  }
  if (sets.length === 0) return;
  args.push(id);
  await db.execute({ sql: `UPDATE menu_items SET ${sets.join(", ")} WHERE id = ?`, args });
}

export async function deleteMenuItem(id: string): Promise<void> {
  const db = await ensureDb();
  await db.execute({ sql: "DELETE FROM menu_items WHERE id = ?", args: [id] });
}
