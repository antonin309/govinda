"use client";

import { useEffect, useRef, useState } from "react";
import { Config, DEFAULT_LONG_VIDEO, LongVideoConfig } from "@/lib/types";
import StockTab from "@/components/StockTab";

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function LongVideoTab() {
  const [sourceMode, setSourceMode] = useState<"stock" | "longvideo">("stock");
  const [lv, setLv] = useState<LongVideoConfig>(DEFAULT_LONG_VIDEO);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then((c: Config) => {
      setSourceMode(c.settings.source_mode ?? "stock");
      setLv(c.long_video ?? DEFAULT_LONG_VIDEO);
    });
  }, []);

  const save = async () => {
    const cfg: Config = await fetch("/api/config").then(r => r.json());
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...cfg,
        long_video: lv,
        settings: { ...cfg.settings, source_mode: sourceMode },
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    setUploading(true);
    const fd = new FormData();
    fd.append("type", "longvideo");
    fd.append("files", file);
    await fetch("/api/upload", { method: "POST", body: fd });
    setLv(prev => ({ ...prev, file: file.name, markers: [] }));
    setUploading(false);
    setTimeout(() => { if (videoRef.current) videoRef.current.load(); }, 300);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = parseFloat((pct * duration).toFixed(2));
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const addMarker = () => {
    if (!currentTime) return;
    const t = parseFloat(currentTime.toFixed(2));
    if ((lv.markers ?? []).includes(t)) return;
    setLv(prev => ({ ...prev, markers: [...(prev.markers ?? []), t].sort((a, b) => a - b) }));
  };

  const removeMarker = (t: number) => {
    setLv(prev => ({ ...prev, markers: prev.markers.filter(m => m !== t) }));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const jumpToMarker = (t: number) => {
    if (videoRef.current) { videoRef.current.currentTime = t; setCurrentTime(t); }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Video Source</h2>
        <p className="text-[#555] text-sm">Wähle zwischen Stock-Videos oder einem langen Video mit Markern.</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["stock", "longvideo"] as const).map(m => (
          <button
            key={m}
            onClick={() => setSourceMode(m)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-colors ${
              sourceMode === m
                ? "bg-[#7c3aed] border-[#7c3aed] text-white"
                : "border-[#333] text-[#555] hover:text-[#aaa] hover:border-[#555]"
            }`}
          >
            {m === "stock" ? "Stock Videos" : "Long Video"}
          </button>
        ))}
      </div>

      {sourceMode === "stock" && (
        <div className="-mx-6">
          <StockTab />
        </div>
      )}

      {sourceMode === "longvideo" && (
        <div className="space-y-5">
          {/* Upload */}
          <div>
            <label className="block text-xs text-[#555] uppercase tracking-wider mb-2">Video</label>
            {lv.file ? (
              <div className="flex items-center gap-3 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-sm text-[#ccc] flex-1 truncate">{lv.file}</span>
                <button
                  onClick={() => { setLv(prev => ({ ...prev, file: null, markers: [] })); fetch("/api/long-video", { method: "DELETE" }); }}
                  className="text-xs text-[#555] hover:text-red-400 transition-colors"
                >Entfernen</button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333] hover:border-[#7c3aed] rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <div className="text-[#555] text-sm">{uploading ? "Wird hochgeladen…" : "Langes Video hierher ziehen oder klicken (.mp4 .mov)"}</div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov,.avi,.mkv"
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
            />
          </div>

          {/* Video player + timeline */}
          {lv.file && (
            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
              {/* Player */}
              <div className="bg-black" style={{ aspectRatio: "16/9", maxHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <video
                  ref={videoRef}
                  src={`/api/long-video/${lv.file}`}
                  className="h-full w-auto max-w-full"
                  onLoadedMetadata={e => setDuration((e.target as HTMLVideoElement).duration)}
                  onTimeUpdate={e => setCurrentTime((e.target as HTMLVideoElement).currentTime)}
                  onEnded={() => setPlaying(false)}
                />
              </div>

              <div className="p-4 space-y-4">
                {/* Playback controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] flex items-center justify-center text-xs transition-colors"
                  >
                    {playing ? "⏸" : "▶"}
                  </button>
                  <span className="text-xs text-[#555] font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
                  <button
                    onClick={addMarker}
                    className="ml-auto px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-xs font-semibold transition-colors"
                  >
                    + Marker hier setzen
                  </button>
                </div>

                {/* Clickable timeline */}
                <div>
                  <div
                    ref={timelineRef}
                    onClick={handleTimelineClick}
                    className="relative h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] cursor-pointer overflow-hidden"
                    title="Klicken zum Springen"
                  >
                    {/* Playhead */}
                    {duration > 0 && (
                      <div
                        className="absolute inset-y-0 w-0.5 bg-[#7c3aed]"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      />
                    )}
                    {/* Markers */}
                    {duration > 0 && lv.markers.map(m => (
                      <div
                        key={m}
                        className="absolute top-0 bottom-0 w-0.5 bg-green-400"
                        style={{ left: `${(m / duration) * 100}%` }}
                        title={`Marker ${fmt(m)}`}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-green-400" />
                      </div>
                    ))}
                    {/* Time labels */}
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#444] font-mono pointer-events-none">0:00</span>
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#444] font-mono pointer-events-none">{fmt(duration)}</span>
                  </div>
                  <p className="text-[10px] text-[#444] mt-1">Klicken zum Springen · Grüne Linien = gesetzte Marker</p>
                </div>

                {/* Marker list */}
                {lv.markers.length > 0 && (
                  <div>
                    <div className="text-xs text-[#555] uppercase tracking-wider mb-2">{lv.markers.length} Marker</div>
                    <div className="flex flex-wrap gap-2">
                      {lv.markers.map(m => (
                        <div
                          key={m}
                          className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1"
                        >
                          <button
                            onClick={() => jumpToMarker(m)}
                            className="text-green-400 font-mono hover:text-green-300 transition-colors"
                            style={{ fontSize: 12 }}
                          >
                            {fmt(m)}
                          </button>
                          <button
                            onClick={() => removeMarker(m)}
                            className="text-[#444] hover:text-red-400 transition-colors"
                            style={{ fontSize: 11 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-4">
            <div className="text-xs text-[#555] uppercase tracking-wider">Clip-Einstellungen</div>

            {/* Clip duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#555] block mb-1">Mindestdauer</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={5} max={60} step={1} value={lv.clip_duration_min}
                    onChange={e => setLv(prev => ({ ...prev, clip_duration_min: parseInt(e.target.value) }))}
                    className="flex-1 accent-[#7c3aed]"
                  />
                  <span className="text-xs text-[#a78bfa] w-8 text-right font-mono">{lv.clip_duration_min}s</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#555] block mb-1">Maximaldauer</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={5} max={60} step={1} value={lv.clip_duration_max}
                    onChange={e => setLv(prev => ({ ...prev, clip_duration_max: parseInt(e.target.value) }))}
                    className="flex-1 accent-[#7c3aed]"
                  />
                  <span className="text-xs text-[#a78bfa] w-8 text-right font-mono">{lv.clip_duration_max}s</span>
                </div>
              </div>
            </div>

            {/* Original audio toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-[#1a1a1a]">
              <div>
                <div className="text-sm font-medium">Original-Sound verwenden</div>
                <div className="text-xs text-[#555] mt-0.5">Kein Musik-Overlay — Original-Audio des Videos bleibt erhalten</div>
              </div>
              <button
                onClick={() => setLv(prev => ({ ...prev, use_original_audio: !prev.use_original_audio }))}
                className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                  lv.use_original_audio ? "bg-[#7c3aed]" : "bg-[#333]"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  lv.use_original_audio ? "left-5" : "left-1"
                }`} />
              </button>
            </div>
          </div>

          {/* Save */}
          <button
            onClick={save}
            className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold text-sm transition-colors"
          >
            {saved ? "Gespeichert ✓" : "Speichern"}
          </button>
        </div>
      )}

      {sourceMode === "stock" && (
        <button
          onClick={save}
          className="w-full py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-xl font-semibold text-sm transition-colors mt-2"
        >
          {saved ? "Gespeichert ✓" : "Speichern"}
        </button>
      )}
    </div>
  );
}
