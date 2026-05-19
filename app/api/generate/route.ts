import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { generate } from "@/lib/generate";
import { loadConfig } from "@/lib/config";

const LOCK_FILE = path.join(process.cwd(), ".generation_running");

function isRunning(): boolean { return fs.existsSync(LOCK_FILE); }
function setRunning(val: boolean) {
  if (val) fs.writeFileSync(LOCK_FILE, "1");
  else { try { fs.unlinkSync(LOCK_FILE); } catch {} }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(req: NextRequest) {
  if (isRunning()) {
    return new Response(JSON.stringify({ error: "Already running" }), { status: 409 });
  }

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "one";
  const hook = searchParams.get("hook") ?? undefined;
  const musicFile = searchParams.get("musicFile") ?? undefined;
  const segIndex = searchParams.get("segIndex") !== null ? parseInt(searchParams.get("segIndex")!) : undefined;
  const countParam = searchParams.get("count");
  const maxCount = countParam ? parseInt(countParam) : null;

  const encoder = new TextEncoder();
  let aborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      setRunning(true);
      const send = (msg: string) => {
        if (!aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`));
      };

      try {
        if (mode === "all") {
          const config = loadConfig();
          const disabled = new Set(config.settings.hooks_disabled ?? []);
          let combos: { hook: string; musicFile: string; segIndex: number }[] = [];
          for (const h of config.hooks.filter((h: string, i: number) => h.trim() && !disabled.has(i))) {
            for (const [f, entry] of Object.entries(config.music)) {
              entry.segments.forEach((_, i) => combos.push({ hook: h, musicFile: f, segIndex: i }));
            }
          }
          if (maxCount && maxCount < combos.length) {
            combos = shuffle(combos).slice(0, maxCount);
          }
          const CONCURRENCY = 2;
          send(`Generating ${combos.length} video${combos.length !== 1 ? "s" : ""} (${CONCURRENCY}x parallel)…`);
          let completed = 0;
          const queue = [...combos];
          const worker = async () => {
            while (queue.length > 0 && !aborted) {
              const c = queue.shift()!;
              const n = ++completed;
              const prefix = (msg: string) => send(`[${n}/${combos.length}] ${msg}`);
              prefix(`Starting…`);
              await generate(c.hook, c.musicFile, c.segIndex, prefix);
            }
          };
          await Promise.all(Array.from({ length: CONCURRENCY }, worker));
        } else {
          await generate(hook, musicFile, segIndex, send);
        }
      } catch (e) {
        send(`ERROR: ${(e as Error).message}`);
      } finally {
        setRunning(false);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
      }
    },
    cancel() { aborted = true; setRunning(false); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: { "X-Running": String(isRunning()) },
  });
}

export async function DELETE() {
  setRunning(false);
  return new Response(null, { status: 204 });
}
