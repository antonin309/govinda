import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const STOCK_DIR = path.join(process.cwd(), "stock_videos");
const W = 1080, H = 1920;
const SUPPORTED = new Set([".mp4", ".mov", ".avi", ".mkv"]);

function probe(filePath: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const proc = spawn("sh", ["-c",
      `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${filePath}"`
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => out += d.toString());
    proc.stderr.resume();
    proc.on("close", () => {
      const [w, h] = out.trim().split(",").map(Number);
      resolve({ w: w || 0, h: h || 0 });
    });
  });
}

function encode(src: string, dst: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("sh", ["-c",
      `ffmpeg -y -i "${src}" \
        -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1" \
        -c:v h264_videotoolbox -b:v 4000k -pix_fmt yuv420p -r 30 -an \
        -movflags +faststart "${dst}" 2>&1`
    ], { stdio: ["ignore", "pipe", "pipe"] });
    proc.stdout.resume();
    proc.stderr.resume();
    proc.on("close", code => code === 0 ? resolve(dst) : reject(new Error(`ffmpeg exit ${code}`)));
    proc.on("error", reject);
  });
}

export async function POST() {
  const files = fs.readdirSync(STOCK_DIR).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  const results: { name: string; status: string }[] = [];

  for (const file of files) {
    const filePath = path.join(STOCK_DIR, file);
    const { w, h } = await probe(filePath);

    // Skip if already 1080x1920
    if (w === W && h === H) {
      results.push({ name: file, status: "already optimized" });
      continue;
    }

    const ext = path.extname(file);
    const base = path.basename(file, ext);
    const tmpPath = path.join(STOCK_DIR, `${base}_opt_tmp.mp4`);

    try {
      await encode(filePath, tmpPath);
      fs.unlinkSync(filePath);
      const newName = `${base}.mp4`;
      fs.renameSync(tmpPath, path.join(STOCK_DIR, newName));
      results.push({ name: file, status: `optimized → ${newName} (was ${w}×${h})` });
    } catch (e) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      results.push({ name: file, status: `error: ${String(e)}` });
    }
  }

  return NextResponse.json({ results });
}

export async function GET() {
  const files = fs.readdirSync(STOCK_DIR).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  const infos = await Promise.all(files.map(async f => {
    const { w, h } = await probe(path.join(STOCK_DIR, f));
    return { name: f, w, h, needsOptimize: !(w === W && h === H) };
  }));
  return NextResponse.json(infos);
}
