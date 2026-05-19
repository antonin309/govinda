"use client";

import { useEffect, useRef, useState } from "react";
import DropZone from "./DropZone";
import { Config } from "@/lib/types";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function CTATab() {
  const [files, setFiles] = useState<string[]>([]);
  const [activeCta, setActiveCta] = useState<string | null>(null);
  const [sinStartAt, setSinStartAt] = useState(6);
  const [sinStartMode, setSinStartMode] = useState<"fixed" | "random">("fixed");
  const [sinRandomMin, setSinRandomMin] = useState(4);
  const [sinRandomMax, setSinRandomMax] = useState(8);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const loadFiles = () => fetch("/api/cta").then(r => r.json()).then(setFiles);

  useEffect(() => {
    loadFiles();
    fetch("/api/config").then(r => r.json()).then((c: Config) => {
      setActiveCta(c.settings.active_cta ?? null);
      setSinStartAt(c.settings.sin_start_times?.[0] ?? c.settings.video_duration_min ?? 6);
      setSinStartMode(c.settings.sin_start_mode ?? "fixed");
      setSinRandomMin(c.settings.sin_start_random_min ?? 4);
      setSinRandomMax(c.settings.sin_start_random_max ?? 8);
    });
  }, []);

  // Reload video when active changes
  useEffect(() => {
    setDuration(0);
    setCurrentTime(0);
    setPlaying(false);
    setTimeout(() => { if (videoRef.current) videoRef.current.load(); }, 100);
  }, [activeCta]);

  const save = async () => {
    const cfg: Config = await fetch("/api/config").then(r => r.json());
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cfg,
        settings: {
          ...cfg.settings,
          active_cta: activeCta,
          sin_start_times: [sinStartAt],
          sin_start_mode: sinStartMode,
          sin_start_random_min: sinRandomMin,
          sin_start_random_max: sinRandomMax,
        },
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const deleteFile = async (filename: string) => {
    await fetch(`/api/endscreen/${encodeURIComponent(filename)}`, { method: "DELETE" });
    if (activeCta === filename) {
      setActiveCta(null);
      const cfg: Config = await fetch("/api/config").then(r => r.json());
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, settings: { ...cfg.settings, active_cta: null } }),
      });
    }
    loadFiles();
  };

  const togglePlay = () => {
    const v = videoRef.current!;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-bold mb-1">CTA Video</h2>
      <p className="text-[#555] mb-6" style={{ fontSize: 13 }}>
        Appended to every generated video. Only one active at a time.
      </p>

      {/* Upload */}
      <DropZone
        type="cta"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        label="Drop CTA video here (.mp4 .mov)"
        onUploaded={loadFiles}
      />

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map(f => {
            const isActive = activeCta === f;
            return (
              <div
                key={f}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#7c3aed]/10 border-[#7c3aed]/40"
                    : "bg-[#111] border-[#222] hover:border-[#333]"
                }`}
                onClick={() => setActiveCta(isActive ? null : f)}
              >
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  isActive ? "border-[#7c3aed]" : "border-[#444]"
                }`}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />}
                </div>
                <span className="text-sm flex-1 truncate">{f}</span>
                {isActive && <span style={{ fontSize: 11 }} className="text-[#a78bfa] bg-[#7c3aed]/20 px-2 py-0.5 rounded-full">active</span>}
                <button
                  onClick={e => { e.stopPropagation(); deleteFile(f); }}
                  className="w-7 h-7 rounded-md border border-[#222] text-[#555] hover:border-red-500 hover:text-red-400 flex items-center justify-center transition-colors"
                  style={{ fontSize: 12 }}
                >✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview + settings for active CTA */}
      {activeCta && (
        <div className="mt-6 bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          {/* Video preview */}
          <div className="bg-black flex items-center justify-center" style={{ aspectRatio: "9/16", maxHeight: 260 }}>
            <video
              ref={videoRef}
              src={`/api/endscreen/${encodeURIComponent(activeCta)}`}
              className="h-full w-auto mx-auto"
              onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
              onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
              onEnded={() => setPlaying(false)}
            />
          </div>

          {/* Controls */}
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] flex items-center justify-center transition-colors"
                style={{ fontSize: 12 }}
              >
                {playing ? "⏸" : "▶"}
              </button>
              <span className="font-mono text-[#555]" style={{ fontSize: 12 }}>{fmt(currentTime)} / {fmt(duration)}</span>
            </div>

            {/* CTA start time */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label style={{ fontSize: 12 }} className="text-[#555]">CTA starts after</label>
                <div className="flex gap-1">
                  {(["fixed", "random"] as const).map(m => (
                    <button key={m} onClick={() => setSinStartMode(m)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${sinStartMode === m ? "bg-[#7c3aed] text-white" : "bg-[#1a1a1a] text-[#555] hover:text-[#aaa]"}`}>
                      {m === "fixed" ? "Fixed" : "Random"}
                    </button>
                  ))}
                </div>
              </div>

              {sinStartMode === "fixed" && (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {[3, 4, 5, 6, 7, 8, 10].map(s => (
                      <button key={s} onClick={() => setSinStartAt(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${sinStartAt === s ? "bg-[#7c3aed] text-white" : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] hover:text-[#aaa]"}`}>
                        {s}s
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="range" min={2} max={20} step={0.5} value={sinStartAt}
                      onChange={e => setSinStartAt(parseFloat(e.target.value))} className="flex-1 accent-[#7c3aed]" />
                    <span style={{ fontSize: 12 }} className="font-mono text-[#a78bfa] w-10 text-right">{sinStartAt.toFixed(1)}s</span>
                  </div>
                </div>
              )}

              {sinStartMode === "random" && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 space-y-3">
                  <div className="text-xs text-[#555]">
                    Random zwischen <span className="text-[#a78bfa] font-mono">{sinRandomMin}s</span> und <span className="text-[#a78bfa] font-mono">{sinRandomMax}s</span> — jedes Video anders
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <label style={{ fontSize: 11 }} className="text-[#555] w-8">Min</label>
                      <input type="range" min={2} max={18} step={0.5} value={sinRandomMin}
                        onChange={e => { const v = parseFloat(e.target.value); setSinRandomMin(v); if (v >= sinRandomMax) setSinRandomMax(v + 1); }}
                        className="flex-1 accent-[#7c3aed]" />
                      <span style={{ fontSize: 12 }} className="font-mono text-[#a78bfa] w-10 text-right">{sinRandomMin}s</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label style={{ fontSize: 11 }} className="text-[#555] w-8">Max</label>
                      <input type="range" min={3} max={20} step={0.5} value={sinRandomMax}
                        onChange={e => { const v = parseFloat(e.target.value); setSinRandomMax(v); if (v <= sinRandomMin) setSinRandomMin(v - 1); }}
                        className="flex-1 accent-[#7c3aed]" />
                      <span style={{ fontSize: 12 }} className="font-mono text-[#a78bfa] w-10 text-right">{sinRandomMax}s</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={save}
              className="w-full py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg font-semibold transition-colors"
              style={{ fontSize: 13 }}>
              {saved ? "Saved ✓" : "💾 Save"}
            </button>
          </div>
        </div>
      )}

      {!activeCta && files.length > 0 && (
        <p className="mt-4 text-[#555] text-center" style={{ fontSize: 12 }}>
          Select a video above to set it as active
        </p>
      )}
    </div>
  );
}
