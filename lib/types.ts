export interface Segment {
  start: number;
  end: number;
}

export interface MusicEntry {
  segments: Segment[];
  enabled?: boolean;
}

export interface TextStyle {
  font: "anton" | "system-bold";   // extendable
  font_size: number;                // px, e.g. 56
  color: string;                    // hex e.g. "#ffffff"
  outline_color: string;            // hex e.g. "#000000"
  outline_width: number;            // 0–20
  position_y: number;               // 0–100, % from top (default ~17 = H/6)
  bg_enabled: boolean;              // text background box
  bg_auto: boolean;                 // auto-detect brightness → decide bg per video
  bg_color: string;                 // hex e.g. "#ffffff"
  bg_padding: number;               // px padding around text
  bg_radius: number;                // corner radius px
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  font: "anton",
  font_size: 56,
  color: "#ffffff",
  outline_color: "#000000",
  outline_width: 5,
  position_y: 17,
  bg_enabled: false,
  bg_auto: false,
  bg_color: "#ffffff",
  bg_padding: 14,
  bg_radius: 10,
};

export function resolveStyle(global: TextStyle, override?: Partial<TextStyle>): TextStyle {
  return { ...global, ...(override ?? {}) };
}

export interface LongVideoConfig {
  file: string | null;
  markers: number[];           // seconds from start
  clip_duration_min: number;  // default 12
  clip_duration_max: number;  // default 14
  use_original_audio: boolean;
}

export const DEFAULT_LONG_VIDEO: LongVideoConfig = {
  file: null,
  markers: [],
  clip_duration_min: 12,
  clip_duration_max: 14,
  use_original_audio: false,
};

export interface Settings {
  video_duration_min: number;
  video_duration_max: number;
  music_volume: number;
  sin_trim_start: number;
  sin_max_duration: number;
  sin_start_times: number[];
  sin_start_mode?: "fixed" | "random";
  sin_start_random_min?: number;
  sin_start_random_max?: number;
  hooks_disabled?: number[];
  active_cta?: string | null;
  text_style?: TextStyle;
  hook_styles?: Record<number, Partial<TextStyle>>;
  source_mode?: "stock" | "longvideo";
}

export interface Config {
  hooks: string[];
  hook_pools?: Record<string, string[]>;  // named hook pools, e.g. { "Finance": [...], "Motivation": [...] }
  active_pool?: string;                   // which pool is active (null = use legacy hooks[])
  music: Record<string, MusicEntry>;
  settings: Settings;
  long_video?: LongVideoConfig;
}
