import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import crypto from "crypto";
import { loadConfig } from "./config";
import { DEFAULT_TEXT_STYLE, resolveStyle } from "./types";

const ROOT = process.cwd();
const STOCK_DIR = path.join(ROOT, "stock_videos");
const LONG_VIDEO_DIR = path.join(ROOT, "long_video");
const MUSIC_DIR = path.join(ROOT, "music");
const ENDSCREEN_DIR = path.join(ROOT, "endscreen");
const OUTPUT_DIR = path.join(ROOT, "output");
const SUPPORTED_VIDEO = new Set([".mp4", ".mov", ".avi", ".mkv"]);
const RENDER_SRC = path.join(ROOT, "render_text.swift");
const RENDER_BIN = path.join(ROOT, ".render_text_bin");

const W = 1080;
const H = 1920;
const ENDSCREEN_DUR = 3;

// Hardware encoder (VideoToolbox on macOS) — falls back to libx264 ultrafast
let _hwAvailable: boolean | null = null;
async function hwEncoder(): Promise<{ vcodec: string; quality: string }> {
  if (_hwAvailable === null) {
    try {
      await sh(`ffmpeg -y -f lavfi -i color=black:size=64x64:rate=1 -t 0.1 -c:v h264_videotoolbox /tmp/_hw_test.mp4`, 10_000);
      _hwAvailable = true;
    } catch { _hwAvailable = false; }
  }
  return _hwAvailable
    ? { vcodec: "h264_videotoolbox", quality: "-b:v 40000k" }
    : { vcodec: "libx264",           quality: "-preset slow -crf 16" };
}

function rendererAvailable(): boolean {
  return fs.existsSync(RENDER_BIN);
}

export async function compileRenderer(): Promise<void> {
  await sh(`swiftc -O "${RENDER_SRC}" -o "${RENDER_BIN}"`);
}


type Log = (msg: string) => void;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sh(cmd: string, timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("sh", ["-c", cmd], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stdout.resume();
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); if (stderr.length > 4000) stderr = stderr.slice(-4000); });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`TIMEOUT after ${timeoutMs / 1000}s\nLast stderr: ${stderr.slice(-500)}\nCmd: ${cmd.slice(0, 120)}`));
    }, timeoutMs);

    proc.on("close", code => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Exit ${code}\nStderr: ${stderr.slice(-500)}\nCmd: ${cmd.slice(0, 120)}`));
    });
    proc.on("error", e => { clearTimeout(timer); reject(e); });
  });
}

function probe(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn("sh", [
      "-c",
      `ffmpeg -i "${filePath}" 2>&1 | grep -oE "Duration: [0-9]+:[0-9]+:[0-9]+\\.[0-9]+" | head -1`
    ], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    proc.stdout.on("data", (d: Buffer) => out += d.toString());
    proc.stderr.resume();
    proc.on("close", () => {
      const match = out.trim().match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (!match) { reject(new Error("Could not read video duration")); return; }
      const secs = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
      resolve(secs);
    });
    proc.on("error", reject);
  });
}


// Analyze average brightness (0=black, 1=white) of the text area in the video
function analyzeTextAreaBrightness(videoPath: string, positionY: number, fontSize: number): Promise<number> {
  return new Promise(resolve => {
    const cropY = Math.max(0, Math.floor(H * (positionY / 100) - fontSize * 1.5));
    const cropH = Math.min(H - cropY, Math.ceil(fontSize * 3));
    const cropX = Math.floor(W * 0.08);
    const cropW = Math.floor(W * 0.84);
    const proc = spawn("ffmpeg", [
      "-ss", "0.5", "-i", videoPath,
      "-vframes", "1",
      "-vf", `crop=${cropW}:${cropH}:${cropX}:${cropY},scale=1:1,format=gray`,
      "-f", "rawvideo", "pipe:1"
    ], { stdio: ["ignore", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    proc.stdout.on("data", (d: Buffer) => chunks.push(d));
    proc.stderr.resume();
    proc.on("close", () => {
      const data = Buffer.concat(chunks);
      resolve(data.length > 0 ? data[0] / 255 : 0.5);
    });
    proc.on("error", () => resolve(0.5));
  });
}

function autoWrap(hook: string, fontSize = 56): string {
  // Estimate max chars per line based on font size (larger font → fewer chars fit)
  const maxChars = Math.max(12, Math.round(56 / fontSize * 28));
  if (hook.includes("\n") || hook.length <= maxChars) return hook;
  const mid = Math.floor(hook.length / 2);
  let left = -1, right = -1;
  for (let i = mid; i >= 0; i--) { if (hook[i] === " ") { left = i; break; } }
  for (let i = mid + 1; i < hook.length; i++) { if (hook[i] === " ") { right = i; break; } }
  if (left === -1 && right === -1) return hook;
  const at = left !== -1 && right !== -1
    ? (mid - left <= right - mid ? left : right)
    : left !== -1 ? left : right;
  return hook.slice(0, at) + "\n" + hook.slice(at + 1);
}

export async function generate(
  hookOverride?: string,
  musicFileOverride?: string,
  segmentIndexOverride?: number,
  log: Log = console.log
): Promise<{ outputPath: string; hook: string }> {
  const config = loadConfig();

  // Resolve active hook pool (new pools system or legacy hooks[])
  const poolHooks = (config.active_pool && config.hook_pools?.[config.active_pool]?.length)
    ? config.hook_pools[config.active_pool]
    : (config.hooks ?? []);
  if (!poolHooks.length && !hookOverride) throw new Error("No hooks configured — add hooks in the Hooks tab");
  const disabled = new Set(config.settings.hooks_disabled ?? []);
  const activeHooks = poolHooks.filter((h, i) => h.trim() && !disabled.has(i));
  const rawHook = hookOverride ?? pickRandom(activeHooks.length ? activeHooks : poolHooks);
  const globalStyle = { ...DEFAULT_TEXT_STYLE, ...(config.settings.text_style ?? {}) };
  const hookIndex = poolHooks.indexOf(rawHook);
  const textStyle = resolveStyle(globalStyle, config.settings.hook_styles?.[hookIndex]);
  const hook = autoWrap(rawHook, textStyle.font_size);

  const sourceMode = config.settings.source_mode ?? "stock";
  let videoPath: string;
  let videoStart: number;
  let clipDur: number;
  let useOriginalAudio = false;
  let musicFile = "";
  let segment = { start: 0, end: 30 };
  let comboKeySuffix: string;

  if (sourceMode === "longvideo") {
    const lv = config.long_video;
    if (!lv?.file || !lv.markers.length) throw new Error("Long video: kein Video oder keine Marker konfiguriert");
    videoPath = path.join(LONG_VIDEO_DIR, lv.file);
    if (!fs.existsSync(videoPath)) throw new Error(`Long video nicht gefunden: ${lv.file}`);
    const marker = pickRandom(lv.markers);
    clipDur = lv.clip_duration_min + Math.random() * (lv.clip_duration_max - lv.clip_duration_min);
    videoStart = marker;
    useOriginalAudio = lv.use_original_audio;
    comboKeySuffix = `lv:${lv.file}|${marker.toFixed(1)}`;
    log(`Hook: ${hook.replace("\n", " / ")}`);
    log(`Long Video: ${lv.file} [Marker ${marker.toFixed(1)}s, Clip ${clipDur.toFixed(1)}s]`);
    if (useOriginalAudio) {
      log("Audio: Original-Sound (kein Musik-Overlay)");
    } else {
      const musicEntries = Object.entries(config.music).filter(([, v]) => v.segments.length > 0 && v.enabled !== false);
      if (!musicEntries.length) throw new Error("No music segments configured — open the UI and add some first");
      const [f, entry] = pickRandom(musicEntries);
      musicFile = f;
      segment = pickRandom(entry.segments);
      log(`Music: ${musicFile} [${segment.start}s→${segment.end}s]`);
    }
  } else {
    const videos = fs.readdirSync(STOCK_DIR).filter(f => SUPPORTED_VIDEO.has(path.extname(f).toLowerCase()));
    if (!videos.length) throw new Error(`No stock videos in ${STOCK_DIR}`);
    videoPath = path.join(STOCK_DIR, pickRandom(videos));

    const musicEntries = Object.entries(config.music).filter(([, v]) => v.segments.length > 0 && v.enabled !== false);
    if (!musicEntries.length) throw new Error("No music segments configured — open the UI and add some first");
    if (musicFileOverride !== undefined && segmentIndexOverride !== undefined) {
      musicFile = musicFileOverride;
      segment = config.music[musicFile].segments[segmentIndexOverride];
    } else {
      const [f, entry] = pickRandom(musicEntries);
      musicFile = f;
      segment = pickRandom(entry.segments);
    }
    if (segment.end <= segment.start) {
      segment = { start: segment.start, end: segment.start + 30 };
      log(`⚠ Segment end <= start, using +30s fallback`);
    }
    const { video_duration_min: minDur, video_duration_max: maxDur, sin_start_times, sin_start_mode, sin_start_random_min, sin_start_random_max } = config.settings;
    if (sin_start_mode === "random" && sin_start_random_min != null && sin_start_random_max != null) {
      clipDur = sin_start_random_min + Math.random() * (sin_start_random_max - sin_start_random_min);
    } else {
      clipDur = sin_start_times?.length
        ? pickRandom(sin_start_times)
        : minDur + Math.random() * (maxDur - minDur);
    }
    const videoDur = await probe(videoPath);
    videoStart = Math.random() * Math.max(0, videoDur - clipDur);
    comboKeySuffix = `${musicFile}|${segment.start}`;
    log(`Hook: ${hook.replace("\n", " / ")}`);
    log(`Video: ${path.basename(videoPath)} [${videoStart.toFixed(1)}s]`);
    log(`Music: ${musicFile} [${segment.start}s→${segment.end}s]`);
  }

  const musicPath = path.join(MUSIC_DIR, musicFile);
  const { music_volume: vol } = config.settings;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shorts-"));
  const mainClip  = path.join(tmp, "main.mp4");
  const mainText  = path.join(tmp, "main_text.mp4");
  const endClip   = path.join(tmp, "end.mp4");
  const combined  = path.join(tmp, "combined.mp4");
  const musicTrim = path.join(tmp, "music.aac");
  const concatList = path.join(tmp, "concat.txt");

  try {
    const hw = await hwEncoder();
    log(`Step 1/5: Trimming + scaling video… [${hw.vcodec}]`);
    await sh(`ffmpeg -y -ss ${videoStart.toFixed(3)} -t ${clipDur.toFixed(3)} -i "${videoPath}" \
      -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1" \
      -c:v ${hw.vcodec} ${hw.quality} -c:a aac -b:a 192k -pix_fmt yuv420p -r 30 "${mainClip}"`);

    log("Step 2/5: Adding hook text…");
    const textPng = path.join(tmp, "hook_text.png");
    if (rendererAvailable()) {
      log("  2a: Running Swift renderer…");
      let effectiveStyle = { ...textStyle };
      if (textStyle.bg_auto) {
        const brightness = await analyzeTextAreaBrightness(mainClip, textStyle.position_y, textStyle.font_size);
        const useBg = brightness > 0.55;
        log(`  2a: Brightness=${(brightness * 100).toFixed(0)}% → ${useBg ? "white box" : "outline only"}`);
        effectiveStyle = {
          ...textStyle,
          bg_enabled: useBg,
          color: useBg ? "#000000" : "#ffffff",
          outline_width: useBg ? 0 : textStyle.outline_width,
        };
      }
      const fontPath = path.join(ROOT, "public", "fonts", "Anton-Regular.ttf");
      const cfgFile = path.join(tmp, "text_cfg.json");
      // Copy font next to config so Swift can find it
      const fontDst = path.join(tmp, "Anton-Regular.ttf");
      if (fs.existsSync(fontPath)) fs.copyFileSync(fontPath, fontDst);
      fs.writeFileSync(cfgFile, JSON.stringify({
        text: hook, fontSize: effectiveStyle.font_size, output: textPng, width: W, height: H,
        style: effectiveStyle,
      }));
      await sh(`"${RENDER_BIN}" "${cfgFile}"`, 30_000);
      if (!fs.existsSync(textPng)) throw new Error("Swift renderer produced no PNG output");
      const pngSize = fs.statSync(textPng).size;
      log(`  2a: PNG created (${(pngSize/1024).toFixed(0)} KB)`);

      log("  2b: Overlaying text onto video (ffmpeg)…");
      const actualDur = await probe(mainClip);
      await sh(`ffmpeg -y -i "${mainClip}" -loop 1 -i "${textPng}" \
        -filter_complex "[0:v][1:v]overlay=0:0:shortest=1" \
        -c:v ${hw.vcodec} ${hw.quality} -c:a copy -pix_fmt yuv420p \
        -t ${actualDur.toFixed(3)} "${mainText}"`, 60_000);
      log("  2b: Overlay done");
    } else {
      // Fallback: ffmpeg drawtext — strip emojis to avoid hang
      const stripEmoji = (s: string) => s.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27FF}]|[\u{2300}-\u{23FF}]/gu, "").trim();
      const esc = (s: string) => s.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/[\[\]]/g, "\\$&");
      const hookLines = hook.split("\n").filter(Boolean).map(stripEmoji).filter(Boolean);
      const drawBase = `fontsize=56:fontcolor=white:borderw=5:bordercolor=black:x=(w-text_w)/2`;
      const vfText = hookLines.length >= 2
        ? `drawtext=${drawBase}:text='${esc(hookLines[0])}':y=h/6-text_h-6,drawtext=${drawBase}:text='${esc(hookLines[1])}':y=h/6+6`
        : `drawtext=${drawBase}:text='${esc(hookLines[0] ?? hook)}':y=(h/3-text_h)/2`;
      await sh(`ffmpeg -y -i "${mainClip}" -vf "${vfText}" \
        -c:v libx264 -preset fast -crf 23 -c:a copy -pix_fmt yuv420p "${mainText}"`);
    }

    const hasCta = !!config.settings.active_cta;
    const ctaFilename = config.settings.active_cta ?? "";
    const sinPath = ctaFilename ? path.join(ENDSCREEN_DIR, ctaFilename) : "";
    let sinActualDur = 0;

    if (hasCta && sinPath) {
      log("Step 3/5: Building CTA screen…");
      if (fs.existsSync(sinPath)) {
        await sh(`ffmpeg -y -i "${sinPath}" \
          -vf "scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1" \
          -c:v ${hw.vcodec} ${hw.quality} -pix_fmt yuv420p -r 30 -an "${endClip}"`);
        sinActualDur = await probe(sinPath);
      } else {
        log("  CTA file not found, skipping");
      }
    } else {
      log("Step 3/5: No CTA — skipping…");
    }

    log("Step 4/5: Concatenating clips…");
    if (hasCta && fs.existsSync(endClip)) {
      fs.writeFileSync(concatList, `file '${mainText}'\nfile '${endClip}'\n`);
      await sh(`ffmpeg -y -f concat -safe 0 -i "${concatList}" \
        -c:v ${hw.vcodec} ${hw.quality} -pix_fmt yuv420p -r 30 -an "${combined}"`);
    } else {
      // No CTA — just copy mainText as combined
      fs.copyFileSync(mainText, combined);
    }

    // Deterministic name: same combo → same file → overwrites duplicate
    const comboKey = `${rawHook}|${comboKeySuffix}`;
    const outputId = crypto.createHash("sha256").update(comboKey).digest("hex").slice(0, 10);
    const outputPath = path.join(OUTPUT_DIR, `short_${outputId}.mp4`);

    if (useOriginalAudio) {
      log("Step 5/5: Original-Audio beibehalten…");
      // Pad original audio with silence to cover CTA section
      await sh(`ffmpeg -y -i "${combined}" -i "${mainText}" \
        -filter_complex "[1:a]apad[aout]" \
        -map 0:v -map "[aout]" \
        -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${outputPath}"`);
    } else {
      log("Step 5/5: Mixing music…");
      const totalDur = clipDur + Math.max(0, sinActualDur);
      await sh(`ffmpeg -y -stream_loop -1 -ss ${segment.start} -i "${musicPath}" \
        -t ${totalDur.toFixed(3)} -af "volume=${vol}" -c:a aac -b:a 192k "${musicTrim}"`);
      await sh(`ffmpeg -y -i "${combined}" -i "${musicTrim}" \
        -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "${outputPath}"`);
    }

    log(`✓ Done: ${path.basename(outputPath)}`);
    return { outputPath, hook };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function countCombinations(): { hooks: number; segments: number; total: number } {
  const config = loadConfig();
  const poolHooks = config.active_pool && config.hook_pools?.[config.active_pool]
    ? config.hook_pools[config.active_pool]
    : config.hooks;
  const disabled = new Set(config.settings.hooks_disabled ?? []);
  const hooks = poolHooks.filter((h, i) => h.trim() && !disabled.has(i)).length;
  const segments = Object.values(config.music).filter(e => e.enabled !== false).reduce((sum, e) => sum + e.segments.length, 0);
  return { hooks, segments, total: hooks * segments };
}
