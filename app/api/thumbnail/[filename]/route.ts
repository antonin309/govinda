import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

const CACHE_DIR = path.join(process.cwd(), ".thumbnails");
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { filename: string } }) {
  const videoPath = path.join(process.cwd(), "output", params.filename);
  if (!fs.existsSync(videoPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const thumbPath = path.join(CACHE_DIR, params.filename.replace(/\.mp4$/i, ".jpg"));

  if (!fs.existsSync(thumbPath)) {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("sh", ["-c",
        `ffmpeg -y -ss 1 -i "${videoPath}" -vframes 1 -vf "scale=270:480" -q:v 3 "${thumbPath}"`
      ], { stdio: "pipe" });
      proc.on("close", code => code === 0 ? resolve() : reject());
      proc.on("error", reject);
    });
  }

  if (!fs.existsSync(thumbPath)) return NextResponse.json({ error: "Thumbnail failed" }, { status: 500 });

  const stream = fs.createReadStream(thumbPath);
  return new Response(stream as unknown as ReadableStream, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
  });
}
