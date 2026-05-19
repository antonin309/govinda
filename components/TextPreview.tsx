"use client";

import { TextStyle } from "@/lib/types";

interface Props {
  hook: string;
  style: TextStyle;
}

export default function TextPreview({ hook, style }: Props) {
  const lines = hook.split("\n").filter(Boolean);
  const fontFamily = style.font === "anton" ? '"Anton", Impact, sans-serif' : 'system-ui, -apple-system, sans-serif';
  const fontWeight = style.font === "anton" ? 400 : 700;

  // Scale relative to container width: font_size is in 1080px space → cqw = px/10.8
  const scaledSize = style.font_size / 10.8; // cqw units

  const textShadow = style.outline_width > 0
    ? `${style.outline_color} ${style.outline_width * 0.5}px ${style.outline_width * 0.5}px 0,
       ${style.outline_color} -${style.outline_width * 0.5}px -${style.outline_width * 0.5}px 0,
       ${style.outline_color} ${style.outline_width * 0.5}px -${style.outline_width * 0.5}px 0,
       ${style.outline_color} -${style.outline_width * 0.5}px ${style.outline_width * 0.5}px 0,
       ${style.outline_color} 0 ${style.outline_width * 0.5}px 0,
       ${style.outline_color} 0 -${style.outline_width * 0.5}px 0,
       ${style.outline_color} ${style.outline_width * 0.5}px 0 0,
       ${style.outline_color} -${style.outline_width * 0.5}px 0 0`
    : "none";

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-[#222]"
      style={{ aspectRatio: "9/16", background: "#111", containerType: "inline-size" }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)"
      }} />

      {!hook.trim() && (
        <div className="absolute inset-0 flex items-center justify-center text-[#333]" style={{ fontSize: 11 }}>
          Click a hook to preview
        </div>
      )}

      {/* Text positioned at style.position_y % from top */}
      {/* Safe zone: 8% padding each side (= ~86px on 1080px) */}
      <div
        className="absolute text-center"
        style={{
          left: "8%", right: "8%",
          top: `${style.position_y}%`,
          transform: "translateY(-50%)",
        }}
      >
        <div
          style={{
            display: "inline-block",
            background: style.bg_enabled ? style.bg_color : "transparent",
            borderRadius: style.bg_enabled ? `${(style.bg_radius / 1080) * 100}cqw` : 0,
            padding: style.bg_enabled
              ? `${(style.bg_padding / 1920) * 100}cqh ${(style.bg_padding * 1.5 / 1080) * 100}cqw`
              : 0,
          }}
        >
          {(lines.length > 0 ? lines : [hook]).map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily,
                fontWeight,
                fontSize: `${scaledSize}cqw`,
                color: style.color,
                textShadow: style.bg_enabled ? "none" : textShadow,
                lineHeight: 1.2,
                letterSpacing: style.font === "anton" ? "0.01em" : "normal",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
