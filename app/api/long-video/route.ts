import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DIR = path.join(process.cwd(), "long_video");
const SUPPORTED = new Set([".mp4", ".mov", ".avi", ".mkv"]);

export async function GET() {
  if (!fs.existsSync(DIR)) return NextResponse.json({ file: null });
  const files = fs.readdirSync(DIR).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  if (!files.length) return NextResponse.json({ file: null });
  const file = files[0];
  const stat = fs.statSync(path.join(DIR, file));
  return NextResponse.json({ file, size: stat.size });
}

export async function DELETE() {
  if (!fs.existsSync(DIR)) return NextResponse.json({ ok: true });
  const files = fs.readdirSync(DIR).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  for (const f of files) fs.unlinkSync(path.join(DIR, f));
  return NextResponse.json({ ok: true });
}
