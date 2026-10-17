#!/usr/bin/env bash
set -e

export PATH=$PATH:/opt/homebrew/bin:/usr/local/bin

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "☕✨ Setting up Sugar & Sizzle — Hot Honey & Chili Co. POS..."
echo "📂 Project root: $ROOT_DIR"

# 1. Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not found in PATH. Please install Node.js (>= 18)."
  exit 1
fi
echo "✅ Node.js: $(node -v)"

# 2. Check / Start MongoDB
if command -v brew >/dev/null 2>&1; then
  if ! brew services list | grep -q "mongodb-community.*started"; then
    echo "⚡ Starting local MongoDB Community service..."
    brew services start mongodb-community || true
  fi
fi

# 3. Environment files
if [ ! -f "$ROOT_DIR/backend/.env" ]; then
  echo "📝 Creating backend/.env from template..."
  cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
  # Ensure PORT=5001 on macOS
  sed -i '' 's/PORT=5000/PORT=5001/' "$ROOT_DIR/backend/.env" 2>/dev/null || true
fi

if [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
  echo "📝 Creating frontend/.env.local from template..."
  cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env.local"
  sed -i '' 's/5000/5001/' "$ROOT_DIR/frontend/.env.local" 2>/dev/null || true
fi

# 4. Install backend dependencies
echo "📦 Installing backend dependencies (backend)..."
cd "$ROOT_DIR/backend"
npm install --silent

# 5. Install frontend dependencies
echo "📦 Installing frontend dependencies (frontend)..."
cd "$ROOT_DIR/frontend"
npm install --silent

# 6. Seed Database
echo "🌱 Seeding database with demo café menu, tables, users, shifts & orders..."
cd "$ROOT_DIR/backend"
npm run seed

# 7. Run backend test suite
echo "🧪 Running backend test verification..."
cd "$ROOT_DIR/backend"
MONGODB_URI_TEST=mongodb://127.0.0.1:27017/restoflow_test npm test

echo ""
echo "✨ All systems verified! You are ready to slay!"
echo "🚀 Run 'npm run dev' to start both the Backend API and Frontend POS."
echo "   - Frontend POS: http://localhost:3000"
echo "   - Backend API:  http://localhost:5001/api/health"
echo "   - API Docs:   http://localhost:5001/api/docs"
echo ""
echo "🔑 Demo Credentials (Login with User ID or Email):"
echo "   - 👑 Admin:   admin   (admin@sugarsizzle.com)   / Admin@123"
echo "   - 💵 Cashier: cashier (cashier@sugarsizzle.com) / Cashier@123"
echo "   - 👨‍🍳 Chef:    chef    (chef@sugarsizzle.com)    / Chef@123"
echo "   - 🧾 Staff:   staff   (staff@sugarsizzle.com)   / Staff@123"
echo "   - 📋 Manager: manager (manager@sugarsizzle.com) / Manager@123"
echo ""
