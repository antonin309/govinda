"use client";

import { useEffect, useRef, useState } from "react";
import { Config, TextStyle, DEFAULT_TEXT_STYLE, resolveStyle } from "@/lib/types";
import TextPreview from "./TextPreview";
import TextStyleEditor from "./TextStyleEditor";

function parseHooks(text: string): string[] {
  return text
    .split("\n")
    .map(l => l.trim().replace(/^[\d]+[.)]\s*/, "").replace(/^[-–•*]\s*/, "").trim())
    .filter(l => l.length >= 4);
}

export default function HooksTab() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [pools, setPools] = useState<Record<string, string[]>>({});
  const [activePool, setActivePool] = useState("Default");
  const [renamingPool, setRenamingPool] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [disabled, setDisabled] = useState<Set<number>>(new Set());
  const [textStyle, setTextStyle] = useState<TextStyle>(DEFAULT_TEXT_STYLE);
  const [hookStyles, setHookStyles] = useState<Record<number, Partial<TextStyle>>>({});
  const [expandedStyle, setExpandedStyle] = useState<number | null>(null);
  const [selectedHook, setSelectedHook] = useState(0);
  const [saved, setSaved] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [preview, setPreview] = useState<string[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    fetch("/api/config").then(r => r.json()).then((c: Config) => {
      setCfg(c);
      // Migrate legacy hooks[] → hook_pools if needed
      const initialPools: Record<string, string[]> = c.hook_pools && Object.keys(c.hook_pools).length > 0
        ? c.hook_pools
        : { "Default": c.hooks.map(h => h.replace(/\n/g, " ")) };
      const pool = c.active_pool && initialPools[c.active_pool] ? c.active_pool : Object.keys(initialPools)[0];
      setPools(initialPools);
      setActivePool(pool);
      setDisabled(new Set(c.settings.hooks_disabled ?? []));
      setTextStyle({ ...DEFAULT_TEXT_STYLE, ...(c.settings.text_style ?? {}) });
      setHookStyles(c.settings.hook_styles ?? {});
      setTimeout(() => { isFirstLoad.current = false; }, 50);
    });
  }, []);

  const hooks = pools[activePool] ?? [];

  const scheduleAutoSave = (
    nextPools: Record<string, string[]>,
    nextPool: string,
    nextDisabled: Set<number>,
    nextStyle?: TextStyle,
    nextHookStyles?: Record<number, Partial<TextStyle>>
  ) => {
    if (isFirstLoad.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(nextPools, nextPool, nextDisabled, nextStyle, nextHookStyles), 600);
  };

  const save = async (
    nextPools = pools,
    nextPool = activePool,
    nextDisabled = disabled,
    nextStyle = textStyle,
    nextHookStyles = hookStyles
  ) => {
    const latest: Config = await fetch("/api/config").then(r => r.json());
    const allHooks = Object.values(nextPools).flat();
    const updated: Config = {
      ...latest,
      hooks: nextPools[nextPool] ?? [],
      hook_pools: nextPools,
      active_pool: nextPool,
      settings: { ...latest.settings, hooks_disabled: [...nextDisabled], text_style: nextStyle, hook_styles: nextHookStyles },
    };
    await fetch("/api/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setCfg(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const switchPool = (name: string) => {
    setActivePool(name);
    setDisabled(new Set());
    setSelectedHook(0);
    setExpandedStyle(null);
  };

  const addPool = () => {
    const name = `Pool ${Object.keys(pools).length + 1}`;
    const next = { ...pools, [name]: [] };
    setPools(next);
    setActivePool(name);
    setSelectedHook(0);
    scheduleAutoSave(next, name, disabled);
    // Start renaming immediately
    setRenamingPool(name);
    setRenameValue(name);
  };

  const deletePool = (name: string) => {
    if (Object.keys(pools).length <= 1) return;
    const next = { ...pools };
    delete next[name];
    const nextActive = Object.keys(next)[0];
    setPools(next);
    setActivePool(nextActive);
    scheduleAutoSave(next, nextActive, disabled);
  };

  const finishRename = () => {
    if (!renamingPool || !renameValue.trim()) { setRenamingPool(null); return; }
    const newName = renameValue.trim();
    if (newName === renamingPool) { setRenamingPool(null); return; }
    if (pools[newName]) { setRenamingPool(null); return; } // name taken
    const next: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(pools)) {
      next[k === renamingPool ? newName : k] = v;
    }
    const nextActive = activePool === renamingPool ? newName : activePool;
    setPools(next);
    setActivePool(nextActive);
    setRenamingPool(null);
    scheduleAutoSave(next, nextActive, disabled);
  };

  const setHooks = (updater: string[] | ((prev: string[]) => string[])) => {
    const next = typeof updater === "function" ? updater(hooks) : updater;
    const nextPools = { ...pools, [activePool]: next };
    setPools(nextPools);
    scheduleAutoSave(nextPools, activePool, disabled);
  };

  const onStyleChange = (s: TextStyle) => {
    setTextStyle(s);
    scheduleAutoSave(pools, activePool, disabled, s, hookStyles);
  };

  const onHookStyleChange = (i: number, s: Partial<TextStyle>) => {
    const next = { ...hookStyles, [i]: s };
    setHookStyles(next);
    scheduleAutoSave(pools, activePool, disabled, textStyle, next);
  };

  const resetHookStyle = (i: number) => {
    const next = { ...hookStyles };
    delete next[i];
    setHookStyles(next);
    scheduleAutoSave(pools, activePool, disabled, textStyle, next);
  };

  const toggleDisabled = (i: number) => {
    const next = new Set(disabled);
    if (next.has(i)) next.delete(i); else next.add(i);
    setDisabled(next);
    scheduleAutoSave(pools, activePool, next);
  };

  const removeHook = (i: number) => {
    const nextHooks = hooks.filter((_, idx) => idx !== i);
    const nextDisabled = new Set<number>();
    disabled.forEach(d => { if (d < i) nextDisabled.add(d); else if (d > i) nextDisabled.add(d - 1); });
    const nextPools = { ...pools, [activePool]: nextHooks };
    setPools(nextPools);
    setDisabled(nextDisabled);
    if (selectedHook >= nextHooks.length) setSelectedHook(Math.max(0, nextHooks.length - 1));
    scheduleAutoSave(nextPools, activePool, nextDisabled);
  };

  const onImportChange = (text: string) => {
    setImportText(text);
    setPreview(parseHooks(text));
  };

  const importHooks = () => {
    const parsed = parseHooks(importText);
    const nextHooks = [...hooks, ...parsed.filter(h => !hooks.includes(h))];
    const nextPools = { ...pools, [activePool]: nextHooks };
    setPools(nextPools);
    setImportText("");
    setPreview([]);
    setShowImport(false);
    scheduleAutoSave(nextPools, activePool, disabled);
  };

  const activeCount = hooks.filter((h, i) => h.trim() && !disabled.has(i)).length;
  const previewHook = hooks[selectedHook] ?? "";
  const previewStyle = resolveStyle(textStyle, hookStyles[selectedHook]);

  return (
    <div className="flex h-full">
      {/* Left: hook list */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto border-r border-[#1a1a1a]">

        {/* Pool selector */}
        <div className="mb-5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.keys(pools).map(name => (
              <div key={name} className="relative group flex items-center">
                {renamingPool === name ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={e => { if (e.key === "Enter") finishRename(); if (e.key === "Escape") setRenamingPool(null); }}
                    className="px-2 py-1 rounded-lg bg-[#1a1a1a] border border-[#7c3aed] outline-none text-white font-medium"
                    style={{ fontSize: 12, width: Math.max(80, renameValue.length * 8) }}
                  />
                ) : (
                  <button
                    onClick={() => switchPool(name)}
                    onDoubleClick={() => { setRenamingPool(name); setRenameValue(name); }}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      activePool === name
                        ? "bg-[#7c3aed] text-white"
                        : "bg-[#1a1a1a] text-[#555] hover:text-[#ccc]"
                    }`}
                    style={{ fontSize: 12 }}
                    title="Double-click to rename"
                  >
                    {name}
                    <span className={`ml-1.5 ${activePool === name ? "text-[#c4b5fd]" : "text-[#444]"}`} style={{ fontSize: 11 }}>
                      {(pools[name] ?? []).length}
                    </span>
                  </button>
                )}
                {Object.keys(pools).length > 1 && activePool !== name && (
                  <button
                    onClick={() => deletePool(name)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1a1a1a] border border-[#333] text-[#555] hover:text-red-400 hidden group-hover:flex items-center justify-center transition-colors"
                    style={{ fontSize: 9 }}
                  >✕</button>
                )}
              </div>
            ))}
            <button
              onClick={addPool}
              className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-dashed border-[#333] text-[#555] hover:text-[#a78bfa] hover:border-[#7c3aed] transition-colors"
              style={{ fontSize: 12 }}
              title="New pool"
            >
              + New pool
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[#555]" style={{ fontSize: 12 }}>
            <span className="text-[#a78bfa] font-medium">{activeCount}</span>
            <span> of {hooks.filter(h => h.trim()).length} active</span>
          </p>
          <button
            onClick={() => save()}
            className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg font-semibold transition-colors"
            style={{ fontSize: 13 }}
          >
            {saved ? "Saved ✓" : "Save"}
          </button>
        </div>

        {/* Bulk import */}
        <div className="mb-4">
          <button
            onClick={() => setShowImport(v => !v)}
            className="text-[#7c3aed] hover:text-[#a78bfa] transition-colors"
            style={{ fontSize: 13 }}
          >
            {showImport ? "▲ Close import" : "Import from text"}
          </button>
          {showImport && (
            <div className="mt-3 bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
              <p className="text-[#555]" style={{ fontSize: 12 }}>Paste hooks — each line detected automatically.</p>
              <textarea
                value={importText}
                onChange={e => onImportChange(e.target.value)}
                placeholder={"1. This changed everything\n2. Nobody talks about this\n…"}
                rows={5}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 outline-none focus:border-[#7c3aed] resize-none font-mono transition-colors"
                style={{ fontSize: 12 }}
              />
              {preview.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {preview.map((h, i) => (
                    <div key={i} className="text-[#ccc] bg-[#1a1a1a] rounded px-2 py-1" style={{ fontSize: 12 }}>"{h}"</div>
                  ))}
                </div>
              )}
              <button
                onClick={importHooks}
                disabled={preview.length === 0}
                className="px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 rounded-lg font-semibold transition-colors"
                style={{ fontSize: 13 }}
              >
                Import {preview.length} hooks
              </button>
            </div>
          )}
        </div>

        {/* Quick toggles */}
        {hooks.filter(h => h.trim()).length > 0 && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDisabled(new Set())} className="text-[#555] hover:text-green-400 transition-colors" style={{ fontSize: 12 }}>Enable all</button>
            <span className="text-[#333]">·</span>
            <button onClick={() => setDisabled(new Set(hooks.map((_, i) => i)))} className="text-[#555] hover:text-[#aaa] transition-colors" style={{ fontSize: 12 }}>Disable all</button>
          </div>
        )}

        {/* Hook list */}
        <div className="space-y-2">
          {hooks.map((h, i) => {
            const isDisabled = disabled.has(i);
            return (
              <div key={i}>
              <div
                onClick={() => setSelectedHook(i)}
                className={`flex gap-2 items-center rounded-xl p-2 cursor-pointer transition-all ${
                  selectedHook === i ? "bg-[#1a1a1a] ring-1 ring-[#7c3aed]/40" : "hover:bg-[#111]"
                } ${isDisabled ? "opacity-40" : ""}`}
              >
                <button
                  onClick={e => { e.stopPropagation(); toggleDisabled(i); }}
                  className={`w-7 h-8 flex items-center justify-center rounded-lg border flex-shrink-0 transition-colors ${
                    isDisabled ? "border-[#2a2a2a] text-[#444]" : "border-[#2a2a2a] text-green-400"
                  }`}
                  style={{ fontSize: 12 }}
                >
                  {isDisabled ? "○" : "●"}
                </button>
                <div className="flex-1" onClick={e => e.stopPropagation()}>
                  <input
                    value={h}
                    onChange={e => {
                      const next = hooks.map((x, idx) => idx === i ? e.target.value : x);
                      const nextPools = { ...pools, [activePool]: next };
                      setPools(nextPools);
                      scheduleAutoSave(nextPools, activePool, disabled);
                    }}
                    onFocus={() => setSelectedHook(i)}
                    placeholder="Hook text…"
                    className={`w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 outline-none focus:border-[#7c3aed] transition-colors ${isDisabled ? "text-[#444]" : ""}`}
                    style={{ fontSize: 13 }}
                  />
                </div>
                <button
                  onClick={e => { e.stopPropagation(); setExpandedStyle(expandedStyle === i ? null : i); setSelectedHook(i); }}
                  title="Custom style for this hook"
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors flex-shrink-0 relative ${
                    hookStyles[i] && Object.keys(hookStyles[i]).length > 0
                      ? "border-[#7c3aed] text-[#a78bfa]"
                      : "border-[#222] text-[#444] hover:text-[#777]"
                  }`}
                  style={{ fontSize: 12 }}
                >
                  ✏️
                  {hookStyles[i] && Object.keys(hookStyles[i]).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#7c3aed] rounded-full" />
                  )}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeHook(i); }}
                  className="w-8 h-8 rounded-lg border border-[#222] hover:border-red-500 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0"
                  style={{ fontSize: 12 }}
                >✕</button>
              </div>

              {expandedStyle === i && (
                <div className="mt-2 ml-9 bg-[#0d0d0d] border border-[#7c3aed]/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#a78bfa] font-medium" style={{ fontSize: 11 }}>Custom style for this hook</span>
                    {hookStyles[i] && Object.keys(hookStyles[i]).length > 0 && (
                      <button onClick={() => resetHookStyle(i)} className="text-[#555] hover:text-red-400 transition-colors" style={{ fontSize: 11 }}>
                        ↩ Reset to global
                      </button>
                    )}
                  </div>
                  <TextStyleEditor
                    style={resolveStyle(textStyle, hookStyles[i])}
                    onChange={s => onHookStyleChange(i, s)}
                  />
                </div>
              )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            const next = [...hooks, ""];
            const nextPools = { ...pools, [activePool]: next };
            setPools(nextPools);
            setSelectedHook(hooks.length);
            scheduleAutoSave(nextPools, activePool, disabled);
          }}
          className="w-full mt-3 py-2.5 border border-dashed border-[#333] rounded-xl text-[#555] hover:border-[#7c3aed] hover:text-[#a78bfa] transition-colors"
          style={{ fontSize: 13 }}
        >
          + Add hook
        </button>
      </div>

      {/* Right: preview + style editor */}
      <div className="w-80 flex-shrink-0 p-6 overflow-y-auto space-y-6">
        <div>
          <div className="text-[#555] uppercase tracking-wider mb-3" style={{ fontSize: 11 }}>Live Preview</div>
          <TextPreview hook={previewHook} style={previewStyle} />
        </div>
        <div>
          <div className="text-[#555] uppercase tracking-wider mb-3" style={{ fontSize: 11 }}>Text Style</div>
          <div className="bg-[#111] border border-[#222] rounded-xl p-4">
            <TextStyleEditor style={textStyle} onChange={onStyleChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
