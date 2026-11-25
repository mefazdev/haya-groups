import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { deleteMenuCategory, getMenuCatalog, updateMenuCategory } from "@/lib/estimate/repo";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      title?: string;
      columns?: 1 | 2;
      kind?: "dish" | "utensil";
    };
    await updateMenuCategory(id, body);
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ menuCatalog });
  } catch (err) {
    return jsonError(err, 400);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    await deleteMenuCategory(id);
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ menuCatalog });
  } catch (err) {
    return jsonError(err, 400);
  }
}
