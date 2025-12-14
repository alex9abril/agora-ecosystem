#!/bin/bash
# Script para compilar un proyecto específico
# Uso: ./scripts/build-project.sh <proyecto>

set -e

PROJECT=$1

if [ -z "$PROJECT" ]; then
    echo "❌ Error: Debes especificar un proyecto"
    echo "Uso: $0 <proyecto>"
    echo "Proyectos disponibles: backend, store-front, web-admin, web-cliente"
    exit 1
fi

PROJECT_PATH="apps/${PROJECT}"

if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Error: El proyecto no existe en $PROJECT_PATH"
    exit 1
fi

echo "🔨 Compilando proyecto: $PROJECT"
echo "📁 Directorio: $PROJECT_PATH"

cd "$PROJECT_PATH"

# Verificar si existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json en $PROJECT_PATH"
    exit 1
fi

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm ci

# Compilar
echo "🏗️  Compilando..."
npm run build

echo "✅ Compilación exitosa para $PROJECT"

