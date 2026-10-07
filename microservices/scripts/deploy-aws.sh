#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "☁️ Desplegando Arquitectura Serverless en AWS..."
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1. Compilar todos los microservicios
echo "📦 Paso 1: Asegurando empaquetado de todos los microservicios..."
"$ROOT_DIR/scripts/build-all.sh"

# 2. Despliegue con AWS SAM
echo ""
echo "🚀 Paso 2: Ejecutando AWS SAM Build & Deploy..."
cd "$ROOT_DIR"

if command -v sam &> /dev/null; then
  echo "SAM CLI detectado. Ejecutando despliegue guiado o automático..."
  sam build
  sam deploy --guided
else
  echo "⚠️ AWS SAM CLI no está instalado en el PATH."
  echo "Para instalarlo: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
  echo ""
  echo "Alternativa: Puedes subir manualmente los zips generados en cada microservicio:"
  echo " - ms_parking_rates_config/releases/ms-parking-rates-config-v1.0.0.zip"
  echo " - ms_parking_auth/releases/ms-parking-auth-v1.0.0.zip"
  echo " - ms_parking_vehicles/releases/ms-parking-vehicles-v1.0.0.zip"
  echo " - ms_parking_sessions/releases/ms-parking-sessions-v1.0.0.zip"
  echo " - ms_parking_notifications/releases/ms-parking-notifications-v1.0.0.zip"
  echo ""
  echo "O utilizar CloudFormation / AWS CLI con el template: microservices/template.yaml"
fi
