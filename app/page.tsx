"use client";

import { useState } from "react";
import MusicTab from "@/components/MusicTab";
import HooksTab from "@/components/HooksTab";
import SettingsTab from "@/components/SettingsTab";
import GenerateTab from "@/components/GenerateTab";
import GalleryTab from "@/components/GalleryTab";
import StockTab from "@/components/StockTab";
import CTATab from "@/components/CTATab";
import LongVideoTab from "@/components/LongVideoTab";

const TABS = [
  { id: "music",     label: "Music",        icon: "🎵" },
  { id: "source",    label: "Video Source", icon: "🎥" },
  { id: "cta",       label: "CTA Video",    icon: "🎞️" },
  { id: "hooks",     label: "Hooks",        icon: "🪝" },
  { id: "settings",  label: "Settings",     icon: "⚙️" },
  { id: "generate",  label: "Generate",     icon: "🎬" },
  { id: "gallery",   label: "Output",       icon: "📁" },
] as const;

type Tab = (typeof TABS)[number]["id"];

export default function Home() {
  const [active, setActive] = useState<Tab>("music");
  const [visited, setVisited] = useState<Set<Tab>>(new Set<Tab>(["music"]));

  const goTo = (tab: Tab) => {
    setActive(tab);
    setVisited(prev => { const n = new Set(prev); n.add(tab); return n; });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-48 flex-shrink-0 bg-[#111] border-r border-[#222] flex flex-col">
        <div className="px-4 py-4 border-b border-[#222]">
          <div className="font-bold tracking-tight" style={{ fontSize: 15 }}>Govinda</div>
          <div className="text-[#555] mt-0.5" style={{ fontSize: 11 }}>v3.0</div>
        </div>
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => goTo(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
                active === tab.id
                  ? "bg-[#7c3aed]/20 text-[#a78bfa]"
                  : "text-[#777] hover:text-[#ccc] hover:bg-[#1a1a1a]"
              }`}
              style={{ fontSize: 13 }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        {visited.has("music")    && <div className={active === "music"    ? undefined : "hidden"}><MusicTab /></div>}
        {visited.has("source")   && <div className={active === "source"   ? undefined : "hidden"}><LongVideoTab /></div>}
        {visited.has("cta")      && <div className={active === "cta"      ? undefined : "hidden"}><CTATab /></div>}
        {visited.has("hooks")    && <div className={active === "hooks"    ? undefined : "hidden"}><HooksTab /></div>}
        {visited.has("settings") && <div className={active === "settings" ? undefined : "hidden"}><SettingsTab /></div>}
        {visited.has("generate") && <div className={active === "generate" ? undefined : "hidden"}><GenerateTab /></div>}
        {visited.has("gallery")  && <div className={active === "gallery"  ? undefined : "hidden"}><GalleryTab /></div>}
      </main>
    </div>
  );
}
