import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        surface2: "#1a1a1a",
        border: "#222222",
        accent: "#7c3aed",
        "accent-hover": "#6d28d9",
        muted: "#555555",
      },
    },
  },
} satisfies Config;
