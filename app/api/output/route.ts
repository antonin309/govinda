import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const dir = path.join(process.cwd(), "output");
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith(".mp4"))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, createdAt: stat.birthtimeMs };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(files);
}
