"use client";

import { useEffect, useState } from "react";
import DropZone from "./DropZone";

interface VideoFile { name: string; size: number; }
interface VideoInfo { name: string; w: number; h: number; needsOptimize: boolean; }

function fmtSize(b: number) {
  return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;
}

export default function StockTab() {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [infos, setInfos] = useState<Record<string, VideoInfo>>({});
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeLog, setOptimizeLog] = useState<string[]>([]);

  const load = async () => {
    const [vids, opts] = await Promise.all([
      fetch("/api/stock").then(r => r.json()),
      fetch("/api/stock/optimize").then(r => r.json()).catch(() => []),
    ]);
    setVideos(vids);
    const map: Record<string, VideoInfo> = {};
    (opts as VideoInfo[]).forEach(i => { map[i.name] = i; });
    setInfos(map);
  };

  useEffect(() => { load(); }, []);

  const optimize = async () => {
    setOptimizing(true);
    setOptimizeLog(["Starting optimization…"]);
    try {
      const res = await fetch("/api/stock/optimize", { method: "POST" });
      const data = await res.json();
      setOptimizeLog(data.results.map((r: { name: string; status: string }) => `${r.name}: ${r.status}`));
      await load();
    } catch (e) {
      setOptimizeLog([`Error: ${String(e)}`]);
    } finally {
      setOptimizing(false);
    }
  };

  const needsOptimize = Object.values(infos).some(i => i.needsOptimize);

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Stock Videos</h2>

      <DropZone
        type="stock"
        accept="video/mp4,video/quicktime,video/x-msvideo,.mkv"
        label="Drop videos here (.mp4 .mov .avi .mkv)"
        onUploaded={load}
      />

      {/* Optimize banner */}
      {needsOptimize && !optimizing && (
        <div className="mt-4 bg-yellow-900/20 border border-yellow-700/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-yellow-400 font-semibold" style={{ fontSize: 13 }}>4K videos detected</div>
            <div className="text-[#777] mt-0.5" style={{ fontSize: 12 }}>
              Pre-scale to 1080×1920 once → generation ~5× faster
            </div>
          </div>
          <button
            onClick={optimize}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-semibold text-black transition-colors flex-shrink-0"
            style={{ fontSize: 13 }}
          >
            ⚡ Optimize
          </button>
        </div>
      )}

      {optimizing && (
        <div className="mt-4 bg-[#111] border border-[#222] rounded-xl p-4">
          <div className="text-[#a78bfa] font-semibold mb-2 animate-pulse" style={{ fontSize: 13 }}>
            Optimizing… (this may take a few minutes)
          </div>
          <div className="space-y-1">
            {optimizeLog.map((l, i) => (
              <div key={i} className="text-[#555] font-mono" style={{ fontSize: 11 }}>{l}</div>
            ))}
          </div>
        </div>
      )}

      {!optimizing && optimizeLog.length > 0 && needsOptimize === false && (
        <div className="mt-4 bg-green-900/20 border border-green-700/40 rounded-xl p-3">
          <div className="text-green-400 font-semibold mb-1" style={{ fontSize: 13 }}>✓ All videos optimized</div>
          {optimizeLog.map((l, i) => (
            <div key={i} className="text-[#555] font-mono" style={{ fontSize: 11 }}>{l}</div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <div className="uppercase tracking-wider mb-3 text-[#555]" style={{ fontSize: 11 }}>
          {videos.length} video{videos.length !== 1 ? "s" : ""} in /stock_videos/
        </div>
        {videos.length === 0 ? (
          <div className="text-[#555] text-center py-8 bg-[#111] border border-[#222] rounded-xl" style={{ fontSize: 13 }}>
            No videos uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {videos.map(v => {
              const info = infos[v.name];
              return (
                <div key={v.name} className="flex items-center gap-3 bg-[#111] border border-[#222] rounded-lg px-4 py-3">
                  <span className="text-lg">🎥</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 13 }}>{v.name}</div>
                    {info && (
                      <div className={`mt-0.5 ${info.needsOptimize ? "text-yellow-600" : "text-[#444]"}`} style={{ fontSize: 11 }}>
                        {info.w}×{info.h}{info.needsOptimize ? " — needs optimize" : " ✓"}
                      </div>
                    )}
                  </div>
                  <span className="text-[#555]" style={{ fontSize: 12 }}>{fmtSize(v.size)}</span>
                  <button
                    onClick={async () => { await fetch(`/api/stock/${encodeURIComponent(v.name)}`, { method: "DELETE" }); load(); }}
                    className="w-7 h-7 rounded-md border border-[#222] text-[#555] hover:border-red-500 hover:text-red-400 flex items-center justify-center transition-colors"
                    style={{ fontSize: 12 }}
                  >✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
