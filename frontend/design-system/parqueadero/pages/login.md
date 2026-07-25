# Login page overrides

Inspirado en [Modern Login UI 2.0](https://www.figma.com/community/file/888461935200285665/modern-login-ui-2-0) (Soft UI Evolution) + tokens Parqueadero Ops.

## Layout

- Mobile: ilustración + marca arriba; panel blanco redondeado con formulario
- Desktop (≥900px): split — panel visual azul a la izquierda, formulario a la derecha
- Sin toolbar Ionic; safe-area en el contenedor
- Una composición: marca / bienvenida / formulario / enlace de registro

## Visual

- Fondos soft (blobs azul/teal), no purple-pink genérico
- Inputs rellenos (`#F1F5F9`), radio 14px, focus ring azul
- CTA pill con gradiente primary → deep (`#2563EB` → `#0F2744`), min-height 52px
- Ilustración SVG propia (lote + vehículo), sin emoji
- Entrada staggered (~400ms); `prefers-reduced-motion` desactiva animaciones

## UX / a11y

- Labels visibles; placeholders solo como pista
- Error inline `role="alert"` + `aria-describedby` + toast
- Toggle de contraseña (PrimeNG); targets ≥48px
- Enlace “Crear cuenta” en footer (no segundo CTA competidor)
