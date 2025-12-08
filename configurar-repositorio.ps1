# Script para configurar el repositorio Git con token
# Ejecuta: .\configurar-repositorio.ps1

Write-Host "🔧 Configurando repositorio Git..." -ForegroundColor Cyan

# Token de GitHub
# IMPORTANTE: no dejes tu token fijo en este archivo. Define la variable en la terminal:
#   $env:GITHUB_TOKEN="tu_token_aqui"
$token = $env:GITHUB_TOKEN

# Solicitar información del repositorio
Write-Host "`n📋 Necesito la información de tu repositorio:" -ForegroundColor Yellow
$usuario = Read-Host "Usuario de GitHub (ej: tu-usuario)"
$repositorio = Read-Host "Nombre del repositorio (ej: flipbook-catalog)"

# Construir URL
$url = "https://${token}@github.com/${usuario}/${repositorio}.git"

Write-Host "`n🔗 URL configurada: https://github.com/${usuario}/${repositorio}.git" -ForegroundColor Green

# Configurar remoto
Write-Host "`n⚙️ Configurando remoto..." -ForegroundColor Cyan
git remote add origin $url

# Verificar
Write-Host "`n✅ Verificando configuración..." -ForegroundColor Cyan
git remote -v

Write-Host "`n✅ ¡Repositorio configurado!" -ForegroundColor Green
Write-Host "`n📝 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. git add ." -ForegroundColor White
Write-Host "   2. git commit -m 'Initial commit'" -ForegroundColor White
Write-Host "   3. git branch -M main" -ForegroundColor White
Write-Host "   4. git push -u origin main" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANTE: Revoca este token después de usarlo en:" -ForegroundColor Red
Write-Host "   https://github.com/settings/tokens" -ForegroundColor Red

