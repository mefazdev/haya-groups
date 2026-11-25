import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { getMenuCatalog } from "@/lib/estimate/repo";

export async function GET() {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const menuCatalog = await getMenuCatalog();
    return NextResponse.json({ menuCatalog });
  } catch (err) {
    return jsonError(err, 500);
  }
}
