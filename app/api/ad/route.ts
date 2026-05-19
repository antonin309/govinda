import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AD_PATH = path.join(process.cwd(), "endscreen", "ad.mp4");

export async function GET() {
  return NextResponse.json({ exists: fs.existsSync(AD_PATH) });
}

export async function DELETE() {
  if (fs.existsSync(AD_PATH)) fs.unlinkSync(AD_PATH);
  return NextResponse.json({ ok: true });
}
