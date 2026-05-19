import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "endscreen", "save_it_now.mp4");

export async function GET() {
  return NextResponse.json({ exists: fs.existsSync(FILE_PATH) });
}

export async function DELETE() {
  if (fs.existsSync(FILE_PATH)) fs.unlinkSync(FILE_PATH);
  return NextResponse.json({ ok: true });
}
