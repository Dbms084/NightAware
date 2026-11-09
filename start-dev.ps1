# NightAware — Dev launcher
# Run this script from the project root to start the Expo dev server.
# Usage: Right-click > "Run with PowerShell"  OR  .\start-dev.ps1 in a terminal.

$nodePath = "C:\Program Files\nodejs"
$env:PATH = "$nodePath;" + $env:PATH

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  NightAware - Expo Dev Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Node:  $(& "$nodePath\node.exe" --version)" -ForegroundColor Green
Write-Host "npm:   $(& "$nodePath\npm.cmd" --version)" -ForegroundColor Green
Write-Host ""

# Detect Android SDK
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidSdk) {
    $env:ANDROID_HOME = $androidSdk
    $env:PATH = "$androidSdk\platform-tools;" + $env:PATH
    Write-Host "Android SDK: $androidSdk" -ForegroundColor Green
    Write-Host ""
    Write-Host "Starting Expo (Android emulator mode)..." -ForegroundColor Yellow
    & "$nodePath\npx.cmd" expo start --android
} else {
    Write-Host "Android SDK not found — starting in Expo Go / QR mode." -ForegroundColor Yellow
    Write-Host "Install Expo Go on your phone: https://expo.dev/go" -ForegroundColor Gray
    Write-Host ""
    & "$nodePath\npx.cmd" expo start
}

