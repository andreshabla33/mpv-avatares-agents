# Monica CRM — AI Office (Dashboard de Observabilidad Agéntica)

Interfaz de observabilidad operativa en tiempo real representada como una oficina 2D Pixel Art. Monitorea el estado, carga de trabajo y actividad de agentes de IA conversacionales conectados a múltiples canales de mensajería (WhatsApp, Instagram, ManyChat, Facebook, SMS) sin acceso a bases de datos o logs. Democratiza el monitoreo técnico para stakeholders operativos y directivos.

![React](https://img.shields.io/badge/React_19-Canvas_2D-blue) ![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions_v9-green) ![Vite](https://img.shields.io/badge/Vite-v7-purple) ![Sprites](https://img.shields.io/badge/Sprites-Chibi_Fantasy-orange)

## Problema que resuelve

Los agentes de IA operan como una "caja negra". Determinar si un agente está saturado, inactivo, o procesando información requería inspeccionar tablas crudas en Supabase (`wp_mensajes`, `wp_conversaciones`, `wp_agentes`, `wp_numeros`). Esto era inaccesible para la dirección y lento para operadores en vivo.

## Arquitectura

```
Supabase PostgreSQL
┌──────────────────────────────────────────────────────────┐
│  wp_agentes     wp_numeros        wp_conversaciones      │
│  ├─ id          ├─ agente_id      ├─ numero_id           │
│  ├─ nombre      ├─ canal          ├─ seguimiento         │
│  ├─ rol         ├─ activo         └─ fecha_ultimo_msg    │
│  └─ archivado   └─ telefono                              │
│                                   wp_mensajes            │
│                                   ├─ conversacion_id     │
│                                   ├─ remitente           │
│                                   ├─ uso_herramientas    │
│                                   └─ created_at          │
└──────────────────────────────────────────────────────────┘
         │
         ▼
Edge Function: agent-office-status v9 (Deno)
         │
         ├─► 1 avatar por agente (agrega todos sus números/canales)
         ├─► Solo agentes con números en wp_numeros aparecen
         ├─► Números con activo=false no contribuyen a métricas
         ├─► Estado = el más activo de todos sus canales
         ├─► channels[] = detalle por número (canal, ciudad, status)
         ├─► Métricas: msgs 2min/5min/1h/24h, convos, tokens
         │
         └─► Retorna: { agents: [...], kpis: {...} }

React App (polling 5s)
┌──────────────────────────────────────────────────────────┐
│  useAgentStates.js                                       │
│  ├─ fetch() → Edge Function cada 5s                      │
│  ├─ Mapea extras: channels[], cities[], activeChannels   │
│  └─ Fallback mock si API no responde                     │
│                                                          │
│  PixelOffice.jsx (HTML5 Canvas 1100×700)                 │
│  ├─ Zonas: Respondiendo, Agendar Cita, Precalificación, │
│  │         Soporte/Trabajo, Corredor (idle), Sala OFF    │
│  ├─ Sprites: 3 chibi fantasy (Swordsman, Archer, Wizard)│
│  ├─ Channel badges: WA, MC, IG, FB, SM por avatar       │
│  ├─ Collision avoidance: agentes nunca se superponen     │
│  └─ KPI overlay: msgs/h, convos, agentes activos        │
│                                                          │
│  AgentRenderer.js                                        │
│  ├─ Sprite animation: horizontal strip, 128×128 frames  │
│  ├─ Status indicators: color-coded circles               │
│  ├─ Multi-channel badges por avatar                      │
│  └─ Activity particles y heat waves                      │
│                                                          │
│  AgentBehaviorSystem.js                                  │
│  ├─ State→Zone mapping (qué zona visita cada estado)     │
│  ├─ Slot assignment (desks libres en cada zona)          │
│  └─ Collision repulsion (MIN_DIST=70px entre agentes)    │
│                                                          │
│  ActivityFeed.jsx — Log de eventos persistente           │
│  AgentDetail.jsx — Modal con métricas por agente         │
│  StatusBar.jsx — Barra inferior con resumen de agentes   │
└──────────────────────────────────────────────────────────┘
```

## Modelo de datos: 1 Avatar por Agente

Cada agente de IA puede tener múltiples números/canales. La edge function agrega las métricas de todos sus canales activos en un solo avatar:

| Campo | Descripción |
|-------|-------------|
| `id` | `agent-{agente_id}` |
| `status` | El estado más activo de todos sus canales |
| `channels[]` | Array con detalle de cada número (canal, ciudad, activo, status) |
| `active_channels` | Cantidad de números con `activo=true` |
| `paused_channels` | Cantidad de números con `activo=false` |
| `msgs_2min/5min/1h` | Mensajes agregados de todos los canales activos |

### Estados y zonas

| Estado | Zona en el canvas | Criterio |
|--------|-------------------|----------|
| `responding` | Respondiendo Mensajes | Mensajes del agente en últimos 2 min |
| `sending` | Respondiendo Mensajes | Herramienta de envío activa |
| `overloaded` | Respondiendo Mensajes | 5+ conversaciones simultáneas |
| `scheduling` | Agendar Cita | Herramienta de agenda activa |
| `qualifying` | Precalificación | Herramienta de calificación activa |
| `thinking` | Precalificación | Herramienta de análisis activa |
| `waiting` | Soporte / Trabajo | Esperando procesar mensaje de usuario |
| `working` | Soporte / Trabajo | Mensajes en últimos 5 min |
| `idle` | Corredor central | Sin actividad reciente |
| `paused` | Sala OFF (sidebar) | Todos los canales con `activo=false` |

### Filtrado de agentes

- Agentes **sin ningún número** en `wp_numeros` → **no aparecen**
- Agentes con **todos los números `activo=false`** → aparecen como `paused` en zona OFF
- Números `activo=false` → aparecen en `channels[]` pero **no contribuyen** a métricas ni estado

## Estructura del proyecto

```
src/
├── components/
│   ├── PixelOffice.jsx      # Canvas principal, game loop, inicialización
│   ├── ActivityFeed.jsx     # Log lateral de eventos en tiempo real
│   ├── AgentDetail.jsx      # Modal con métricas detalladas por agente
│   └── StatusBar.jsx        # Barra inferior con resumen de agentes
├── data/
│   ├── agents.js            # Posiciones de zonas, mapping API→canvas, fallbacks
│   └── spriteConfig.js      # Config de sprites chibi (frames, animaciones, paths)
├── entities/
│   └── Agent.js             # Entidad agente (posición, estado, propiedades)
├── hooks/
│   ├── useAgentStates.js    # Polling API, parsing de respuesta, mock fallback
│   └── useSounds.js         # Web Audio API para notificaciones retro 8-bit
├── rendering/
│   └── AgentRenderer.js     # Renderizado de sprites, badges, efectos
├── systems/
│   ├── AgentBehaviorSystem.js  # Movimiento, zonas, collision avoidance
│   ├── AssetLoader.js       # Carga de sprites y assets
│   ├── EntityManager.js     # CRUD de entidades, queries espaciales
│   ├── EventSystem.js       # Pub/sub para comunicación entre sistemas
│   ├── GameEngine.js        # Game loop principal, coordinación de sistemas
│   └── RenderingEngine.js   # Orquestador de renderizado del canvas
└── utils/
    ├── AnimationEngine.js   # Motor de animación de sprites
    ├── CityMapGenerator.js  # Generador del mapa de oficina pixel art
    ├── Effects2D.js         # Partículas, heat waves, efectos visuales
    ├── PlaceholderSprites.js # Sprites placeholder mientras cargan los reales
    └── SpriteManager.js     # Carga y cache de spritesheets
```

## Sprites

Se utilizan 3 sprites chibi fantasy de [CraftPix](https://craftpix.net):
- **Swordsman** (rubio) — 8 animaciones
- **Archer** (rojo) — 8 animaciones
- **Wizard** (oscuro) — 8 animaciones

Cada sprite es un strip horizontal de 128×128px por frame. La asignación es determinística por hash del `agent.id`.

## Decisiones arquitectónicas

### Polling 5s vs. WebSocket
Polling de 5s en lugar de Supabase Realtime/WebSockets. El dashboard está diseñado para correr desatendido en pantallas 24/7. Los estados cambian en escala de segundos/minutos, así que 5s balancea inmediatez y costo.

### 1 Avatar por Agente vs. 1 por Número
Un agente puede tener 5+ números en diferentes canales. Mostrar un avatar por número era redundante y confuso (27 avatares vs 10 agentes reales). La edge function agrega métricas y el avatar muestra todos los canales como badges.

### Canvas 2D vs. DOM/SVG
Motor custom en Canvas 2D (`< 30KB`). No degrada performance tras días de ejecución. Sin dependencias de librerías de renderizado.

## Features

- **Auto-discovery**: Nuevos agentes se muestran automáticamente
- **Multi-channel badges**: WA, MC, IG, FB, SM por avatar
- **Collision avoidance**: Agentes nunca se superponen (repulsión 70px)
- **Heat indicators**: Aura pulsante por carga de trabajo
- **Notificaciones retro**: Web Audio API con tonos 8-bit
- **Stale Data Indicator**: Alerta si API falla >15s
- **Activity Log**: Historial persistente en `localStorage`
- **Zone labels**: Texto legible con fondo semitransparente

## Limitaciones y próximos pasos

1. **Read-Only**: No se puede pausar/reiniciar agentes desde el dashboard
2. **Escalabilidad**: Con muchos clientes conectados, el polling requeriría caching en la edge function
3. **Sprites limitados**: Solo 3 tipos de chibi; agentes se distinguen por color + hash

## Setup

```bash
npm install
npm run dev        # Desarrollo (localhost:5173)
npm run build      # Build producción
npm run preview    # Preview del build
```

### Variables de entorno

La edge function usa variables de Supabase automáticas:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

No se requieren variables de entorno en el frontend (la URL de Supabase está hardcodeada en `useAgentStates.js`).

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TailwindCSS 4
- **Canvas**: HTML5 Canvas 2D (sin librerías externas)
- **Backend**: Supabase Edge Functions v9 (Deno)
- **Audio**: Native Web Audio API
- **Sprites**: CraftPix Chibi Fantasy (128×128 horizontal strips)

## License

MIT
