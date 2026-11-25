import { upgradeEstimate, type StoredEstimate } from "./defaults";
import type { Estimate, MenuCategoryRecord, MenuItemRecord } from "./types";

const LIST_KEY = "haya.quotations.v1";
const COUNTER_KEY = "haya.quotationCounter.v1";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (res.status === 401 && typeof window !== "undefined") {
    window.location.href = "/estimates/login";
    throw new Error("Session expired");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/* ---------------- Local Browser Migration Helpers ---------------- */

export function readLocalEstimates(): Estimate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredEstimate[];
    return Array.isArray(parsed) ? parsed.map(upgradeEstimate) : [];
  } catch {
    return [];
  }
}

export function clearLocalEstimates() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LIST_KEY);
    localStorage.removeItem(COUNTER_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

/* ---------------- Estimates Cloud API ---------------- */

export async function fetchEstimatesState(): Promise<{
  estimates: Estimate[];
  menuCatalog: MenuCategoryRecord[];
}> {
  return api("/estimates/api/estimates", { cache: "no-store" });
}

export async function createEstimate(): Promise<Estimate> {
  const res = await api<{ estimate: Estimate }>("/estimates/api/estimates", {
    method: "POST",
    body: JSON.stringify({ action: "create" }),
  });
  return res.estimate;
}

export async function duplicateEstimate(sourceId: string): Promise<Estimate> {
  const res = await api<{ estimate: Estimate }>("/estimates/api/estimates", {
    method: "POST",
    body: JSON.stringify({ action: "duplicate", sourceId }),
  });
  return res.estimate;
}

export async function importLocalEstimates(estimates: Estimate[]): Promise<{
  imported: number;
  estimates: Estimate[];
}> {
  return api("/estimates/api/estimates", {
    method: "POST",
    body: JSON.stringify({ action: "import", estimates }),
  });
}

export async function saveEstimate(q: Estimate, keepalive = false): Promise<Estimate> {
  const res = await api<{ estimate: Estimate }>(`/estimates/api/estimates/${encodeURIComponent(q.id)}`, {
    method: "PUT",
    body: JSON.stringify({ estimate: q }),
    keepalive,
  });
  return res.estimate;
}

export async function deleteEstimate(id: string): Promise<void> {
  await api(`/estimates/api/estimates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createShareLink(id: string): Promise<string> {
  const res = await api<{ shareToken: string }>(`/estimates/api/estimates/${encodeURIComponent(id)}/share`, {
    method: "POST",
  });
  return res.shareToken;
}

export async function revokeShareLink(id: string): Promise<void> {
  await api(`/estimates/api/estimates/${encodeURIComponent(id)}/share`, { method: "DELETE" });
}

/* ---------------- Master Menu Catalog API ---------------- */

export async function createMenuCategoryApi(input: {
  title: string;
  kind?: "dish" | "utensil";
  columns?: 1 | 2;
}): Promise<{ category: MenuCategoryRecord; menuCatalog: MenuCategoryRecord[] }> {
  return api("/estimates/api/menu/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMenuCategoryApi(
  id: string,
  patch: { title?: string; columns?: 1 | 2; kind?: "dish" | "utensil" },
): Promise<MenuCategoryRecord[]> {
  const res = await api<{ menuCatalog: MenuCategoryRecord[] }>(
    `/estimates/api/menu/categories/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return res.menuCatalog;
}

export async function reorderMenuCategoriesApi(orderedIds: string[]): Promise<MenuCategoryRecord[]> {
  const res = await api<{ menuCatalog: MenuCategoryRecord[] }>("/estimates/api/menu/categories", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
  return res.menuCatalog;
}

export async function deleteMenuCategoryApi(id: string): Promise<MenuCategoryRecord[]> {
  const res = await api<{ menuCatalog: MenuCategoryRecord[] }>(
    `/estimates/api/menu/categories/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return res.menuCatalog;
}

export async function createMenuItemApi(input: {
  categoryId: string;
  name: string;
  isOptional?: boolean;
}): Promise<{ item: MenuItemRecord; menuCatalog: MenuCategoryRecord[] }> {
  return api("/estimates/api/menu/items", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateMenuItemApi(
  id: string,
  patch: { name?: string; categoryId?: string; isOptional?: boolean },
): Promise<MenuCategoryRecord[]> {
  const res = await api<{ menuCatalog: MenuCategoryRecord[] }>(
    `/estimates/api/menu/items/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  return res.menuCatalog;
}

export async function deleteMenuItemApi(id: string): Promise<MenuCategoryRecord[]> {
  const res = await api<{ menuCatalog: MenuCategoryRecord[] }>(
    `/estimates/api/menu/items/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  return res.menuCatalog;
}
