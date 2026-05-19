import { NextRequest, NextResponse } from "next/server";
import { loadConfig, saveConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(loadConfig());
}

export async function POST(req: NextRequest) {
  saveConfig(await req.json());
  return NextResponse.json({ ok: true });
}
