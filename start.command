#!/bin/bash
cd "$(dirname "$0")"

# If already running, just open browser
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  open http://localhost:3000
  exit 0
fi
if curl -s http://localhost:3001 > /dev/null 2>&1; then
  open http://localhost:3001
  exit 0
fi

# Start server in background
npm run dev > /tmp/shorts-bot.log 2>&1 &

# Wait until ready (max 30s)
for i in {1..30}; do
  for port in 3000 3001 3002; do
    if curl -s http://localhost:$port > /dev/null 2>&1; then
      open http://localhost:$port
      wait
      exit 0
    fi
  done
  sleep 1
done

echo "Server konnte nicht gestartet werden. Log: /tmp/shorts-bot.log"
