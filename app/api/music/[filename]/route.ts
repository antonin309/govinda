import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".flac": "audio/flac",
  ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg",
};

export async function DELETE(_req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = path.join(process.cwd(), "music", params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = path.join(process.cwd(), "music", params.filename);
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const stat = fs.statSync(filePath);
  const mime = MIME[path.extname(filePath).toLowerCase()] ?? "audio/mpeg";
  const range = req.headers.get("range");

  if (range) {
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const nodeStream = fs.createReadStream(filePath, { start, end });
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": mime,
      },
    });
  }

  const nodeStream = fs.createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  return new Response(webStream, {
    headers: { "Content-Type": mime, "Content-Length": String(stat.size), "Accept-Ranges": "bytes" },
  });
}
