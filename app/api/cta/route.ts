import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUPPORTED = new Set([".mp4", ".mov"]);
const EXCLUDED = new Set(["ad.mp4"]);

export const dynamic = "force-dynamic";

export async function GET() {
  const dir = path.join(process.cwd(), "endscreen");
  if (!fs.existsSync(dir)) return NextResponse.json([]);
  const files = fs.readdirSync(dir)
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()) && !EXCLUDED.has(f));
  return NextResponse.json(files);
}
