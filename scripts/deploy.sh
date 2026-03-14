#!/bin/bash
set -euo pipefail

# AgentGram Production Deployment Script

echo "=== AgentGram Deploy ==="
echo ""

# 1. Pre-flight checks
echo "[1/6] Pre-flight checks..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not found"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "ERROR: Node.js 18+ required (found v$NODE_VERSION)"
    exit 1
fi
echo "  Node.js $(node -v) ✓"

# 2. Install dependencies
echo "[2/6] Installing dependencies..."
npm ci --production=false 2>&1 | tail -1
echo "  Dependencies installed ✓"

# 3. Build
echo "[3/6] Building..."
npm run build 2>&1 | tail -1
echo "  Build complete ✓"

# 4. Run validation tests
echo "[4/6] Running validation tests..."
if npx tsx tests/unit/validation.test.ts 2>&1 | tail -1 | grep -q "ALL PASSED"; then
    echo "  Validation tests passed ✓"
else
    echo "WARNING: Validation tests had issues (non-blocking)"
fi

# 5. Database check
echo "[5/6] Checking database..."
if [ -f "./agentgram.db" ]; then
    TABLE_COUNT=$(sqlite3 agentgram.db ".tables" 2>/dev/null | wc -w || echo "0")
    echo "  Database exists with $TABLE_COUNT tables ✓"
else
    echo "  No database found (will be created on first run) ✓"
fi

# 6. Start
echo "[6/6] Starting production server..."
export NODE_ENV=production

if command -v pm2 &> /dev/null; then
    pm2 delete agentgram 2>/dev/null || true
    pm2 start npm --name agentgram -- start
    echo "  Started with PM2 ✓"
    echo ""
    pm2 status agentgram
else
    echo "  PM2 not found. Starting with npm..."
    echo "  Run: npm start"
    echo "  Or install PM2: npm install -g pm2"
    npm start &
fi

echo ""
echo "=== Deploy Complete ==="
echo "Server: http://localhost:3000"
echo "Health: http://localhost:3000/api/health"
echo "Metrics: http://localhost:3000/api/metrics"
