#!/bin/bash
# Govinda Launcher — starts the Next.js dev server and opens the browser

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3000

# Kill anything already on port 3000
lsof -ti tcp:$PORT | xargs kill -9 2>/dev/null

cd "$DIR"

# Start Next.js in background, log to /tmp/govinda.log
nohup npm run dev > /tmp/govinda.log 2>&1 &
SERVER_PID=$!

echo "Starting Govinda (PID $SERVER_PID)..."

# Wait until the server is ready (max 30s)
for i in $(seq 1 30); do
  if curl -s http://localhost:$PORT > /dev/null 2>&1; then
    echo "Ready."
    break
  fi
  sleep 1
done

# Open in browser
open http://localhost:$PORT

echo "Govinda is running. Close this window to keep it running in the background."
