import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function DELETE(_req: NextRequest, { params }: { params: { filename: string } }) {
  const filePath = path.join(process.cwd(), "stock_videos", params.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}
