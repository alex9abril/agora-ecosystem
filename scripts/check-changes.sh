#!/bin/bash
# Script para detectar cambios en proyectos específicos del monorepo
# Uso: ./scripts/check-changes.sh <proyecto> [base-commit] [current-commit]

set -e

PROJECT=$1
BASE_COMMIT=${2:-HEAD~1}
CURRENT_COMMIT=${3:-HEAD}

if [ -z "$PROJECT" ]; then
    echo "❌ Error: Debes especificar un proyecto"
    echo "Uso: $0 <proyecto> [base-commit] [current-commit]"
    echo "Proyectos disponibles: backend, store-front, web-admin, web-cliente, web-local"
    exit 1
fi

# Obtener archivos cambiados
CHANGED_FILES=$(git diff --name-only $BASE_COMMIT $CURRENT_COMMIT 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
    # Si no hay cambios entre commits, verificar si es el primer commit
    if git rev-parse --verify $BASE_COMMIT >/dev/null 2>&1; then
        echo "false"
        exit 0
    else
        # Primer commit, asumir que hay cambios
        echo "true"
        exit 0
    fi
fi

# Verificar si hay cambios en el proyecto
case $PROJECT in
    backend)
        # Backend incluye también cambios en database/
        if echo "$CHANGED_FILES" | grep -qE "^(apps/backend/|database/)"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    store-front)
        if echo "$CHANGED_FILES" | grep -q "^apps/store-front/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    web-admin)
        if echo "$CHANGED_FILES" | grep -q "^apps/web-admin/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    web-cliente)
        if echo "$CHANGED_FILES" | grep -q "^apps/web-cliente/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    web-local)
        if echo "$CHANGED_FILES" | grep -q "^apps/web-local/"; then
            echo "true"
        else
            echo "false"
        fi
        ;;
    *)
        echo "❌ Error: Proyecto desconocido: $PROJECT"
        echo "Proyectos disponibles: backend, store-front, web-admin, web-cliente, web-local"
        exit 1
        ;;
esac

