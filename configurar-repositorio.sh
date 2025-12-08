#!/bin/bash
# Script para configurar el repositorio Git con token
# Ejecuta: bash configurar-repositorio.sh

echo "🔧 Configurando repositorio Git..."

# Token de GitHub
# IMPORTANTE: no dejes tu token fijo en este archivo. Pásalo como variable de entorno:
#   export GITHUB_TOKEN="tu_token_aqui"
TOKEN="${GITHUB_TOKEN}"

# Solicitar información del repositorio
echo ""
echo "📋 Necesito la información de tu repositorio:"
read -p "Usuario de GitHub (ej: tu-usuario): " USUARIO
read -p "Nombre del repositorio (ej: flipbook-catalog): " REPOSITORIO

# Construir URL
URL="https://${TOKEN}@github.com/${USUARIO}/${REPOSITORIO}.git"

echo ""
echo "🔗 URL configurada: https://github.com/${USUARIO}/${REPOSITORIO}.git"

# Configurar remoto
echo ""
echo "⚙️ Configurando remoto..."
git remote add origin "$URL"

# Verificar
echo ""
echo "✅ Verificando configuración..."
git remote -v

echo ""
echo "✅ ¡Repositorio configurado!"
echo ""
echo "📝 Próximos pasos:"
echo "   1. git add ."
echo "   2. git commit -m 'Initial commit'"
echo "   3. git branch -M main"
echo "   4. git push -u origin main"

echo ""
echo "⚠️  IMPORTANTE: Revoca este token después de usarlo en:"
echo "   https://github.com/settings/tokens"

