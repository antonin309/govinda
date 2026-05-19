# Govinda — YouTube Shorts Generator

A local dashboard I built to generate clips for ads or content pieces. You set up your music (with custom start points), video clips, and hooks — then batch-generate as many combinations as you want. Saves hours of manual editing.

The next version will support breaking long videos into individual content pieces and testing numerous variations with different music and hooks — useful for A/B testing in ads.

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
