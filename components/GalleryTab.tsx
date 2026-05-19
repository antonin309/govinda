"use client";

import { useEffect, useState } from "react";

interface VideoFile {
  name: string;
  size: number;
  createdAt: number;
}

function fmtSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function VideoCard({ v, onDelete }: { v: VideoFile; onDelete: () => void }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="bg-[#111] border border-[#222] hover:border-[#333] rounded-xl overflow-hidden transition-colors">
      <div className="bg-[#0a0a0a] relative overflow-hidden" style={{ aspectRatio: "9/16" }}>
        {playing ? (
          <video
            src={`/api/output/${encodeURIComponent(v.name)}`}
            className="absolute inset-0 w-full h-full object-contain"
            controls
            autoPlay
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <>
            <img
              src={`/api/thumbnail/${encodeURIComponent(v.name)}`}
              className="w-full h-full object-cover"
              alt={v.name}
              loading="lazy"
            />
            <button
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                ▶
              </div>
            </button>
          </>
        )}
      </div>
      <div className="p-2.5">
        <div className="font-medium truncate" style={{ fontSize: 11 }}>{v.name}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[#555]" style={{ fontSize: 11 }}>{fmtSize(v.size)}</span>
          <span className="text-[#555]" style={{ fontSize: 11 }}>{fmtDate(v.createdAt)}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <a
            href={`/api/output/${encodeURIComponent(v.name)}`}
            download={v.name}
            className="flex-1 py-1 text-[#555] hover:text-[#a78bfa] border border-[#222] hover:border-[#7c3aed] rounded-md transition-colors text-center"
            style={{ fontSize: 11 }}
          >
            ↓ Download
          </a>
          <button
            onClick={onDelete}
            className="flex-1 py-1 text-[#555] hover:text-red-400 border border-[#222] hover:border-red-500 rounded-md transition-colors"
            style={{ fontSize: 11 }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GalleryTab() {
  const [videos, setVideos] = useState<VideoFile[]>([]);

  const load = () => fetch("/api/output").then(r => r.json()).then(setVideos);
  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, []);

  const remove = async (name: string) => {
    await fetch(`/api/output/${encodeURIComponent(name)}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">
          Output <span className="text-[#555] font-normal text-base">({videos.length})</span>
        </h2>
        <button onClick={load} className="text-[#555] hover:text-[#ccc] transition-colors" style={{ fontSize: 13 }}>↻ Refresh</button>
      </div>

      {videos.length === 0 ? (
        <div className="text-[#555] text-center py-16" style={{ fontSize: 13 }}>
          No videos in <code className="bg-[#1a1a1a] px-1 rounded">/output/</code>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map(v => (
            <VideoCard key={v.name} v={v} onDelete={() => remove(v.name)} />
          ))}
        </div>
      )}
    </div>
  );
}
