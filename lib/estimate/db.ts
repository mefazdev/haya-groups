import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client, type InStatement } from "@libsql/client";
import { buildDefaultCatalog } from "./defaults";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

/** Returns the singleton Turso / LibSQL client. Falls back to a local SQLite file in development. */
export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TURSO_DATABASE_URL is not configured");
    }
    const dir = path.join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    client = createClient({ url: `file:${path.join(dir, "haya-dev.db")}` });
    return client;
  }

  client = createClient({ url, authToken });
  return client;
}

/** Ensures schema tables exist and seeds default menu categories/dishes on first run. */
export async function ensureDb(): Promise<Client> {
  const db = getDb();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db.batch(
        [
          `CREATE TABLE IF NOT EXISTS estimates (
            id TEXT PRIMARY KEY,
            number TEXT NOT NULL,
            client_name TEXT NOT NULL DEFAULT '',
            data TEXT NOT NULL,
            share_token TEXT UNIQUE,
            updated_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
          )`,
          `CREATE INDEX IF NOT EXISTS idx_estimates_updated_at ON estimates(updated_at DESC)`,
          `CREATE TABLE IF NOT EXISTS estimate_counters (
            year INTEGER PRIMARY KEY,
            last_value INTEGER NOT NULL DEFAULT 0
          )`,
          `CREATE TABLE IF NOT EXISTS menu_categories (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'dish',
            columns INTEGER NOT NULL DEFAULT 1,
            sort_order INTEGER NOT NULL DEFAULT 0
          )`,
          `CREATE TABLE IF NOT EXISTS menu_items (
            id TEXT PRIMARY KEY,
            category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            is_optional INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0
          )`,
          `CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id, sort_order)`,
        ],
        "write",
      );

      // Enable foreign keys for cascade deletes in SQLite / LibSQL.
      await db.execute("PRAGMA foreign_keys = ON");

      const countRes = await db.execute("SELECT COUNT(*) AS count FROM menu_categories");
      const count = Number(countRes.rows[0]?.count ?? 0);
      if (count === 0) {
        const seed = buildDefaultCatalog();
        const stmts: InStatement[] = [];
        for (const cat of seed) {
          stmts.push({
            sql: "INSERT OR IGNORE INTO menu_categories (id, title, kind, columns, sort_order) VALUES (?, ?, ?, ?, ?)",
            args: [cat.id, cat.title, cat.kind, cat.columns, cat.sortOrder],
          });
          for (const item of cat.items) {
            stmts.push({
              sql: "INSERT OR IGNORE INTO menu_items (id, category_id, name, is_optional, sort_order) VALUES (?, ?, ?, ?, ?)",
              args: [item.id, item.categoryId, item.name, item.isOptional ? 1 : 0, item.sortOrder],
            });
          }
        }
        if (stmts.length > 0) await db.batch(stmts, "write");
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  return db;
}
