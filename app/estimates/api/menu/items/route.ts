import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { createMenuItem, getMenuCatalog } from "@/lib/estimate/repo";

export async function POST(request: Request) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const body = (await request.json()) as {
      categoryId?: string;
      name?: string;
      isOptional?: boolean;
    };
    if (!body.categoryId) {
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }
    const item = await createMenuItem({
      categoryId: body.categoryId,
      name: body.name ?? "",
      isOptional: body.isOptional,
    });
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ item, menuCatalog }, { status: 201 });
  } catch (err) {
    return jsonError(err, 400);
  }
}
