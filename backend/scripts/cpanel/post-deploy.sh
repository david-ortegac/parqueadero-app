#!/usr/bin/env bash
# Ejecutar en el servidor (Cron / Terminal cPanel) tras sincronizar el código.
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPLOY_PATH"

echo "==> Despliegue en: $DEPLOY_PATH"

if [[ "$DEPLOY_PATH" == *"/Documentos/"* ]] || [[ "$DEPLOY_PATH" == *"/Documents/"* ]]; then
  echo "AVISO: parece entorno local, no cPanel. Abortando."
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: no existe .env en el servidor."
  exit 1
fi

bash "$DEPLOY_PATH/scripts/cpanel/fix-permissions.sh"

if command -v composer >/dev/null 2>&1; then
  # El tar ya trae vendor/; re-descubrir paquetes por si acaso.
  php artisan package:discover --ansi || true
else
  echo "AVISO: composer no está en PATH (OK si el tar incluye vendor/)."
fi

php artisan optimize:clear || true

if ! php artisan migrate --force; then
  echo ""
  echo "ERROR: migrate falló. Revisa DB_* en .env del servidor."
  echo "  En cPanel usa DB_HOST=127.0.0.1 (no la IP pública)."
  exit 1
fi

if grep -qE '^APP_ENV=production' .env || grep -qE '^APP_ENV=prod' .env; then
  php artisan config:cache
  # route:cache puede fallar con closures en web.php; no bloquear el deploy
  php artisan route:cache || php artisan route:clear || true
  php artisan view:cache || true
fi

echo ""
echo "Despliegue listo."
echo "Verifica: curl -sS https://parkingsoft.davidortega.dev/api/v1/me"
