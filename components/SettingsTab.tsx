"use client";

import { useEffect, useState } from "react";
import { Config } from "@/lib/types";

export default function SettingsTab() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then((c: Config) => {
      setCfg(c);
    });
  }, []);

  const save = async () => {
    await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg!) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!cfg) return <div className="p-8 text-[#555]">Loading…</div>;

  const s = cfg.settings;
  const set = (key: keyof typeof s, val: number) =>
    setCfg(prev => prev ? { ...prev, settings: { ...prev.settings, [key]: val } } : prev);

  return (
    <div className="p-6 max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Settings</h2>
        <button onClick={save} className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg font-semibold transition-colors" style={{ fontSize: 13 }}>
          {saved ? "Saved ✓" : "💾 Save"}
        </button>
      </div>

      <div className="space-y-4">
        {[
          { label: "Min. video length (s)", key: "video_duration_min" as const, step: 0.5, min: 3, max: 30 },
          { label: "Max. video length (s)", key: "video_duration_max" as const, step: 0.5, min: 3, max: 30 },
          { label: "Music volume (0–1)", key: "music_volume" as const, step: 0.05, min: 0, max: 1 },
        ].map(({ label, key, step, min, max }) => (
          <div key={key}>
            <label className="block text-[#555] mb-1.5" style={{ fontSize: 12 }}>{label}</label>
            <input
              type="number" step={step} min={min} max={max} value={s[key]}
              onChange={e => set(key, parseFloat(e.target.value))}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 outline-none focus:border-[#7c3aed] transition-colors"
              style={{ fontSize: 13 }}
            />
          </div>
        ))}
      </div>

    </div>
  );
}
