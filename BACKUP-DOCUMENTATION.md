# UAL Office Virtual Agent v2 - Documentación de Respaldo
**Actualizado: 3 Mar 2026 — Edge Function v15, modelo 1 avatar por agente**

## Arquitectura: 1 Avatar por Agente

Cada `agente_id` en `wp_agentes` se representa como **un solo avatar** en el canvas. Los múltiples números/canales (`wp_numeros`) de un agente se agregan en `channels[]`.

- **10 agentes** totales (no 27 números)
- **4 activos** (al menos 1 número con `activo=true`)
- **6 en sala OFF** (todos los números `activo=false`)

## Tablas de BD

| Tabla | Rol |
|-------|-----|
| `wp_numeros` | Canales de comunicación (WhatsApp, IG, MC). FK a agente + empresa |
| `wp_agentes` | Nombre, rol, LLM, archivado |
| `wp_empresa_perfil` | Nombre empresa, rubro, país |
| `wp_conversaciones` | Conversaciones por agente (seguimiento, contacto_id) |
| `wp_mensajes` | Mensajes individuales (remitente, uso_herramientas, contenido) |

## Edge Function: `agent-office-status` v15

- **Endpoint**: `GET /functions/v1/agent-office-status`
- **7 queries** secuenciales a PostgreSQL
- **FK hints** explícitos para evitar ambigüedad PostgREST (`wp_numeros_agente_id_fkey`)
- **Agrega** por `agente_id` → `channels[]`, `active_channels`, `paused_channels`
- **Estado**: prioridad descendente (overloaded > scheduling > responding > idle > paused)
- **Retorna**: `{ agents: [...], kpis: {...} }`

## Respuesta JSON (por agente)

```json
{
  "id": "agent-7",
  "agente_id": 7,
  "name": "Monica URPE INTEGRAL",
  "empresa": "URPE Integral",
  "rubro": "Construcción",
  "pais": "Colombia",
  "role": "Cerrador",
  "llm": "openai/gpt-4o",
  "status": "responding",
  "channels": [
    { "numero_id": 1, "canal": "manychat", "canal_short": "MC", "activo": true },
    { "numero_id": 5, "canal": "whatsapp", "canal_short": "WA", "activo": true }
  ],
  "active_channels": 7,
  "paused_channels": 0,
  "msgs_2min": 3,
  "msgs_5min": 8,
  "msgs_1h": 45,
  "thought_traces": [...],
  "unanswered_msgs": 0,
  "abandoned_convs": 1
}
```

## Frontend

| Componente | Función |
|------------|---------|
| `useAgentStates.js` | Polling 5s, mapeo API → estado local |
| `agents.js` → `mapAgentsFromAPI` | `active_channels > 0` → escritorio activo, sino OFF |
| `PixelOffice.jsx` | Canvas 1100×700, game loop |
| `GameEngine.js` | Coordinador: behavior + rendering + eventos |
| `AgentBehaviorSystem.js` | Movimiento, zonas, collision avoidance |
| `AgentRenderer.js` | Sprites chibi 128×128, badges de canal |
| `AgentDetail.jsx` | Modal métricas + thought traces |
| `statusConfig.js` | STATUS_COLORS, STATUS_LABELS, STATUS_ICONS (compartido) |

## Sprites

3 tipos chibi (Swordsman, Archer, Wizard), asignación determinística por hash de `agent.id`.
Animaciones usadas: `idle`, `walk`, `hurt`. Las demás (`attack`, `run`, `dead`) están cargadas pero no se usan.

## Deploy

- **Framework**: Vite 7 + React 19 + TailwindCSS 4
- **Backend**: Supabase Edge Functions (Deno)
- **Proyecto Supabase**: `vecspltvmyopwbjzerow`
