"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Config, Segment } from "@/lib/types";
import DropZone from "./DropZone";
import Waveform from "./Waveform";

function fmt(s: number) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function SongCard({
  filename,
  segments,
  enabled,
  onChange,
  onToggle,
  onDelete,
}: {
  filename: string;
  segments: Segment[];
  enabled: boolean;
  onChange: (segs: Segment[]) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const stopAt = useRef<number | null>(null);

  useEffect(() => {
    const a = new Audio(`/api/music/${encodeURIComponent(filename)}`);
    a.preload = "auto";
    a.addEventListener("loadedmetadata", () => setDuration(a.duration));
    a.addEventListener("timeupdate", () => {
      setCurrentTime(a.currentTime);
      if (stopAt.current !== null && a.currentTime >= stopAt.current) {
        a.pause();
        stopAt.current = null;
        setPlaying(false);
      }
    });
    a.addEventListener("ended", () => setPlaying(false));
    audioRef.current = a;
    return () => { a.pause(); a.src = ""; };
  }, [filename]);

  const togglePlay = () => {
    const a = audioRef.current!;
    if (a.paused) { a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  };

  const onSeek = (v: number) => {
    const a = audioRef.current!;
    if (a.duration) a.currentTime = (v / 100) * a.duration;
  };

  const playSegment = (seg: Segment) => {
    const a = audioRef.current!;
    a.currentTime = seg.start;
    stopAt.current = seg.end > seg.start ? seg.end : null;
    a.play();
    setPlaying(true);
  };

  const addSegment = () => {
    const a = audioRef.current!;
    const start = parseFloat((a.currentTime || 0).toFixed(1));
    const end = parseFloat(Math.min(start + 7, a.duration || start + 7).toFixed(1));
    onChange([...segments, { start, end }]);
  };

  const update = (i: number, field: keyof Segment, val: string) => {
    const next = segments.map((s, idx) => idx === i ? { ...s, [field]: parseFloat(val) } : s);
    onChange(next);
  };

  const remove = (i: number) => onChange(segments.filter((_, idx) => idx !== i));

  return (
    <div className={`border rounded-xl overflow-hidden mb-4 transition-colors ${enabled ? "bg-[#111] border-[#222]" : "bg-[#0d0d0d] border-[#1a1a1a]"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#222]">
        <span className="text-base">🎵</span>
        <span className={`font-semibold text-sm flex-1 truncate ${enabled ? "text-white" : "text-[#444]"}`}>{filename}</span>
        <span className="text-xs text-[#555] bg-[#1a1a1a] rounded-full px-2 py-0.5">
          {segments.length} Segment{segments.length !== 1 ? "e" : ""}
        </span>
        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${enabled ? "bg-[#7c3aed]" : "bg-[#333]"}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-4" : "left-0.5"}`} />
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-md border border-[#222] text-[#555] hover:border-red-500 hover:text-red-400 text-xs flex items-center justify-center transition-colors ml-1"
        >✕</button>
      </div>

      {/* Player */}
      <div className="px-4 pt-3 pb-2 border-b border-[#222]">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-[#7c3aed] hover:bg-[#6d28d9] flex items-center justify-center text-xs flex-shrink-0 transition-colors"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <span className="text-xs text-[#555] font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
        </div>
        <Waveform
          filename={filename}
          currentTime={currentTime}
          duration={duration}
          segments={segments}
          onSeek={t => { const a = audioRef.current!; a.currentTime = t; setCurrentTime(t); }}
          onSegmentChange={(i, field, t) => {
            const next = segments.map((s, idx) => idx === i ? { ...s, [field]: t } : s);
            onChange(next);
          }}
        />
      </div>

      {/* Segments */}
      <div className="px-4 py-3">
        <div className="text-xs text-[#555] uppercase tracking-wider mb-2">Segments</div>
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-3 py-2 mb-2">
            <span className="text-xs text-[#555] w-5 text-right">#{i + 1}</span>
            <label className="text-xs text-[#555]">Start</label>
            <input
              type="number" min={0} step={0.1} value={seg.start}
              onChange={e => update(i, "start", e.target.value)}
              className="w-16 bg-[#0a0a0a] border border-[#222] rounded px-2 py-1 text-sm text-center outline-none focus:border-[#7c3aed]"
            />
            <span className="text-xs text-[#555]">s</span>
            <label className="text-xs text-[#555] ml-1">End</label>
            <input
              type="number" min={0} step={0.1} value={seg.end}
              onChange={e => update(i, "end", e.target.value)}
              className="w-16 bg-[#0a0a0a] border border-[#222] rounded px-2 py-1 text-sm text-center outline-none focus:border-[#7c3aed]"
            />
            <span className="text-xs text-[#555]">s</span>
            <div className="ml-auto flex gap-1.5">
              <button
                onClick={() => playSegment(seg)}
                className="w-7 h-7 rounded-md border border-[#222] bg-[#111] hover:border-[#7c3aed] hover:text-[#a78bfa] text-xs flex items-center justify-center transition-colors"
              >▶</button>
              <button
                onClick={() => remove(i)}
                className="w-7 h-7 rounded-md border border-[#222] bg-[#111] hover:border-red-500 hover:text-red-400 text-xs flex items-center justify-center transition-colors"
              >✕</button>
            </div>
          </div>
        ))}
        <button
          onClick={addSegment}
          className="w-full mt-1 py-2 border border-dashed border-[#333] rounded-lg text-sm text-[#555] hover:border-[#7c3aed] hover:text-[#a78bfa] transition-colors"
        >
          + Add segment at {fmt(currentTime)} hinzufügen
        </button>
      </div>
    </div>
  );
}

export default function MusicTab() {
  const [config, setConfig] = useState<Config | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  const loadAll = () =>
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/music/files").then(r => r.json()),
    ]).then(([cfg, f]) => {
      const c = cfg as Config;
      f.forEach((name: string) => { if (!c.music[name]) c.music[name] = { segments: [] }; });
      isFirstLoad.current = true;
      setConfig(c);
      setFiles(f);
      setTimeout(() => { isFirstLoad.current = false; }, 50);
    });

  useEffect(() => { loadAll(); }, []);

  const updateSegments = useCallback((filename: string, segs: Segment[]) => {
    setConfig(prev => prev ? { ...prev, music: { ...prev.music, [filename]: { ...prev.music[filename], segments: segs } } } : prev);
  }, []);

  const toggleEnabled = useCallback((filename: string) => {
    setConfig(prev => {
      if (!prev) return prev;
      const entry = prev.music[filename];
      return { ...prev, music: { ...prev.music, [filename]: { ...entry, enabled: entry.enabled === false ? true : false } } };
    });
  }, []);

  const save = async (cfg = config) => {
    if (!cfg) return;
    await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  // Auto-save 800ms after any segment change
  useEffect(() => {
    if (isFirstLoad.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(config), 800);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [config]);

  if (!config) return <div className="p-8 text-[#555]">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Musik-Segments</h2>
        <button
          onClick={save}
          className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-sm font-semibold transition-colors"
        >
          {saved ? "Saved ✓" : "💾 Save"}
        </button>
      </div>

      <DropZone
        type="music"
        accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,audio/aac,audio/ogg,.mp3,.wav,.flac,.m4a,.aac,.ogg"
        label="Drop music here (.mp3 .wav .flac .m4a)"
        onUploaded={loadAll}
      />

      {files.length > 0 && <div className="mt-6 space-y-0">
        {files.map(f => (
          <SongCard
            key={f}
            filename={f}
            segments={config.music[f]?.segments ?? []}
            enabled={config.music[f]?.enabled !== false}
            onChange={segs => updateSegments(f, segs)}
            onToggle={() => toggleEnabled(f)}
            onDelete={async () => {
              await fetch(`/api/music/${encodeURIComponent(f)}`, { method: "DELETE" });
              const latest: Config = await fetch("/api/config").then(r => r.json());
              const { [f]: _, ...rest } = latest.music;
              await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...latest, music: rest }) });
              loadAll();
            }}
          />
        ))}
      </div>}
    </div>
  );
}
