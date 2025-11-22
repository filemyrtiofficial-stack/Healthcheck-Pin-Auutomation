#!/bin/bash

# Production build script
set -e

echo "🔨 Building production version..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build frontend
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "✅ Production build complete!"
echo ""
echo "To start the server:"
echo "  npm run server"
echo ""
echo "Or with PM2:"
echo "  pm2 start backend/server.js --name rti-healthcheck"

