#!/usr/bin/env bash
set -e

export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  echo ""
  echo "🛑 Stopping Sugar & Sizzle services..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo "🍯🔥 Starting Sugar & Sizzle — Hot Honey & Chili Co. Full Stack..."

# Clean up stale processes on ports 5001 and 3000 if any exist
if lsof -ti :5001 >/dev/null 2>&1; then
  echo "⚡ Port 5001 was occupied. Releasing port for new server instance..."
  lsof -ti :5001 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

if lsof -ti :3000 >/dev/null 2>&1; then
  echo "⚡ Port 3000 was occupied. Releasing port for new web instance..."
  lsof -ti :3000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "☕ Starting Backend API on http://localhost:5001..."
(cd "$ROOT_DIR/backend" && npm run dev) &
BACKEND_PID=$!

echo "⚡ Starting Next.js Frontend POS on http://localhost:3000..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
