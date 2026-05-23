# Govinda — Content Generator

I was running YouTube Shorts channels and editing every video manually was taking forever. I built a local dashboard where I set up my music, hooks, and video clips and it generates various combinations automatically. 

It can break down long videos into individual content pieces and testing numerous variations with different music and hooks. Useful for A/B testing in ads. 

**Learned:** Next.js, TypeScript, FFmpeg pipeline, had to write a custom Swift script for text rendering

## Features

- **Music tab** — manage background tracks and audio levels
- **Video Source tab** — pick e stock footage or personal clips
- **Hooks tab** — write opening hooks for variety
- **CTA tab** — attach call-to-action overlays to every video
- **Settings tab** — control output resolution, duration, and encoding
- **Generate tab** — kick off batch rendering
- **Output Gallery** — preview and export finished videos

## Tech stack

- Next.js 14 · React 18 · TypeScript
- Tailwind CSS
- Custom Swift renderer (`render_text.swift`) for text overlays
- Shell scripts for FFmpeg pipeline (`start.sh`)
