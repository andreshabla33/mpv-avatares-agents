# Monica CRM — AI Office

Visualización 2D pixel art de una oficina virtual que muestra la actividad en tiempo real de agentes de IA conversacionales conectados a WhatsApp, Instagram y otros canales.

![Monica CRM AI Office](https://img.shields.io/badge/React-Canvas_2D-blue) ![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions-green) ![Vite](https://img.shields.io/badge/Vite-v7-purple)

## Features

- **Oficina 2D Pixel Art** — Canvas HTML5 con salas (Meeting, Private Office, Kitchen, Lounge, Work Area)
- **Datos en tiempo real** — Polling cada 5s desde Supabase Edge Function
- **7+ estados enriquecidos** — `responding`, `scheduling`, `qualifying`, `waiting`, `overloaded`, `working`, `idle`
- **Speech bubbles** — Burbujas flotantes con la acción actual del agente
- **Heat indicators** — Aura pulsante por carga de trabajo (verde → amarillo → naranja → rojo)
- **Sala "Sin Interacción"** — Agentes sin datos reales aparecen greyed-out y estáticos
- **Mini-dashboard KPI** — Overlay en canvas con msgs/h, convos abiertas, agentes activos
- **Activity Feed** — Panel lateral con log de acciones en tiempo real
- **Tooltips detallados** — Hover sobre agente → métricas completas (msgs, convos, canal, LLM)
- **Focus Mode** — Click en agente → modal con métricas detalladas y barra de carga
- **Sonidos retro 8-bit** — Web Audio API genera sonidos al cambiar estado (toggle on/off)
- **Fallback demo** — Si la API no responde, muestra datos simulados

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TailwindCSS 4
- **Canvas**: HTML5 Canvas 2D (pixel art, 1100×700)
- **Backend**: Supabase Edge Functions (Deno)
- **Base de datos**: PostgreSQL (Supabase)
- **Audio**: Web Audio API (sin archivos externos)

## Arquitectura

```
Supabase PostgreSQL
  ├── wp_agentes (agentes de IA)
  ├── wp_conversaciones (conversaciones por canal)
  └── wp_mensajes (mensajes con uso_herramientas)
        │
        ▼
Edge Function: agent-office-status
  → Retorna: { agents: [...], kpis: {...} }
  → Estados: responding | scheduling | qualifying | waiting | overloaded | working | idle
        │
        ▼
React App (Canvas 2D)
  ├── PixelOffice.jsx — Canvas principal con oficina, agentes, bubbles, heat, KPIs
  ├── ActivityFeed.jsx — Panel lateral con dashboard + log de acciones
  ├── AgentDetail.jsx — Modal focus mode con métricas detalladas
  ├── StatusBar.jsx — Barra inferior con badges de agentes
  ├── useAgentStates.js — Hook de polling API + fallback mock
  └── useSounds.js — Sonidos retro con Web Audio API
```

## Setup

```bash
npm install
npm run dev
```

## Env Variables

La app se conecta directamente a la Edge Function pública de Supabase. No requiere variables de entorno para el frontend.

## Build

```bash
npm run build
npm run preview
```

## Estructura de archivos

```
src/
├── App.jsx                    # Layout principal + integración
├── components/
│   ├── PixelOffice.jsx        # Canvas 2D (24KB) — oficina completa
│   ├── ActivityFeed.jsx       # Panel lateral KPIs + log
│   ├── AgentDetail.jsx        # Modal focus mode
│   └── StatusBar.jsx          # Barra inferior
├── data/
│   └── agents.js              # Posiciones, colores, mapeo API
└── hooks/
    ├── useAgentStates.js      # Polling + estado + KPIs
    └── useSounds.js           # Sonidos 8-bit Web Audio
```

## License

MIT
