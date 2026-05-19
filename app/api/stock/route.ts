import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const SUPPORTED = new Set([".mp4", ".mov", ".avi", ".mkv"]);

export async function GET() {
  const dir = path.join(process.cwd(), "stock_videos");
  const files = fs.readdirSync(dir)
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size };
    });
  return NextResponse.json(files);
}
