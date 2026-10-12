# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Parqueadero
**Design Architecture:** Apple Fluid Design & UI/UX Pro Max Intelligence
**Category:** Parking Operations & Mobility SaaS
**Design Dials:** Variance 4/10 (Balanced / Modern) | Motion 6/10 (Spring Physics) | Density 7/10 (Standard Mobile Inset)

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Semantic Note |
|------|-----|--------------|---------------|
| Primary | `#2563EB` | `--ion-color-primary` | Apple Ops Blue (Confianza & Operación) |
| On Primary | `#FFFFFF` | `--ion-color-primary-contrast` | Texto de alto contraste sobre azul |
| Secondary | `#0284C7` | `--ion-color-secondary` | Sky Blue complementario |
| Success / Libre | `#059669` | `--ion-color-success` | Emerald Green (Cupos libres / Estado activo) |
| Danger / Alerta | `#DC2626` | `--ion-color-danger` | Red (Cupos llenos / Vencido / Cobro) |
| Warning / Motos | `#F59E0B` | `--ion-color-warning` | Amber (Motocicletas / Advertencia) |
| Background Light | `#F8FAFC` | `--pp-page-bg` | Canvas sutil con gradientes radiales |
| Background Dark | `#0B1120` | `--pp-page-bg` | Space Gray / Deep OLED |
| Surface Light | `#FFFFFF` | `--pp-surface` | Inset Grouped surface |
| Surface Dark | `#131C31` | `--pp-surface` | Deep Inset Grouped surface |
| Plate Background | `#FEF08A` | `--pp-plate-bg` | Amarillo oficial placas colombianas |
| Plate Foreground | `#1C1917` | `--pp-plate-fg` | Negro profundo de relieve |
| Plate Border | `#CA8A04` | `--pp-plate-border` | Borde dorado/estampado |

### Apple Materials & Translucency

```css
/* Glassmorphism Frosted Chrome */
backdrop-filter: blur(24px) saturate(190%);
-webkit-backdrop-filter: blur(24px) saturate(190%);
background: var(--pp-glass-bg); /* rgba(255, 255, 255, 0.78) en light / rgba(19, 28, 49, 0.8) en dark */
border: 1px solid var(--pp-glass-border);
```

### Apple Tactile Physics ("Kill Latency")

- **Feedback Inmediato:** Actuación instantánea en `:active` (`scale(0.975)` a `scale(0.92)` en pestañas).
- **Curva de Resorte (Spring Easing):** `cubic-bezier(0.16, 1, 0.3, 1)` (resorte amortiguado críticamente sin oscilaciones molestas).
- **Tabular Numbers:** Todo conteo, hora, dinero y placa vehicular utiliza `font-variant-numeric: tabular-nums` para evitar saltos de layout.

### Floating Apple Tab Bar

- Barra inferior en formato cápsula flotante (`margin: 0 16px calc(10px + env(safe-area-inset-bottom)) 16px`).
- Superficie translúcida con sombra difusa y micro-indicador activo con pill y punto lumínico.

### Bento Grid Dashboard (Tab 1 Inicio)

- KPIs de 3 columnas (Total dentro, Carros, Motos) con gradientes suaves y micro-resorte en tap.
- Indicador de estado en tiempo real con micro-pulso tipo radar (`pp-live-radar-dot`).
- Gráfico circular concéntrico inspirado en anillos de actividad de Apple con leyenda estructurada.

### Pre-Delivery Checklist

- [x] Sin emojis como íconos (uso estricto de IonIcons y PrimeIcons SVG).
- [x] Cursor pointer y respuesta `:active` táctil en todos los elementos interactivos.
- [x] Contraste mínimo 4.5:1 (WCAG 2.1 AA) en modos claro y oscuro.
- [x] Respeto riguroso de `prefers-reduced-motion: reduce`.
- [x] Cumplimiento del presupuesto de estilos de Angular (`maximumError: 16kb`).
- [x] Totalmente adaptable a pantallas de 360px a 1440px.
