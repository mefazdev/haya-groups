import { NextResponse } from "next/server";
import { jsonError, requireEstimateAuth } from "@/lib/estimate/apiAuth";
import {
  createEstimateInDb,
  duplicateEstimateInDb,
  getMenuCatalog,
  importEstimatesInDb,
  listEstimates,
} from "@/lib/estimate/repo";

export async function GET() {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const [estimates, menuCatalog] = await Promise.all([listEstimates(), getMenuCatalog()]);
    return NextResponse.json({ estimates, menuCatalog });
  } catch (err) {
    return jsonError(err, 500);
  }
}

export async function POST(request: Request) {
  const authError = await requireEstimateAuth();
  if (authError) return authError;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      sourceId?: string;
      estimates?: unknown[];
    };

    if (body.action === "duplicate" && body.sourceId) {
      const copy = await duplicateEstimateInDb(body.sourceId);
      if (!copy) return NextResponse.json({ error: "Source estimate not found" }, { status: 404 });
      return NextResponse.json({ estimate: copy }, { status: 201 });
    }

    if (body.action === "import" && Array.isArray(body.estimates)) {
      const imported = await importEstimatesInDb(body.estimates as Parameters<typeof importEstimatesInDb>[0]);
      const estimates = await listEstimates();
      return NextResponse.json({ imported, estimates });
    }

    const estimate = await createEstimateInDb();
    return NextResponse.json({ estimate }, { status: 201 });
  } catch (err) {
    return jsonError(err, 500);
  }
}
