# Govinda — YouTube Shorts Generator

A local dashboard I built to generate YouTube Shorts at scale. You set up your music, video clips, hooks and CTAs once, then batch-generate as many variations as you want. Saves hours of manual editing.

## Features

- **Music tab** — manage background tracks and audio levels
- **Video Source tab** — pick and configure stock footage or personal clips
- **Hooks tab** — write and rotate opening hooks for variety
- **CTA tab** — attach call-to-action overlays to every video
- **Settings tab** — control output resolution, duration, and encoding
- **Generate tab** — kick off batch rendering
- **Output Gallery** — preview and export finished videos

## Tech stack

- Next.js 14 · React 18 · TypeScript
- Tailwind CSS
- Custom Swift renderer (`render_text.swift`) for text overlays
- Shell scripts for FFmpeg pipeline (`start.sh`)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Put your stock clips in `stock_videos/`, your music in `music/`, then configure and generate from the UI.
