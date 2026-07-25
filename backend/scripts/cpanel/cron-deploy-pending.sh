#!/usr/bin/env bash
# Cron cPanel: si existe .deploy-pending, extrae el tar.gz y corre post-deploy.
#
# Cron (cada minuto):
#   /bin/bash -c 'test -f /home/davidort/parkingsoft/cron-deploy-pending.sh && exec /bin/bash /home/davidort/parkingsoft/cron-deploy-pending.sh'
#
# Disparo: php artisan deploy:cpanel
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [[ -f "$SCRIPT_DIR/artisan" ]]; then
  DEPLOY_PATH="$SCRIPT_DIR"
elif [[ -f "$SCRIPT_DIR/../../artisan" ]]; then
  DEPLOY_PATH="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
  DEPLOY_PATH="${DEPLOY_PATH:-/home/davidort/parkingsoft}"
fi

FLAG="${DEPLOY_PATH}/.deploy-pending"
ARCHIVE="${DEPLOY_PATH}/parkingsoft-api-production.tar.gz"
LOCK="${DEPLOY_PATH}/.deploy.lock"
LOG_DIR="${DEPLOY_PATH}/storage/logs"
LOG="${LOG_DIR}/deploy-cron.log"
STATUS="${DEPLOY_PATH}/.deploy-last-status"

if [[ ! -f "$FLAG" ]]; then
  exit 0
fi

case "$DEPLOY_PATH" in
  */Documents/*|*/Documentos/*)
    echo "ERROR: cron-deploy-pending.sh no debe correr en local ($DEPLOY_PATH)" >&2
    exit 1
    ;;
esac

mkdir -p "$LOG_DIR" "$DEPLOY_PATH"
exec 9>"$LOCK"
if ! flock -n 9; then
  exit 0
fi

log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" | tee -a "$LOG"
}

fail() {
  log "ERROR: $*"
  echo "failed $(date -u +%Y-%m-%dT%H:%M:%SZ) $*" > "$STATUS"
  exit 1
}

{
  log "=== deploy pendiente detectado ==="
  log "DEPLOY_PATH=$DEPLOY_PATH"

  if [[ ! -f "$ARCHIVE" ]]; then
    fail "no existe $ARCHIVE (sube el paquete con php artisan deploy:cpanel)"
  fi

  if [[ ! -f "${DEPLOY_PATH}/.env" ]]; then
    fail "falta .env en el servidor; créalo antes del primer deploy automático"
  fi

  TMP="$(mktemp -d "${DEPLOY_PATH}/.deploy-extract.XXXXXX")"
  cleanup() { rm -rf "$TMP"; }
  trap cleanup EXIT

  log "Extrayendo $(basename "$ARCHIVE")..."
  tar -xzf "$ARCHIVE" -C "$TMP"

  log "Eliminando paquete comprimido tras extract..."
  rm -f -- "$ARCHIVE" \
    "${DEPLOY_PATH}/parkingsoft-api-production.tar" \
    "${DEPLOY_PATH}/parkingsoft-api-production.tar.gz" || true
  find "$DEPLOY_PATH" -maxdepth 1 -type f \( \
    -name 'parkingsoft-api-production.tar' \
    -o -name 'parkingsoft-api-production.tar.gz' \
    -o -name 'parkingsoft-api-*.tar.gz' \
    -o -name 'parkingsoft-api-*.tar' \
  \) -delete 2>/dev/null || true

  SRC=""
  if [[ -d "${TMP}/package" ]]; then
    SRC="${TMP}/package"
  elif [[ -f "${TMP}/artisan" ]]; then
    SRC="$TMP"
  else
    FIRST_DIR="$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n 1 || true)"
    if [[ -n "${FIRST_DIR}" && -f "${FIRST_DIR}/artisan" ]]; then
      SRC="$FIRST_DIR"
    else
      fail "estructura del tar desconocida (se esperaba package/)"
    fi
  fi

  log "Sincronizando desde $SRC (protege .env y storage vivo)..."
  rsync -a \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.backup' \
    --exclude '.env.production' \
    --exclude '.deploy-pending' \
    --exclude '.deploy.lock' \
    --exclude '.deploy-last-status' \
    --exclude '.deploy-extract.*' \
    --exclude '*.tar.gz' \
    --exclude '*.tar' \
    --exclude '*.zip' \
    --exclude '_*' \
    --exclude '._*' \
    --exclude 'storage/logs/*' \
    --exclude 'storage/framework/cache/data/*' \
    --exclude 'storage/framework/sessions/*' \
    --exclude 'storage/framework/views/*' \
    --exclude 'storage/app/private/*' \
    --exclude 'storage/app/public/*' \
    --exclude 'bootstrap/cache/*.php' \
    --exclude 'database/*.sqlite' \
    "${SRC}/" "${DEPLOY_PATH}/"

  mkdir -p \
    "${DEPLOY_PATH}/storage/framework/views" \
    "${DEPLOY_PATH}/storage/framework/cache/data" \
    "${DEPLOY_PATH}/storage/framework/sessions" \
    "${DEPLOY_PATH}/storage/logs" \
    "${DEPLOY_PATH}/bootstrap/cache"

  if [[ -f "${DEPLOY_PATH}/scripts/cpanel/cron-deploy-pending.sh" ]]; then
    chmod +x "${DEPLOY_PATH}/scripts/cpanel/cron-deploy-pending.sh" || true
  fi
  if [[ -f "${DEPLOY_PATH}/scripts/cpanel/post-deploy.sh" ]]; then
    chmod +x "${DEPLOY_PATH}/scripts/cpanel/post-deploy.sh" || true
  fi

  log "Ejecutando post-deploy.sh..."
  DEPLOY_PATH="$DEPLOY_PATH" bash "${DEPLOY_PATH}/scripts/cpanel/post-deploy.sh"

  rm -f "$FLAG"

  ROOT_CRON="${DEPLOY_PATH}/cron-deploy-pending.sh"
  log "Eliminando bootstrap del cron: $ROOT_CRON"
  rm -f -- "$ROOT_CRON" || true

  log "Eliminando rastros del deploy (package/, zips)..."
  find "$DEPLOY_PATH" -maxdepth 1 -type f \( -name '*.tar.gz' -o -name '*.tar' -o -name '*.zip' -o -name 'parkingsoft-api-*' \) -delete 2>/dev/null || true
  if [[ -d "${DEPLOY_PATH}/package" ]]; then
    rm -rf -- "${DEPLOY_PATH}/package" || true
  fi

  log "Limpiando _* y ._* ..."
  find "$DEPLOY_PATH" -depth \
    ! -path "${DEPLOY_PATH}/vendor" \
    ! -path "${DEPLOY_PATH}/vendor/*" \
    ! -path "${DEPLOY_PATH}/node_modules" \
    ! -path "${DEPLOY_PATH}/node_modules/*" \
    \( -type f -o -type d \) \( -name '_*' -o -name '._*' \) \
    -exec rm -rf {} + 2>/dev/null || true

  rm -f -- "$ROOT_CRON" || true
  echo "ok $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$STATUS"
  log "=== deploy OK ==="
} >>"$LOG" 2>&1
