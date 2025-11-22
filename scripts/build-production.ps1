# Production build script for Windows
$ErrorActionPreference = "Stop"

Write-Host "🔨 Building production version..." -ForegroundColor Cyan

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install

# Build frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
npm run build
Set-Location ..

Write-Host "✅ Production build complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start the server:" -ForegroundColor Cyan
Write-Host "  npm run server" -ForegroundColor White
Write-Host ""
Write-Host "Or with PM2:" -ForegroundColor Cyan
Write-Host "  pm2 start backend/server.js --name rti-healthcheck" -ForegroundColor White

