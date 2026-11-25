import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { ensureShareToken, revokeShareToken } from "@/lib/estimate/repo";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const shareToken = await ensureShareToken(id);
    if (!shareToken) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    return NextResponse.json({ shareToken });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    await revokeShareToken(id);
    return NextResponse.json({ shareToken: null });
  } catch (err) {
    return jsonError(err, 500);
  }
}
