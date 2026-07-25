# Parqueadero Design System

> Generado con ui-ux-pro-max y adaptado al producto existente (Ops SaaS Ionic/Angular).
> Primary azul operativo + verde éxito / rojo incidente. No sustituir por paleta verde-first.

## Product

- **Tipo:** App operativa de parqueadero (móvil + web + Capacitor)
- **Audiencia:** operadores, admin, propietarios de vehículos
- **Tono:** limpio, profesional, denso en datos, legible en campo

## Colors (tokens)

| Role | Hex | Variable |
|------|-----|----------|
| Primary | `#2563EB` | `--ion-color-primary` |
| Primary deep (toolbar) | `#0F2744` | `--ion-toolbar-background` |
| Success / Activo | `#059669` | `--ion-color-success` / `--pp-accent` |
| Danger / Vencido | `#DC2626` | `--ion-color-danger` |
| Warning | `#EAB308` | `--ion-color-warning` |
| Background | `#F1F5F9` | `--pp-page-bg` |
| Surface | `#FFFFFF` | `--pp-surface` |
| Foreground | `#0F172A` | `--pp-foreground` |
| Muted | `#475569` | `--pp-muted` (≥4.5:1 sobre fondo claro) |
| Border | `#E2E8F0` | `--pp-border` |

Dark mode: superficies slate (`#0F172A` / `#1E293B`), texto `#F8FAFC`, muted `#94A3B8`.

## Typography

- **Display / marca:** Calistoga (hero login, títulos de bienvenida)
- **UI / body:** Plus Jakarta Sans 400–700
- **Datos (placas, montos):** JetBrains Mono o `tabular-nums`
- Base 16px, line-height 1.5, labels ≥0.75rem con weight 600

## Spacing & radius

- Escala 4/8: `--space-xs`…`--space-2xl`
- Cards: radius 16px, borde 1px + sombra suave
- Touch targets ≥44px

## Motion

- Transiciones UI: 150–200ms ease
- Respetar `prefers-reduced-motion`
- Sin overshoot en tablas/listas densas

## Navigation

- Pública: `/consulta` (placa + hora de ingreso)
- Auth: `/login`, `/register`
- Panel: `/inicio`, `/parqueo`, `/cuenta`
- Bottom tabs ≤3; deep links `/consulta?plate=` (QR) y `/parqueo?plate=` (autenticado)
- Tab bar inferior ≤3 ítems, outline icons + label
- Safe-area bottom en tab bar

## Anti-patterns

- No purple/indigo genérico, no cream+terracotta, no broadsheet
- No emoji como iconos
- No `user-scalable=no` (accesibilidad)
- No confiar solo en color para estado (badge + texto)

## Checklist pre-entrega

- [x] Contraste texto ≥4.5:1
- [x] Focus visible
- [x] Reduced motion
- [x] Touch ≥44px
- [x] Iconos outline consistentes (Ionicons)
