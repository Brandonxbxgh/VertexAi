#!/bin/bash
# Run this ON THE SERVER after: ssh root@46.225.165.253
# One-time: chmod +x ~/vertex/deploy.sh
# Then: ~/vertex/deploy.sh

set -e
cd ~/vertex
git pull origin main
cd bot
npm install
npm run build
pm2 delete vertex-arbitrage 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
echo "---"
pm2 logs vertex-arbitrage --lines 15 --nostream
