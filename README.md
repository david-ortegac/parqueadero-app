# Parqueadero (monorepo)

Aplicación móvil/PWA con **Ionic + Angular** y API **Laravel 12** (Sanctum) para administración de tarifas, operación de ingreso/salida, reportes y portal de propietarios con privacidad por usuario.

## Estructura

- `backend/`: API REST (`/api/v1/...`)
- `frontend/`: app Ionic con Capacitor (Android, iOS, web)

## Requisitos

- PHP 8.2+ y Composer
- Node.js 20+ y npm
- Extensión SQLite (por defecto el backend usa `database/database.sqlite`)

## Backend (Laravel)

```bash
cd backend
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

Usuarios de prueba (seeder):

| Rol            | Email                      | Contraseña |
|----------------|----------------------------|------------|
| Administrador  | `admin@parqueadero.local`   | `password` |
| Operador       | `operador@parqueadero.local` | `password` |
| Propietario    | `propietario@parqueadero.local` | `password` |

### API (extracto)

- `POST /api/v1/login` — token Sanctum
- Admin: `GET/POST /api/v1/admin/rates`, `GET/PATCH /api/v1/admin/users`, etc.
- Operador: `POST /api/v1/operator/check-in`, `POST /api/v1/operator/sessions/{id}/check-out`, `GET /api/v1/operator/dashboard`, `GET /api/v1/operator/reports/revenue`
- Propietario: `GET /api/v1/owner/vehicles` (solo vehículos vinculados)
- Push: `POST /api/v1/push-devices` (registro de token FCM)

Comando programado (recordatorios; integrar FCM en el handler): `php artisan parqueadero:subscription-reminders` (diario 08:00).

## Frontend (Ionic)

```bash
cd frontend
npm install
# Ajusta la URL de la API en src/environments/environment.ts
npm start
# o
ionic serve
```

En desarrollo, `environment.apiUrl` apunta a `http://localhost:8000/api/v1`. En dispositivo/Android usa la IP de tu PC en la red (p. ej. `http://192.168.1.10:8000/api/v1`).

### Build y nativo

```bash
cd frontend
npm run build
npx cap sync android
npx cap open android
# iOS (solo macOS):
npx cap open ios
```

### APK Android

- **Guía detallada:** [frontend/ANDROID-APK.md](frontend/ANDROID-APK.md)
- **Debug (Windows):** desde la **raíz del repo** o desde `frontend/`: `npm run android:apk:debug` → APK en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`
- **CI:** workflow `.github/workflows/android-debug-apk.yml` sube el APK como artifact.

Configura Firebase/FCM y coloca `google-services.json` en `frontend/android/app/` para notificaciones push en producción.

## Próximos pasos sugeridos

- Integrar envío real con FCM en el comando `parqueadero:subscription-reminders`
- Políticas de privacidad y términos; logs de auditoría de cobros
- Pruebas automatizadas (Pest/PHPUnit y Cypress/Appium)
