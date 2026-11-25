"use client";

import { FormEvent, useState } from "react";
import type { MenuCategoryRecord, MenuItemRecord } from "@/lib/estimate/types";
import {
  createMenuCategoryApi,
  createMenuItemApi,
  deleteMenuCategoryApi,
  deleteMenuItemApi,
  reorderMenuCategoriesApi,
  updateMenuCategoryApi,
  updateMenuItemApi,
} from "@/lib/estimate/storage";

interface Props {
  catalog: MenuCategoryRecord[];
  onChange: (catalog: MenuCategoryRecord[]) => void;
  onBack: () => void;
}

const inputCls =
  "w-full min-h-11 rounded-lg bg-white border border-[#a08f70] px-3 py-2 text-base text-[#26221c] placeholder:text-[#7a7163] focus:outline-none focus:border-[#6f5629] focus:ring-2 focus:ring-[#a88a55]/40";
const btnCls =
  "inline-flex items-center justify-center min-h-11 rounded-lg border border-[#6f5629] bg-white px-4 py-2 text-base font-medium text-[#5c4726] hover:bg-[#f3e6c9] transition-colors disabled:opacity-50";
const primaryBtnCls =
  "inline-flex items-center justify-center min-h-11 rounded-lg bg-[#6f5629] px-4 py-2 text-base font-medium text-white hover:bg-[#5c4726] transition-colors disabled:opacity-50";
const chipBase =
  "shrink-0 inline-flex items-center gap-1.5 max-w-60 min-h-10 px-3.5 rounded-full border text-[15px] whitespace-nowrap transition-colors";

export default function MenuManager({ catalog, onChange, onBack }: Props) {
  const [selectedId, setSelectedId] = useState(catalog[0]?.id ?? "");
  const [newCategoryTitle, setNewCategoryTitle] = useState("");
  const [newCategoryCols, setNewCategoryCols] = useState<1 | 2>(1);
  const [newDishName, setNewDishName] = useState("");
  const [newDishOptional, setNewDishOptional] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [editingCatTitle, setEditingCatTitle] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; name: string; categoryId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const activeCategory = catalog.find((c) => c.id === selectedId) ?? catalog[0];
  const activeIndex = activeCategory ? catalog.findIndex((c) => c.id === activeCategory.id) : -1;

  const flash = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 2500);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setBusy(false);
    }
  };

  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const title = newCategoryTitle.trim();
    if (!title) return;
    void run(async () => {
      const res = await createMenuCategoryApi({
        title,
        columns: newCategoryCols,
        kind: newCategoryCols === 2 ? "utensil" : "dish",
      });
      onChange(res.menuCatalog);
      setSelectedId(res.category.id);
      setNewCategoryTitle("");
      setNewCategoryCols(1);
      flash(`Added category "${res.category.title}"`);
    });
  };

  const handleSaveCategoryTitle = () => {
    if (!activeCategory || editingCatTitle === null) return;
    const trimmed = editingCatTitle.trim();
    if (!trimmed || trimmed === activeCategory.title) {
      setEditingCatTitle(null);
      return;
    }
    void run(async () => {
      const updated = await updateMenuCategoryApi(activeCategory.id, { title: trimmed });
      onChange(updated);
      setEditingCatTitle(null);
      flash("Category renamed");
    });
  };

  const handleToggleColumns = () => {
    if (!activeCategory) return;
    const nextCols: 1 | 2 = activeCategory.columns === 2 ? 1 : 2;
    void run(async () => {
      const updated = await updateMenuCategoryApi(activeCategory.id, { columns: nextCols });
      onChange(updated);
      flash(`PDF layout set to ${nextCols} column${nextCols === 2 ? "s" : ""}`);
    });
  };

  const handleMoveCategory = (delta: -1 | 1) => {
    if (activeIndex < 0) return;
    const target = activeIndex + delta;
    if (target < 0 || target >= catalog.length) return;
    const ids = catalog.map((c) => c.id);
    const [moved] = ids.splice(activeIndex, 1);
    ids.splice(target, 0, moved);
    void run(async () => {
      const updated = await reorderMenuCategoriesApi(ids);
      onChange(updated);
    });
  };

  const handleDeleteCategory = () => {
    if (!activeCategory) return;
    if (!confirm(`Delete "${activeCategory.title}" and all ${activeCategory.items.length} items inside it? Existing saved estimates will not be affected.`)) {
      return;
    }
    void run(async () => {
      const updated = await deleteMenuCategoryApi(activeCategory.id);
      onChange(updated);
      setSelectedId(updated[0]?.id ?? "");
      setEditingCatTitle(null);
      flash("Category deleted");
    });
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!activeCategory) return;
    const name = newDishName.trim();
    if (!name) return;
    void run(async () => {
      const res = await createMenuItemApi({
        categoryId: activeCategory.id,
        name,
        isOptional: newDishOptional,
      });
      onChange(res.menuCatalog);
      setNewDishName("");
      flash(`Added "${res.item.name}"`);
    });
  };

  const handleSaveItem = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const name = editingItem.name.trim();
    if (!name) return;
    void run(async () => {
      const updated = await updateMenuItemApi(editingItem.id, {
        name,
        categoryId: editingItem.categoryId,
      });
      onChange(updated);
      setEditingItem(null);
      flash("Dish updated");
    });
  };

  const handleToggleOptional = (item: MenuItemRecord) => {
    void run(async () => {
      const updated = await updateMenuItemApi(item.id, { isOptional: !item.isOptional });
      onChange(updated);
    });
  };

  const handleDeleteItem = (item: MenuItemRecord) => {
    if (!confirm(`Remove "${item.name}" from the master menu?`)) return;
    void run(async () => {
      const updated = await deleteMenuItemApi(item.id);
      onChange(updated);
      flash("Item removed");
    });
  };

  const term = itemSearch.trim().toLowerCase();
  const visibleItems = (activeCategory?.items ?? []).filter(
    (it) => !term || it.name.toLowerCase().includes(term),
  );

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#26221c] font-inter">
      <header className="sticky top-0 z-30 bg-[#14120f] text-[#f8f3ea] shadow-sm">
        <div className="max-w-275 mx-auto px-2 md:px-8 py-2.5 flex items-center gap-2">
          <button
            onClick={onBack}
            className="min-h-11 px-2 inline-flex items-center gap-2 text-[#f8f3ea] hover:text-[#e0c48a] transition-colors shrink-0"
          >
            <span className="text-xl leading-none">&larr;</span>
            <span className="text-sm sm:text-base">Estimates</span>
          </button>
          <h1 className="flex-1 min-w-0 truncate font-playfair text-xl text-[#e0c48a]">
            Dishes &amp; Categories
          </h1>
          {status && <span className="text-sm text-[#cbbf9f] shrink-0">{status}</span>}
        </div>
      </header>

      <main className="max-w-275 mx-auto px-4 md:px-8 py-5 md:py-8 space-y-6">
        {error && (
          <div role="alert" className="rounded-lg border border-[#a32a1c] bg-[#fbeae7] px-4 py-3 text-base text-[#a32a1c]">
            {error}
          </div>
        )}

        <section className="rounded-lg border border-[#e4d9c3] bg-white p-4 space-y-3">
          <h2 className="font-playfair text-lg text-[#5c4726]">Add New Category</h2>
          <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2.5">
            <input
              className={inputCls}
              value={newCategoryTitle}
              placeholder="e.g. Live Counters, Arabian Grill"
              onChange={(e) => setNewCategoryTitle(e.target.value)}
            />
            <select
              aria-label="PDF columns"
              className={`${inputCls} sm:w-44 shrink-0`}
              value={newCategoryCols}
              onChange={(e) => setNewCategoryCols(Number(e.target.value) === 2 ? 2 : 1)}
            >
              <option value={1}>1 column PDF</option>
              <option value={2}>2 columns PDF</option>
            </select>
            <button type="submit" disabled={busy || !newCategoryTitle.trim()} className={`${primaryBtnCls} shrink-0`}>
              + Add Category
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div className="flex md:flex-wrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {catalog.map((cat) => {
              const active = cat.id === activeCategory?.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedId(cat.id);
                    setEditingCatTitle(null);
                    setEditingItem(null);
                    setItemSearch("");
                  }}
                  className={`${chipBase} ${
                    active
                      ? "bg-[#6f5629] border-[#6f5629] text-white font-medium"
                      : "bg-white border-[#d9ccb4] text-[#26221c] hover:bg-[#f3e6c9]"
                  }`}
                >
                  <span className="truncate">{cat.title}</span>
                  <span className="text-xs opacity-80">{cat.items.length}</span>
                </button>
              );
            })}
          </div>

          {activeCategory ? (
            <div className="rounded-lg border border-[#e4d9c3] bg-white p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e4d9c3] pb-3">
                {editingCatTitle !== null ? (
                  <div className="flex flex-1 gap-2">
                    <input
                      className={inputCls}
                      value={editingCatTitle}
                      autoFocus
                      onChange={(e) => setEditingCatTitle(e.target.value)}
                    />
                    <button type="button" onClick={handleSaveCategoryTitle} disabled={busy} className={primaryBtnCls}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingCatTitle(null)} className={btnCls}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-playfair text-2xl text-[#5c4726]">{activeCategory.title}</h2>
                    <p className="text-sm text-[#5f574b]">
                      {activeCategory.items.length} item{activeCategory.items.length === 1 ? "" : "s"} ·{" "}
                      {activeCategory.columns} column PDF layout
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {editingCatTitle === null && (
                    <button type="button" onClick={() => setEditingCatTitle(activeCategory.title)} className={btnCls}>
                      Rename
                    </button>
                  )}
                  <button type="button" onClick={handleToggleColumns} disabled={busy} className={btnCls}>
                    {activeCategory.columns === 2 ? "Switch to 1 col" : "Switch to 2 cols"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || activeIndex <= 0}
                    onClick={() => handleMoveCategory(-1)}
                    className={btnCls}
                    aria-label="Move category left"
                  >
                    &uarr;
                  </button>
                  <button
                    type="button"
                    disabled={busy || activeIndex >= catalog.length - 1}
                    onClick={() => handleMoveCategory(1)}
                    className={btnCls}
                    aria-label="Move category right"
                  >
                    &darr;
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleDeleteCategory}
                    className={`${btnCls} border-[#a32a1c]! text-[#a32a1c]! hover:bg-[#fbeae7]!`}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddItem} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    className={inputCls}
                    value={newDishName}
                    placeholder={`Add new item to ${activeCategory.title}`}
                    onChange={(e) => setNewDishName(e.target.value)}
                  />
                  <button type="submit" disabled={busy || !newDishName.trim()} className={`${primaryBtnCls} shrink-0`}>
                    + Add Dish / Item
                  </button>
                </div>
                {activeCategory.kind === "utensil" && (
                  <label className="inline-flex items-center gap-2 text-sm text-[#5f574b] cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-[#6f5629] w-4 h-4"
                      checked={newDishOptional}
                      onChange={(e) => setNewDishOptional(e.target.checked)}
                    />
                    Keep in &ldquo;List all&rdquo; optional section
                  </label>
                )}
              </form>

              <input
                type="search"
                className={inputCls}
                value={itemSearch}
                placeholder={`Filter items in ${activeCategory.title}`}
                onChange={(e) => setItemSearch(e.target.value)}
              />

              {visibleItems.length === 0 ? (
                <p className="text-center py-6 text-base text-[#5f574b]">
                  {activeCategory.items.length === 0 ? "No items in this category yet." : "No items match your filter."}
                </p>
              ) : (
                <ul className="divide-y divide-[#efe5d3]">
                  {visibleItems.map((item) => {
                    const isEditing = editingItem?.id === item.id;
                    return (
                      <li key={item.id} className="py-2.5">
                        {isEditing ? (
                          <form onSubmit={handleSaveItem} className="flex flex-col sm:flex-row gap-2">
                            <input
                              className={inputCls}
                              value={editingItem.name}
                              autoFocus
                              onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            />
                            <select
                              aria-label="Category"
                              className={`${inputCls} sm:w-52 shrink-0`}
                              value={editingItem.categoryId}
                              onChange={(e) => setEditingItem({ ...editingItem, categoryId: e.target.value })}
                            >
                              {catalog.map((c) => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                            </select>
                            <div className="flex gap-2 shrink-0">
                              <button type="submit" disabled={busy} className={primaryBtnCls}>Save</button>
                              <button type="button" onClick={() => setEditingItem(null)} className={btnCls}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-medium truncate">{item.name}</p>
                              {item.isOptional && (
                                <span className="inline-block text-xs text-[#6f5629] bg-[#f3e6c9] px-2 py-0.5 rounded-full">
                                  Optional list
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {activeCategory.kind === "utensil" && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleToggleOptional(item)}
                                  className="text-sm text-[#5c4726] underline underline-offset-4 px-1 min-h-10"
                                >
                                  {item.isOptional ? "Make main" : "Make optional"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setEditingItem({ id: item.id, name: item.name, categoryId: item.categoryId })}
                                className="text-sm text-[#5c4726] underline underline-offset-4 px-1 min-h-10"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeleteItem(item)}
                                className="text-sm text-[#a32a1c] underline underline-offset-4 px-1 min-h-10"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#a08f70] p-8 text-center text-[#5f574b]">
              No categories yet. Add one above to get started.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
