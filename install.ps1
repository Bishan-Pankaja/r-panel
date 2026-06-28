# R-Panel One-Click Setup Script for Windows/PowerShell
# This script installs Docker, PostgreSQL, Node.js, and sets up R-Panel

Write-Host "🚀 Starting R-Panel Installation..." -ForegroundColor Green

# Check if running as Administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  Please run this script as Administrator" -ForegroundColor Yellow
    exit 1
}

# Install Chocolatey if not present
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Chocolatey..." -ForegroundColor Cyan
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

# Install Docker Desktop
Write-Host "🐳 Installing Docker Desktop..." -ForegroundColor Cyan
choco install docker-desktop -y

# Install Git
Write-Host "📦 Installing Git..." -ForegroundColor Cyan
choco install git -y

# Install Node.js
Write-Host "📦 Installing Node.js..." -ForegroundColor Cyan
choco install nodejs -y

# Install pnpm
Write-Host "📦 Installing pnpm..." -ForegroundColor Cyan
npm install -g pnpm

# Clone repository (replace with actual repo URL after creation)
Write-Host "📥 Cloning R-Panel repository..." -ForegroundColor Cyan
$installPath = "C:\r-panel"
if (Test-Path $installPath) {
    Remove-Item -Path $installPath -Recurse -Force
}
git clone https://github.com/Bishan-Pankaja/r-panel.git $installPath
Set-Location $installPath

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
pnpm install

# Setup environment variables
Write-Host "⚙️ Setting up environment..." -ForegroundColor Cyan
if (-not (Test-Path .env)) {
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
    } else {
        "DATABASE_URL=postgresql://postgres:password@localhost:5432/rpanel" | Out-File -FilePath .env -Encoding utf8
    }
    Write-Host "⚠️  Please update .env with your database credentials" -ForegroundColor Yellow
}

# Run database migrations
Write-Host "🗄️ Running database migrations..." -ForegroundColor Cyan
$env:DATABASE_URL = (Get-Content .env | Select-String "DATABASE_URL").ToString().Split("=")[1]
if ($env:DATABASE_URL) {
    # Add new columns for subscription support
    # Note: You'll need PostgreSQL client tools installed to run this
    Write-Host "⚠️  Please manually run these SQL commands on your database:" -ForegroundColor Yellow
    Write-Host "ALTER TABLE ""user"" ADD COLUMN IF NOT EXISTS ""subscriptionTier"" text;" -ForegroundColor Cyan
    Write-Host "ALTER TABLE ""user"" ADD COLUMN IF NOT EXISTS ""subscriptionEndDate"" timestamp;" -ForegroundColor Cyan
    
    # Run drizzle migrations
    pnpm drizzle-kit migrate --config=apps/dokploy/server/db/drizzle.config.ts
} else {
    Write-Host "⚠️  DATABASE_URL not set. Please configure it in .env and run migrations manually." -ForegroundColor Yellow
}

# Build application
Write-Host "🔨 Building application..." -ForegroundColor Cyan
pnpm build

# Start application with Docker
Write-Host "🚀 Starting R-Panel..." -ForegroundColor Cyan
docker-compose up -d

Write-Host "✅ R-Panel installation complete!" -ForegroundColor Green
Write-Host "🌐 Access your panel at http://localhost:3000" -ForegroundColor Cyan
Write-Host "📝 Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Update .env with your database credentials" -ForegroundColor Cyan
Write-Host "   2. Configure your domain name" -ForegroundColor Cyan
Write-Host "   3. Set up SSL certificates" -ForegroundColor Cyan
