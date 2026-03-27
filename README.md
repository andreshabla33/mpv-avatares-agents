# Monica CRM — AI Office (Dashboard de Observabilidad Agéntica)

Interfaz de observabilidad operativa en tiempo real representada como una oficina 2D Pixel Art. Monitorea el estado, carga de trabajo y actividad de agentes de IA conversacionales conectados a múltiples canales de mensajería (WhatsApp, Instagram, ManyChat, Facebook, SMS) sin acceso a bases de datos o logs. Democratiza el monitoreo técnico para stakeholders operativos y directivos.

![React](https://img.shields.io/badge/React_19-Canvas_2D-blue) ![Supabase](https://img.shields.io/badge/Supabase-Edge_Functions_v14-green) ![Vite](https://img.shields.io/badge/Vite-v7-purple) ![Sprites](https://img.shields.io/badge/Sprites-Chibi_Fantasy-orange)

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
Edge Function: agent-office-status v14 (Deno)
         │
         ├─► 1 avatar por agente (agrega todos sus números/canales)
         ├─► Solo agentes no archivados con números en wp_numeros aparecen
         ├─► Números con activo=false no contribuyen a métricas
         ├─► Estado = el más activo de todos sus canales
         ├─► channels[] = detalle por número (canal, teléfono, activo)
         ├─► Métricas: msgs 2min/5min/1h/24h, convos, tokens
         ├─► Info empresa: nombre, rubro, país (wp_empresa_perfil)
         ├─► Info agente: nombre_agente, rol, llm (wp_agentes)
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

## Edge Function: `agent-office-status` v14

### Endpoint

```
GET https://vecspltvmyopwbjzerow.supabase.co/functions/v1/agent-office-status
```

No requiere autenticación (JWT deshabilitado). Responde en ~700-800ms.

### Arquitectura interna

La función ejecuta 7 queries secuenciales a Supabase PostgreSQL:

| # | Tabla | Propósito |
|---|-------|-----------|
| 1 | `wp_numeros` + joins | Todos los números con info de agente y empresa |
| 2 | `wp_conversaciones` | Conversaciones activas por agente |
| 3 | `wp_mensajes` | Mensajes últimos 5 min (actividad inmediata) |
| 4 | `wp_mensajes` | Mensajes última hora (rate) |
| 5 | `wp_mensajes` | Mensajes últimas 24h (volumen diario) |
| 6 | `wp_mensajes` | Mensajes sin respuesta (detección fallos n8n) |
| 7 | `wp_conversaciones` | Conversaciones abandonadas (>2h sin respuesta) |

### Query principal (FK hints)

La tabla `wp_numeros` tiene dos foreign keys a `wp_agentes` (`agente_id` y `agente_id_ab`), lo que causa ambigüedad en PostgREST. Se resuelve con FK hints explícitos:

```sql
wp_agentes!wp_numeros_agente_id_fkey(id, nombre_agente, rol, llm, archivado)
wp_empresa_perfil!wp_numeros_empresa_id_fkey(id, nombre, rubro, pais)
```

El filtrado de agentes archivados se hace en JavaScript (no con `.eq()` en el query) porque el FK hint sin `!inner` genera LEFT JOINs donde `wp_agentes` puede ser null.

### Agregación por agente

Los números se agrupan por `agente_id` en un `agentGroupMap`. Cada agente recibe:
- `channels[]` — array con detalle de cada número (canal, teléfono, activo, timezone)
- `active_channels` — cantidad de números con `activo=true`
- `paused_channels` — cantidad de números con `activo=false`
- Métricas agregadas de todos sus canales activos

### Detección de estado

El estado se determina por prioridad descendente:

```
overloaded  → 5+ conversaciones activas en 5 min
scheduling  → Herramienta de agenda (cita/calendly/schedule)
qualifying  → Herramienta de calificación
sending     → Herramienta de envío (imagen/send)
thinking    → Herramienta de análisis
responding  → Mensajes del agente en últimos 2 min
waiting     → Usuario envió mensaje, agente no ha respondido (>90s)
working     → Mensajes del agente en últimos 5 min
idle        → Sin actividad reciente
paused      → Todos los canales con activo=false
```

Si **todos** los canales de un agente tienen `activo=false`, el estado es `paused` independientemente de la actividad.

### Respuesta JSON

```json
{
  "agents": [
    {
      "id": "agent-7",
      "agente_id": 7,
      "name": "Monica URPE INTEGRAL",
      "nombre_agente": "Monica URPE INTEGRAL",
      "empresa": "URPE Integral",
      "rubro": "Construcción",
      "pais": "Colombia",
      "role": "Cerrador",
      "llm": "openai/gpt-4o",
      "status": "responding",
      "action_text": "Respondiendo (3 msgs)",
      "channels": [
        { "numero_id": 1, "canal": "manychat", "telefono": "+1...", "activo": true, "timezone": "America/Bogota", "nombre": "Urpe ManyChat Monica" },
        { "numero_id": 5, "canal": "whatsapp", "telefono": "+57...", "activo": true, "timezone": "America/Bogota", "nombre": "Urpe Integral" }
      ],
      "active_channels": 7,
      "paused_channels": 0,
      "msgs_2min": 3,
      "msgs_5min": 8,
      "msgs_1h": 45,
      "msgs_24h_agent": 312,
      "msgs_24h_user": 289,
      "convs_active_5min": 4,
      "convs_open": 15,
      "last_tool": "buscar_disponibilidad",
      "tokens_1h": 12500,
      "thought_traces": [
        { "ts": "2026-03-03T...", "content": "...", "tools": [...], "contacto_id": 1234, "conversacion_id": 5678 }
      ],
      "unanswered_msgs": 0,
      "abandoned_convs": 1,
      "last_agent_message_time": "2026-03-03T21:05:00.000Z",
      "minutes_without_response": 2,
      "number_is_active": true,
      "has_real_data": true,
      "last_activity": "2026-03-03T21:05:00.000Z"
    }
  ],
  "kpis": {
    "total_agents": 10,
    "active_agents": 3,
    "total_msgs_1h": 120,
    "total_msgs_24h": 2500,
    "total_convs_open": 45,
    "overloaded_agents": 1
  }
}
```

### Campos del agente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | `agent-{agente_id}` — identificador único |
| `agente_id` | number | ID en `wp_agentes` |
| `name` / `nombre_agente` | string | Nombre del agente |
| `empresa` | string | Nombre de la empresa (wp_empresa_perfil.nombre) |
| `rubro` | string | Industria de la empresa |
| `pais` | string | País de la empresa |
| `role` | string | Rol del agente (wp_agentes.rol) |
| `llm` | string | Modelo LLM usado (ej: `openai/gpt-4o`) |
| `status` | string | Estado actual (ver tabla de estados) |
| `action_text` | string | Texto descriptivo de la acción actual |
| `channels` | array | Detalle de cada número/canal del agente |
| `active_channels` | number | Números con `activo=true` |
| `paused_channels` | number | Números con `activo=false` |
| `msgs_2min` | number | Mensajes del agente en últimos 2 min |
| `msgs_5min` | number | Mensajes del agente en últimos 5 min |
| `msgs_1h` | number | Total mensajes en última hora |
| `msgs_24h_agent` | number | Mensajes del agente en 24h |
| `msgs_24h_user` | number | Mensajes de usuarios en 24h |
| `convs_active_5min` | number | Conversaciones con actividad en 5 min |
| `convs_open` | number | Conversaciones con seguimiento='abierta' |
| `last_tool` | string? | Última herramienta usada |
| `tokens_1h` | number | Tokens estimados en última hora (~4 chars/token) |
| `thought_traces` | array | Últimos 10 mensajes del agente con herramientas y contacto |
| `unanswered_msgs` | number | Mensajes de usuario sin respuesta (>5 min) |
| `abandoned_convs` | number | Conversaciones abandonadas (>2h sin respuesta) |
| `minutes_without_response` | number | Minutos desde último mensaje del agente (-1 si nunca) |
| `number_is_active` | boolean | `true` si al menos 1 canal activo |
| `has_real_data` | boolean | `true` si tiene conversaciones registradas |

### Versionado

| Versión | Cambio principal |
|---------|------------------|
| v9 | Arquitectura original: 1 avatar por agente, agregación por agente_id |
| v10-v11 | (Roto) Intento de cambiar a 1 por número — causó 500 por FK ambiguity |
| v12-v13 | Fix FK hints + filtro JS, pero modelo per-number (27 avatares) |
| v14 | **Restaura modelo v9**: 1 avatar por agente + FK hints + empresa info (rubro, pais) |

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
- **Backend**: Supabase Edge Functions v14 (Deno)
- **Audio**: Native Web Audio API
- **Sprites**: CraftPix Chibi Fantasy (128×128 horizontal strips)

## License

MIT
