import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import { deleteEstimateInDb, getEstimateById, saveEstimateInDb } from "@/lib/estimate/repo";
import type { Estimate } from "@/lib/estimate/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const estimate = await getEstimateById(id);
    if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ estimate });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = (await request.json()) as { estimate?: Estimate } | Estimate;
    const incoming = "estimate" in body && body.estimate ? body.estimate : (body as Estimate);
    if (!incoming || incoming.id !== id) {
      return NextResponse.json({ error: "Invalid estimate payload" }, { status: 400 });
    }
    const estimate = await saveEstimateInDb(incoming);
    return NextResponse.json({ estimate });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const { id } = await params;
    await deleteEstimateInDb(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return jsonError(err, 500);
  }
}
