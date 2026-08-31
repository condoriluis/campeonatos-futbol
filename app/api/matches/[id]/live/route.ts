import { NextResponse } from "next/server";
import { getMatchLive } from "@/lib/services/match-live";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getMatchLive(id);
  if (!data) return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  return NextResponse.json({ source: "api", data }, { headers: { "Cache-Control": "no-store" } });
}