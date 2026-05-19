"use client";

import { useEffect, useRef, useState } from "react";
import { Segment } from "@/lib/types";

interface Props {
  filename: string;
  currentTime: number;
  duration: number;
  segments: Segment[];
  onSeek: (time: number) => void;
  onSegmentChange?: (index: number, field: "start" | "end", time: number) => void;
}

const HIT_PX = 8;

export default function Waveform({ filename, currentTime, duration, segments, onSeek, onSegmentChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveData, setWaveData] = useState<Float32Array | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dragging = useRef<{ segIdx: number; field: "start" | "end" } | null>(null);

  useEffect(() => {
    setLoading(true);
    setWaveData(null);
    setError(false);

    fetch(`/api/music/${encodeURIComponent(filename)}`)
      .then(r => r.arrayBuffer())
      .then(buf => new AudioContext().decodeAudioData(buf))
      .then(audioBuffer => {
        setWaveData(audioBuffer.getChannelData(0));
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError(true); });
  }, [filename]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveData) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth * dpr;
    const H = canvas.offsetHeight * dpr;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);

    if (duration > 0) {
      segments.forEach((seg, i) => {
        const x1 = (seg.start / duration) * W;
        const x2 = (seg.end / duration) * W;
        ctx.fillStyle = "rgba(124, 58, 237, 0.13)";
        ctx.fillRect(x1, 0, x2 - x1, H);
        ctx.fillStyle = "rgba(124, 58, 237, 0.7)";
        ctx.fillRect(x1, 0, 1.5 * dpr, H);
        ctx.fillRect(x2 - 1.5 * dpr, 0, 1.5 * dpr, H);
        ctx.fillStyle = "rgba(167, 139, 250, 0.9)";
        ctx.font = `${10 * dpr}px -apple-system, sans-serif`;
        ctx.fillText(`#${i + 1}`, x1 + 4 * dpr, 12 * dpr);
      });
    }

    const samplesPerPixel = Math.max(1, Math.floor(waveData.length / W));
    const playX = duration > 0 ? (currentTime / duration) * W : 0;

    for (let x = 0; x < W; x++) {
      let min = 0, max = 0;
      const start = x * samplesPerPixel;
      for (let i = 0; i < samplesPerPixel; i++) {
        const v = waveData[start + i] || 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      const amp = Math.max(0.015, (max - min) / 2);
      const barH = amp * H;
      const yTop = (H - barH) / 2;
      ctx.fillStyle = x < playX ? "#7c3aed" : "#2a2a4a";
      ctx.fillRect(x, yTop, 1, barH);
    }

    if (duration > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(playX - dpr, 0, 2 * dpr, H);
    }
  }, [waveData, currentTime, duration, segments]);

  const timeFromX = (clientX: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const hitHandle = (clientX: number): { segIdx: number; field: "start" | "end" } | null => {
    if (!duration || !canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    for (let i = 0; i < segments.length; i++) {
      const startPx = (segments[i].start / duration) * rect.width;
      const endPx = (segments[i].end / duration) * rect.width;
      if (Math.abs(px - endPx) <= HIT_PX) return { segIdx: i, field: "end" };
      if (Math.abs(px - startPx) <= HIT_PX) return { segIdx: i, field: "start" };
    }
    return null;
  };

  const getCursor = (clientX: number) => {
    return hitHandle(clientX) ? "ew-resize" : "crosshair";
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const hit = hitHandle(e.clientX);
    if (hit && onSegmentChange) {
      dragging.current = hit;
      e.preventDefault();

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current || !onSegmentChange) return;
        if (canvasRef.current) canvasRef.current.style.cursor = "ew-resize";
        const t = timeFromX(ev.clientX);
        onSegmentChange(dragging.current.segIdx, dragging.current.field, parseFloat(t.toFixed(2)));
      };

      const onUp = () => {
        dragging.current = null;
        if (canvasRef.current) canvasRef.current.style.cursor = "crosshair";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current && canvasRef.current) {
      canvasRef.current.style.cursor = getCursor(e.clientX);
    }
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging.current && duration) {
      onSeek(timeFromX(e.clientX));
    }
  };

  const onMouseLeave = () => {};

  return (
    <div className="relative w-full h-16 rounded overflow-hidden bg-[#0d0d0d]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#444]">
          Waveform lädt…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#444]">
          Waveform nicht verfügbar
        </div>
      )}
      <canvas
        ref={canvasRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className="w-full h-full"
        style={{ display: loading || error ? "none" : "block", cursor: "crosshair" }}
      />
    </div>
  );
}
