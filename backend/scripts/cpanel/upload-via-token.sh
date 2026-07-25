#!/usr/bin/env bash
# Sube el .tar.gz (+ cron + .deploy-pending) a cPanel con API token.
# Docs: https://docs.cpanel.net/knowledge-base/security/how-to-use-cpanel-api-tokens/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

CPANEL_HOST="${CPANEL_HOST:?Define CPANEL_HOST}"
CPANEL_USER="${CPANEL_USER:-davidort}"
CPANEL_API_TOKEN="${CPANEL_API_TOKEN:?Define CPANEL_API_TOKEN (cPanel → Security → Manage API Tokens)}"
CPANEL_PORT="${CPANEL_PORT:-2083}"
REMOTE_DIR="${REMOTE_DIR:-/home/${CPANEL_USER}/parkingsoft}"
PACKAGE_PATH="${PACKAGE_PATH:-$API_DIR/parkingsoft-api-production.tar.gz}"
BUILD_PACKAGE="${BUILD_PACKAGE:-false}"
UPLOAD_PENDING_FLAG="${UPLOAD_PENDING_FLAG:-true}"
SKIP_CRON_SCRIPT="${SKIP_CRON_SCRIPT:-false}"

UPLOAD_URL="https://${CPANEL_HOST}:${CPANEL_PORT}/execute/Fileman/upload_files"
AUTH_HEADER="Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}"

upload_file() {
  local local_path="$1"
  local name
  name="$(basename "$local_path")"
  echo "==> Subiendo ${name} → ${REMOTE_DIR} (overwrite=1)"
  local response
  response="$(curl -fsS \
    -H "$AUTH_HEADER" \
    -H "Accept: application/json" \
    -F "dir=${REMOTE_DIR}" \
    -F "overwrite=1" \
    -F "file-1=@${local_path}" \
    "$UPLOAD_URL")" || {
    echo "ERROR: fallo al llamar Fileman::upload_files ($name)"
    echo "Comprueba host, usuario, token, Imunify360 allowlist y puerto ${CPANEL_PORT}."
    return 1
  }
  echo "$response" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except Exception:
    print(raw)
    sys.exit(0)
if "Imunify" in str(data.get("message", "")):
    print("ERROR Imunify360:", data["message"], file=sys.stderr)
    sys.exit(1)
status = data.get("status", data.get("result", {}).get("status"))
errors = data.get("errors") or data.get("result", {}).get("errors")
print(json.dumps(data, indent=2)[:1500])
if status in (0, "0", False):
    print("ERROR: cPanel reportó fallo:", errors, file=sys.stderr)
    sys.exit(1)
print("Subida OK.")
'
}

if [[ "$BUILD_PACKAGE" == "true" || "$BUILD_PACKAGE" == "1" ]]; then
  echo "==> Generando paquete de producción..."
  bash "$SCRIPT_DIR/build-production-package.sh"
  if [[ -f "$API_DIR/composer.json" ]]; then
    echo "==> Restaurando composer (dev) en local..."
    (cd "$API_DIR" && composer install --no-interaction)
  fi
fi

if [[ ! -f "$PACKAGE_PATH" ]]; then
  echo "ERROR: no existe $PACKAGE_PATH"
  echo "Ejecuta: bash scripts/cpanel/build-production-package.sh"
  exit 1
fi

upload_file "$PACKAGE_PATH"

if [[ "$SKIP_CRON_SCRIPT" != "true" && "$SKIP_CRON_SCRIPT" != "1" ]]; then
  CRON_SRC="$SCRIPT_DIR/cron-deploy-pending.sh"
  if [[ -f "$CRON_SRC" ]]; then
    upload_file "$CRON_SRC"
  fi
fi

if [[ "$UPLOAD_PENDING_FLAG" == "true" || "$UPLOAD_PENDING_FLAG" == "1" ]]; then
  FLAG_TMP="$(mktemp)"
  {
    echo "pending"
    echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "host=$(hostname 2>/dev/null || echo unknown)"
    echo "package=$(basename "$PACKAGE_PATH")"
  } > "$FLAG_TMP"
  echo "==> Subiendo .deploy-pending (dispara Cron) → ${REMOTE_DIR}"
  RESPONSE="$(curl -fsS \
    -H "$AUTH_HEADER" \
    -H "Accept: application/json" \
    -F "dir=${REMOTE_DIR}" \
    -F "overwrite=1" \
    -F "file-1=@${FLAG_TMP};filename=.deploy-pending" \
    "$UPLOAD_URL")" || {
    rm -f "$FLAG_TMP"
    echo "ERROR: no se pudo subir .deploy-pending"
    exit 1
  }
  rm -f "$FLAG_TMP"
  echo "$RESPONSE" | python3 -c '
import json, sys
raw = sys.stdin.read()
try:
    data = json.loads(raw)
except Exception:
    print(raw); sys.exit(0)
if "Imunify" in str(data.get("message", "")):
    print("ERROR Imunify360:", data["message"], file=sys.stderr); sys.exit(1)
status = data.get("status", data.get("result", {}).get("status"))
print(json.dumps(data, indent=2)[:800])
if status in (0, "0", False):
    sys.exit(1)
print("Flag .deploy-pending subido.")
'
fi

echo ""
echo "Listo. Si el Cron está activo, extract + post-deploy en ~1 minuto."
echo "  Cron: /bin/bash -c 'test -f ${REMOTE_DIR}/cron-deploy-pending.sh && exec /bin/bash ${REMOTE_DIR}/cron-deploy-pending.sh'"
echo "  Log:  ${REMOTE_DIR}/storage/logs/deploy-cron.log"
echo "  Health: curl -sS https://parkingsoft.davidortega.dev/api/v1/me"
