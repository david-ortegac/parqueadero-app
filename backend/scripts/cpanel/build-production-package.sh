#!/usr/bin/env bash
# Genera tar.gz listo para cPanel (incluye vendor/ --no-dev, sin .env).
set -euo pipefail

API_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD_DIR="$API_DIR/build/package"
ARCHIVE_PATH="$API_DIR/parkingsoft-api-production.tar.gz"
STAMP="$(date +%Y%m%d-%H%M%S)"

cd "$API_DIR"

export COPYFILE_DISABLE=1
export COPY_EXTENDED_ATTRIBUTES_DISABLE=1

echo "==> Composer install (production)..."
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts
composer dump-autoload --optimize --no-dev --classmap-authoritative --no-scripts

echo "==> Preparando staging..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

rsync -a \
  --exclude 'build/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.env.backup' \
  --exclude '.env.production' \
  --exclude '.env.staging' \
  --exclude '.env.testing' \
  --exclude '.git/' \
  --exclude '.github/' \
  --exclude 'tests/' \
  --exclude 'node_modules/' \
  --exclude 'storage/logs/' \
  --exclude 'storage/framework/cache/data/' \
  --exclude 'storage/framework/sessions/' \
  --exclude 'storage/framework/views/' \
  --exclude 'storage/app/deploy/' \
  --exclude 'storage/app/private/' \
  --exclude 'storage/app/public/' \
  --exclude 'bootstrap/cache/*.php' \
  --exclude 'database/*.sqlite' \
  --exclude '.phpunit.result.cache' \
  --exclude '.phpunit.cache' \
  --exclude '*.zip' \
  --exclude '*.tar.gz' \
  --exclude 'parkingsoft-api-*.tar.gz' \
  --exclude 'backend.zip' \
  --exclude '_*' \
  --exclude '._*' \
  --exclude '.DS_Store' \
  --exclude 'Thumbs.db' \
  --exclude 'auth.json' \
  "$API_DIR/" "$BUILD_DIR/"

# Quitar basura AppleDouble por si rsync dejó algo
find "$BUILD_DIR" \( -name '._*' -o -name '.DS_Store' -o -name 'Thumbs.db' \) -delete 2>/dev/null || true

mkdir -p \
  "$BUILD_DIR/storage/framework/cache/data" \
  "$BUILD_DIR/storage/framework/sessions" \
  "$BUILD_DIR/storage/framework/views" \
  "$BUILD_DIR/storage/logs" \
  "$BUILD_DIR/storage/app/public" \
  "$BUILD_DIR/storage/app/private" \
  "$BUILD_DIR/bootstrap/cache"

# Conservar .env.example si existe
if [[ -f "$API_DIR/.env.example" ]]; then
  cp "$API_DIR/.env.example" "$BUILD_DIR/.env.example"
fi

cat > "$BUILD_DIR/DEPLOY-CPANEL.txt" <<EOF
ParkingSoft — API Laravel (producción)
Generado: ${STAMP}
Paquete: con vendor/ (--no-dev), sin .env local.

--- Despliegue automático ---
1. php artisan deploy:cpanel  (desde tu Mac)
2. Cron cPanel ejecuta cron-deploy-pending.sh (~1 min)

--- Manual (si hace falta) ---
1. Extrae parkingsoft-api-production.tar.gz en /home/davidort/parkingsoft
2. Conserva el .env del servidor
3. bash scripts/cpanel/post-deploy.sh

Health: curl -sS https://parkingsoft.davidortega.dev/api/v1/me
EOF

echo "==> Creando archivo..."
rm -f "$ARCHIVE_PATH"
find "$API_DIR" -maxdepth 1 -type f -name 'parkingsoft-api-*.tar.gz' ! -name 'parkingsoft-api-production.tar.gz' -delete || true
(
  cd "$BUILD_DIR/.."
  tar -czf "$ARCHIVE_PATH" package
)

rm -rf "$BUILD_DIR"

BYTES="$(wc -c < "$ARCHIVE_PATH" | tr -d ' ')"
MB="$(python3 -c "print(round(${BYTES}/1048576, 2))")"
echo ""
echo "Listo: $ARCHIVE_PATH (${MB} MB)"
echo "Siguiente: php artisan deploy:cpanel --skip-build"
