import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { createMenuCategory, getMenuCatalog, reorderMenuCategories } from "@/lib/estimate/repo";

export async function POST(request: Request) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      title?: string;
      kind?: "dish" | "utensil";
      columns?: 1 | 2;
    };
    const category = await createMenuCategory({
      title: body.title ?? "",
      kind: body.kind,
      columns: body.columns,
    });
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ category, menuCatalog }, { status: 201 });
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function PATCH(request: Request) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as { orderedIds?: string[] };
    if (!Array.isArray(body.orderedIds)) {
      return NextResponse.json({ error: "orderedIds array is required" }, { status: 400 });
    }
    await reorderMenuCategories(body.orderedIds);
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ menuCatalog });
  } catch (err) {
    return jsonError(err, 400);
  }
}
