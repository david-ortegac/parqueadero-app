#!/usr/bin/env bash
set -e

echo "=========================================="
echo "🚀 Compilando todos los microservicios..."
echo "=========================================="

SERVICES=(
  "ms_parking_rates_config"
  "ms_parking_auth"
  "ms_parking_vehicles"
  "ms_parking_sessions"
  "ms_parking_notifications"
)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for SERVICE in "${SERVICES[@]}"; do
  echo ""
  echo "📦 Compilando $SERVICE..."
  cd "$ROOT_DIR/$SERVICE"
  npm run package
  echo "✅ $SERVICE compilado y empaquetado."
done

echo ""
echo "=========================================="
echo "🎉 Todos los microservicios fueron compilados exitosamente!"
echo "=========================================="
