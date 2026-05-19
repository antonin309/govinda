"use client";

import { useEffect, useRef, useState } from "react";
import DropZone from "./DropZone";
import { Config } from "@/lib/types";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export default function EndscreenTab() {
  const [exists, setExists] = useState(false);
  const [sinStartAt, setSinStartAt] = useState(6);
  const [maxDuration, setMaxDuration] = useState(0);
  const [sinTrimStart, setSinTrimStart] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const check = () =>
    fetch("/api/saveitnow").then(r => r.json()).then((d: { exists: boolean }) => setExists(d.exists));

  useEffect(() => {
    check();
    fetch("/api/config").then(r => r.json()).then((c: Config) => {
      setSinStartAt(c.settings.sin_start_times?.[0] ?? c.settings.video_duration_min ?? 6);
      setMaxDuration(c.settings.sin_max_duration ?? 0);
      setSinTrimStart(c.settings.sin_trim_start ?? 0);
    });
  }, []);

  const save = async () => {
    const cfg: Config = await fetch("/api/config").then(r => r.json());
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cfg,
        settings: {
          ...cfg.settings,
          sin_start_times: [sinStartAt],
          sin_max_duration: maxDuration,
          sin_trim_start: sinTrimStart,
        },
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = timelineRef.current!.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = parseFloat((pct * duration).toFixed(1));
    setSinTrimStart(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  };

  const togglePlay = () => {
    const v = videoRef.current!;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const previewFromStart = () => {
    const v = videoRef.current!;
    v.currentTime = 0;
    v.play();
    setPlaying(true);
  };

  return (
    <div className="p-6 max-w-xl">
      <h2 className="text-xl font-bold mb-1">End-Video</h2>
      <p className="text-sm text-[#555] mb-6">
        Wird automatisch an jedes generierte Video angehängt.
      </p>

      {/* Upload */}
      {exists && (
        <div className="flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-4">
          <span className="text-green-400">✓</span>
          <span className="text-sm text-[#ccc]">save_it_now.mp4 ist hinterlegt</span>
          <button
            onClick={async () => { await fetch("/api/saveitnow", { method: "DELETE" }); setExists(false); }}
            className="ml-auto text-xs text-[#555] hover:text-red-400 transition-colors"
          >
            Entfernen
          </button>
        </div>
      )}

      <DropZone
        type="saveitnow"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        label={exists ? "Neues Video hochladen (ersetzt aktuelles)" : "End-Video hierher ziehen (.mp4 .mov)"}
        onUploaded={() => { check(); setTimeout(() => { if (videoRef.current) videoRef.current.load(); }, 500); }}
      />

      {/* Preview + Trim */}
      {exists && (
        <div className="mt-6 bg-[#111] border border-[#222] rounded-xl overflow-hidden">
          {/* Video player */}
          <div className="bg-black aspect-[9/16] max-h-64 flex items-center justify-center relative">
            <video
              ref={videoRef}
              src="/api/endscreen/save_it_now.mp4"
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
                className="w-8 h-8 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] flex items-center justify-center text-xs transition-colors"
              >
                {playing ? "⏸" : "▶"}
              </button>
              <span className="text-xs text-[#555] font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
              <button
                onClick={previewFromStart}
                className="ml-auto text-xs px-3 py-1.5 rounded-lg border border-[#333] text-[#aaa] hover:border-yellow-400 hover:text-yellow-400 transition-colors"
              >
                ▶ Video abspielen
              </button>
            </div>

            {/* CTA trim start — clickable timeline */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#555]">CTA startet ab</label>
                <span className="text-xs font-mono text-[#a78bfa]">{sinTrimStart.toFixed(1)}s</span>
              </div>
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-6 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] cursor-pointer overflow-hidden"
                title="Klicken um Startpunkt zu setzen"
              >
                {/* Progress tint */}
                <div
                  className="absolute inset-y-0 left-0 bg-[#7c3aed]/20"
                  style={{ width: duration ? `${(sinTrimStart / duration) * 100}%` : "0%" }}
                />
                {/* Current playhead */}
                {duration > 0 && (
                  <div
                    className="absolute inset-y-0 w-px bg-[#444]"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                )}
                {/* Trim marker */}
                {duration > 0 && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#7c3aed]"
                    style={{ left: `${(sinTrimStart / duration) * 100}%` }}
                  >
                    <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#7c3aed]" />
                  </div>
                )}
                {/* Duration label */}
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#444] font-mono pointer-events-none">
                  {fmt(duration)}
                </span>
              </div>
              <p className="text-[10px] text-[#444] mt-1">Klicken um Startpunkt zu setzen · Video springt automatisch hin</p>
            </div>

            {/* When save_it_now appears */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#555]">Save it now startet nach</label>
                <span className="text-xs font-mono text-[#a78bfa]">{sinStartAt.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={2}
                max={20}
                step={0.5}
                value={sinStartAt}
                onChange={e => setSinStartAt(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#444] mt-1">
                <span>2s</span>
                <span>20s</span>
              </div>
            </div>

            {/* Max duration */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#555]">Maximale Dauer des End-Videos</label>
                <span className="text-xs font-mono text-[#a78bfa]">
                  {maxDuration > 0 ? `${maxDuration.toFixed(1)}s` : "unbegrenzt"}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 30)}
                step={0.5}
                value={maxDuration}
                onChange={e => setMaxDuration(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[#444] mt-1">
                <span>0 = unbegrenzt</span>
                <span>{Math.max(duration, 30).toFixed(0)}s</span>
              </div>
            </div>

            <button
              onClick={save}
              className="w-full py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-sm font-semibold transition-colors"
            >
              {saved ? "Gespeichert ✓" : "Speichern"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
