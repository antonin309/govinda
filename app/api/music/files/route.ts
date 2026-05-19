import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUPPORTED = new Set([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"]);

export async function GET() {
  const dir = path.join(process.cwd(), "music");
  const files = fs.readdirSync(dir).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  return NextResponse.json(files);
}
