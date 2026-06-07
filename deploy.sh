#!/bin/bash
# AI GrowthOS Enterprise — Cloudflare Deployment Script
# Prerequisites:
#   1. Set CLOUDFLARE_API_TOKEN in .env (get from https://dash.cloudflare.com/profile/api-tokens)
#   2. Set CLOUDFLARE_ACCOUNT_ID in .env
#   3. Run: source .env && bash deploy.sh

set -e

echo "🚀 AI GrowthOS Enterprise — Cloudflare Deployment"
echo "================================================="

# Load .env
export $(grep -v '^#' .env | xargs) 2>/dev/null || true

if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN not set. Add it to .env"
  exit 1
fi

# ── 1. Build frontend ─────────────────────────────────────────────────────────
echo ""
echo "📦 Building frontend..."
cd frontend && npm install && npm run build && cd ..

# ── 2. Deploy frontend to Cloudflare Pages ────────────────────────────────────
echo ""
echo "🌐 Deploying frontend to Cloudflare Pages..."
wrangler pages deploy frontend/dist --project-name ai-growthos --branch main

# ── 3. Create D1 database (skip if exists) ────────────────────────────────────
echo ""
echo "🗄️  Setting up D1 database..."
cd worker
wrangler d1 create growthos 2>/dev/null || echo "D1 'growthos' already exists, skipping"

# ── 4. Run migrations ────────────────────────────────────────────────────────
echo ""
echo "🔄 Running D1 migrations..."
wrangler d1 execute growthos --remote --file=migrations/0001_initial.sql

# ── 5. Set secrets ────────────────────────────────────────────────────────────
echo ""
echo "🔐 Setting API secrets..."
echo "$GLM_API_KEY" | wrangler secret put GLM_API_KEY
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo "$ANTHROPIC_API_KEY" | wrangler secret put ANTHROPIC_API_KEY
fi

# ── 6. Deploy worker ─────────────────────────────────────────────────────────
echo ""
echo "⚡ Deploying API worker..."
wrangler deploy src/index.js
cd ..

echo ""
echo "✅ Deployment complete!"
echo "   Frontend: https://ai-growthos.pages.dev"
echo "   API:      https://ai-growthos-api.<your-subdomain>.workers.dev"
