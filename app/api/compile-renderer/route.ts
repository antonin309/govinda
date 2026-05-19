import { NextResponse } from "next/server";
import { compileRenderer } from "@/lib/generate";
import fs from "fs";
import path from "path";

const RENDER_BIN = path.join(process.cwd(), ".render_text_bin");

export async function GET() {
  const exists = fs.existsSync(RENDER_BIN);
  return NextResponse.json({ compiled: exists });
}

export async function POST() {
  try {
    await compileRenderer();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
