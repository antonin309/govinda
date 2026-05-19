import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DIRS: Record<string, string> = {
  music: "music",
  stock: "stock_videos",
  endscreen: "endscreen",
  cta: "endscreen",
  ad: "endscreen",
  saveitnow: "endscreen",
  longvideo: "long_video",
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const type = formData.get("type") as string;
  const dir = DIRS[type];
  if (!dir) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  const files = formData.getAll("files") as File[];
  const saved: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = type === "ad" ? "ad.mp4" : type === "saveitnow" ? "save_it_now.mp4" : file.name;
    const dest = path.join(process.cwd(), dir, filename);
    fs.writeFileSync(dest, buffer);
    saved.push(filename);
  }

  return NextResponse.json({ ok: true, saved });
}
