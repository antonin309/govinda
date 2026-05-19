"use client";

import { TextStyle } from "@/lib/types";

interface Props {
  style: TextStyle;
  onChange: (s: TextStyle) => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[#555] w-28 flex-shrink-0" style={{ fontSize: 12 }}>{label}</span>
      {children}
    </div>
  );
}

export default function TextStyleEditor({ style, onChange }: Props) {
  const set = <K extends keyof TextStyle>(key: K, val: TextStyle[K]) =>
    onChange({ ...style, [key]: val });

  return (
    <div className="space-y-3">
      {/* Font */}
      <Row label="Font">
        <div className="flex gap-2">
          {(["anton", "system-bold"] as const).map(f => (
            <button
              key={f}
              onClick={() => set("font", f)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                style.font === f
                  ? "border-[#7c3aed] bg-[#7c3aed]/20 text-[#a78bfa]"
                  : "border-[#222] text-[#555] hover:text-[#aaa]"
              }`}
              style={{ fontFamily: f === "anton" ? '"Anton", Impact, sans-serif' : undefined }}
            >
              {f === "anton" ? "Anton" : "System Bold"}
            </button>
          ))}
        </div>
      </Row>

      {/* Font size */}
      <Row label="Size">
        <input
          type="range" min={28} max={100} value={style.font_size}
          onChange={e => set("font_size", parseInt(e.target.value))}
          className="flex-1 accent-[#7c3aed]"
        />
        <span className="text-[#555] w-10 text-right flex-shrink-0" style={{ fontSize: 12 }}>{style.font_size}</span>
      </Row>

      {/* Outline width */}
      <Row label="Outline">
        <input
          type="range" min={0} max={20} value={style.outline_width}
          onChange={e => set("outline_width", parseInt(e.target.value))}
          className="flex-1 accent-[#7c3aed]"
        />
        <span className="text-[#555] w-10 text-right flex-shrink-0" style={{ fontSize: 12 }}>{style.outline_width}</span>
      </Row>

      {/* Y position */}
      <Row label="Position">
        <input
          type="range" min={5} max={90} value={style.position_y}
          onChange={e => set("position_y", parseInt(e.target.value))}
          className="flex-1 accent-[#7c3aed]"
        />
        <span className="text-[#555] w-10 text-right flex-shrink-0" style={{ fontSize: 12 }}>{style.position_y}%</span>
      </Row>

      {/* Colors */}
      <Row label="Text color">
        <div className="flex items-center gap-2">
          <input
            type="color" value={style.color}
            onChange={e => set("color", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent"
          />
          <span className="text-[#555] font-mono" style={{ fontSize: 11 }}>{style.color}</span>
        </div>
      </Row>

      <Row label="Outline color">
        <div className="flex items-center gap-2">
          <input
            type="color" value={style.outline_color}
            onChange={e => set("outline_color", e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent"
          />
          <span className="text-[#555] font-mono" style={{ fontSize: 11 }}>{style.outline_color}</span>
        </div>
      </Row>

      {/* Background box */}
      <Row label="Background">
        <div className="flex gap-1">
          {(["Aus", "An", "Auto"] as const).map(mode => {
            const active =
              mode === "Auto" ? style.bg_auto :
              mode === "An"   ? (!style.bg_auto && style.bg_enabled) :
                                (!style.bg_auto && !style.bg_enabled);
            return (
              <button
                key={mode}
                onClick={() => {
                  if (mode === "Auto") {
                    onChange({ ...style, bg_auto: true });
                  } else if (mode === "An") {
                    onChange({ ...style, bg_auto: false, bg_enabled: true, color: "#000000", outline_width: 0 });
                  } else {
                    onChange({ ...style, bg_auto: false, bg_enabled: false, color: "#ffffff" });
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  active
                    ? "border-[#7c3aed] bg-[#7c3aed]/20 text-[#a78bfa]"
                    : "border-[#222] text-[#555] hover:text-[#aaa]"
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
        {style.bg_enabled && !style.bg_auto && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color" value={style.bg_color}
              onChange={e => set("bg_color", e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-[#333] bg-transparent"
            />
            <span className="text-[#555] font-mono" style={{ fontSize: 11 }}>{style.bg_color}</span>
          </div>
        )}
      </Row>

      {style.bg_enabled && !style.bg_auto && (
        <>
          <Row label="Padding">
            <input
              type="range" min={4} max={40} value={style.bg_padding}
              onChange={e => set("bg_padding", parseInt(e.target.value))}
              className="flex-1 accent-[#7c3aed]"
            />
            <span className="text-[#555] w-10 text-right flex-shrink-0" style={{ fontSize: 12 }}>{style.bg_padding}px</span>
          </Row>
          <Row label="Radius">
            <input
              type="range" min={0} max={40} value={style.bg_radius}
              onChange={e => set("bg_radius", parseInt(e.target.value))}
              className="flex-1 accent-[#7c3aed]"
            />
            <span className="text-[#555] w-10 text-right flex-shrink-0" style={{ fontSize: 12 }}>{style.bg_radius}px</span>
          </Row>
        </>
      )}
    </div>
  );
}
