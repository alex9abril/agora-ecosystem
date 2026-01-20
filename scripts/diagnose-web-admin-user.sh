#!/usr/bin/env bash

set -euo pipefail

EMAIL="${1:-alex9abril@gmail.com}"
SQL_FILE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/database/diagnostics/diagnose_web_admin_login_user.sql"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_ENV_FILE="$ROOT_DIR/apps/backend/.env"

if [[ -z "${DATABASE_URL:-}" && -f "$BACKEND_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$BACKEND_ENV_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL no está configurado."
  echo "   Exporta DATABASE_URL o agrega DATABASE_URL en apps/backend/.env y vuelve a intentar."
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "❌ No se encontró el script SQL: $SQL_FILE"
  exit 1
fi

echo "▶ Ejecutando diagnóstico para: $EMAIL"

# Reemplazar email en memoria y ejecutar el script
sed "s/alex9abril@gmail.com/${EMAIL}/g" "$SQL_FILE" | psql "$DATABASE_URL"
