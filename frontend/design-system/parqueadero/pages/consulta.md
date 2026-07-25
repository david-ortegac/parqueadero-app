# Consulta de placa (vista inicial pública)

- Ruta: `/consulta` — sin AuthGuard; invitados redirigidos aquí desde el panel
- Pedir placa (formato CO), mostrar **hora de ingreso** grande + tiempo transcurrido
- CTAs: Iniciar sesión / Registrarme (o “Ir al panel” si hay sesión)
- API: `GET /api/v1/public/sessions/by-plate/{plate}` (sin PII)
- QR de ticket apunta a `/consulta?plate=`
