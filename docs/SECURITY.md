# Seguridad — Parqueadero App

## Producción (checklist)

- [ ] `APP_ENV=production`, `APP_DEBUG=false`
- [ ] Sin `public/debug.php` en el servidor
- [ ] `SANCTUM_TOKEN_EXPIRATION` definido (minutos; por defecto 30 días)
- [ ] `CORS_ALLOWED_ORIGINS` solo con dominios de la PWA/API
- [ ] Credenciales Firebase fuera del repositorio (`FIREBASE_CREDENTIALS`)
- [ ] Usuarios sin contraseña `password` del seeder
- [ ] HTTPS en API y hosting
- [ ] Desplegar frontend con `firebase.json` actualizado (cabeceras + `public: www`)

## Controles implementados

| Área | Medida |
|------|--------|
| API | Sanctum, middleware `role`, rate limit login/registro |
| API | Validación `owner_user_id` (solo propietario activo) |
| API | Subida de fotos: `mimes` jpeg/png/webp |
| API | Errores 500 sin `getMessage()` al cliente |
| API | Tests `ApiSecurityTest` (401/403 por rol) |
| Frontend | `AuthGuard` revalida `/me` al entrar |
| Frontend | `GuestGuard` en login/registro |
| Frontend | Mensajes de error sanitizados (`api-error-message`) |
| Hosting | CSP y cabeceras en Firebase Hosting |
| CI | Workflow `security-audit.yml` (tests + audit) |

## Pendiente recomendado

- Almacenamiento seguro del token en móvil (Capacitor Secure Storage)
- CAPTCHA en registro público
- Políticas Laravel (`Policy`) por modelo
- Rotación periódica de tokens y auditoría de dependencias
