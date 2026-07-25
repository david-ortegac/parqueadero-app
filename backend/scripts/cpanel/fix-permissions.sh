#!/usr/bin/env bash
# Permisos típicos en cPanel (usuario del hosting, no root).
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

echo "Ajustando permisos en $DEPLOY_PATH ..."
mkdir -p \
  storage/framework/cache/data \
  storage/framework/sessions \
  storage/framework/views \
  storage/logs \
  storage/app/public \
  storage/app/private \
  bootstrap/cache

chmod -R u+rwX,go+rX storage bootstrap/cache database 2>/dev/null || true
chmod -R u+rwX storage bootstrap/cache 2>/dev/null || true

echo "Permisos listos."
