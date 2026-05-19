"use client";

import { useEffect, useRef, useState } from "react";
import { Config } from "@/lib/types";

export default function GenerateTab() {
  const [mode, setMode] = useState<"one" | "all">("one");
  const [config, setConfig] = useState<Config | null>(null);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [useLimit, setUseLimit] = useState(false);
  const [limit, setLimit] = useState(10);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then(setConfig);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const disabledSet = new Set(config?.settings.hooks_disabled ?? []);
  const totalSegments = config
    ? Object.values(config.music).reduce((s, e) => s + e.segments.length, 0)
    : 0;
  const activeHooks = config ? config.hooks.filter((h, i) => h.trim() && !disabledSet.has(i)).length : 0;
  const totalCombos = activeHooks * totalSegments;
  const willGenerate = mode === "all" ? (useLimit ? Math.min(limit, totalCombos) : totalCombos) : 1;

  const start = async () => {
    setLogs([]);
    setDone(false);
    setStuck(false);

    // Check if already locked
    const head = await fetch("/api/generate", { method: "HEAD" });
    if (head.headers.get("X-Running") === "true") {
      setStuck(true);
      return;
    }

    setRunning(true);
    const params = new URLSearchParams({ mode });
    if (mode === "all" && useLimit) params.set("count", String(limit));
    const es = new EventSource(`/api/generate?${params}`);
    esRef.current = es;

    es.onmessage = e => {
      const data = JSON.parse(e.data);
      if (data.done) {
        es.close();
        setRunning(false);
        setDone(true);
      } else {
        setLogs(prev => [...prev, data.msg]);
      }
    };

    es.onerror = () => {
      es.close();
      setRunning(false);
      setLogs(prev => [...prev, "Connection lost — generation may still be running on server."]);
      setStuck(true);
    };
  };

  const stop = () => {
    esRef.current?.close();
    fetch("/api/generate", { method: "DELETE" });
    setRunning(false);
    setLogs(prev => [...prev, "Stopped."]);
  };

  const resetLock = () => {
    fetch("/api/generate", { method: "DELETE" });
    setRunning(false);
    setLogs([]);
    setDone(false);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold mb-6">Generate</h2>

      <div className="flex gap-2 mb-6">
        {(["one", "all"] as const).map(m => (
          <button
            key={m}
            onClick={() => !running && setMode(m)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              mode === m ? "bg-[#7c3aed] text-white" : "bg-[#1a1a1a] text-[#777] hover:text-[#ccc] border border-[#222]"
            }`}
            style={{ fontSize: 13 }}
          >
            {m === "one" ? "One video" : "All combinations"}
          </button>
        ))}
      </div>

      <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4" style={{ fontSize: 13 }}>
        {mode === "one" ? (
          <p className="text-[#777]">Generates one random video with a random hook and music segment.</p>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-[#555]">Active hooks</span>
              <span>{activeHooks}</span>
            </div>
            {config && Object.entries(config.music)
              .filter(([, v]) => v.segments.length > 0)
              .map(([name, entry]) => (
                <div key={name} className="flex justify-between" style={{ fontSize: 12 }}>
                  <span className="text-[#444] truncate max-w-[200px]">{name}</span>
                  <span className="text-[#555]">{entry.segments.length} segment{entry.segments.length !== 1 ? "s" : ""}</span>
                </div>
              ))}
            <div className="flex justify-between border-t border-[#222] pt-2 mt-1 font-semibold">
              <span className="text-[#555]">Total combinations</span>
              <span className="text-[#a78bfa]">{totalCombos}</span>
            </div>
          </div>
        )}
      </div>

      {mode === "all" && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setUseLimit(false)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${!useLimit ? "border-[#7c3aed] text-[#a78bfa] bg-[#7c3aed]/10" : "border-[#222] text-[#555]"}`}
              style={{ fontSize: 12 }}
            >
              All ({totalCombos})
            </button>
            <button
              onClick={() => setUseLimit(true)}
              className={`px-3 py-1.5 rounded-lg border transition-colors ${useLimit ? "border-[#7c3aed] text-[#a78bfa] bg-[#7c3aed]/10" : "border-[#222] text-[#555]"}`}
              style={{ fontSize: 12 }}
            >
              Random subset
            </button>
          </div>
          {useLimit && (
            <div className="flex items-center gap-3">
              <span className="text-[#555]" style={{ fontSize: 12 }}>Generate</span>
              <input
                type="number" min={1} max={totalCombos} value={limit}
                onChange={e => setLimit(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-1.5 outline-none focus:border-[#7c3aed] text-center"
                style={{ fontSize: 13 }}
              />
              <span className="text-[#555]" style={{ fontSize: 12 }}>of {totalCombos} randomly</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={running ? stop : start}
          disabled={!config || (mode === "all" && totalCombos === 0)}
          className={`px-6 py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            running ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#7c3aed] hover:bg-[#6d28d9] text-white"
          }`}
          style={{ fontSize: 13 }}
        >
          {running ? "⏹ Stop" : `▶ Generate${mode === "all" ? ` ${willGenerate}` : ""}`}
        </button>
        {done && <span className="text-green-400" style={{ fontSize: 13 }}>✓ Done — check Output tab</span>}
        {stuck && !running && (
          <button
            onClick={resetLock}
            className="px-4 py-2 rounded-lg bg-red-900/40 border border-red-700 text-red-400 hover:bg-red-900/60 transition-colors font-semibold"
            style={{ fontSize: 13 }}
          >
            🔓 Reset stuck lock
          </button>
        )}
      </div>

      {logs.length > 0 && (
        <div
          ref={logRef}
          className="bg-[#0d0d0d] border border-[#222] rounded-xl p-4 h-72 overflow-y-auto font-mono space-y-0.5"
          style={{ fontSize: 11 }}
        >
          {logs.map((line, i) => (
            <div
              key={i}
              className={
                line.startsWith("ERROR") ? "text-red-400" :
                line.startsWith("✓") ? "text-green-400" :
                line.startsWith("[") ? "text-[#a78bfa] mt-2" :
                "text-[#777]"
              }
            >
              {line}
            </div>
          ))}
          {running && <div className="text-[#555] animate-pulse">…</div>}
        </div>
      )}
    </div>
  );
}
