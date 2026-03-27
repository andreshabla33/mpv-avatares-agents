# ROADMAP — Monica CRM AI Office v2

Fecha de inicio: 2026-03-03
Basado en auditoría técnica del proyecto v1 (pixel-office).

---

## Sprint 1 (P0) — Bugs visibles
> Objetivo: Arreglar todo lo que el usuario ve roto en pantalla.

| ID | Tarea | Archivo(s) | Estado |
|----|-------|------------|--------|
| P0-1 | Agregar `canal_short` a channels[] en edge function v15 | `supabase/functions/agent-office-status/index.ts` | ✅ |
| P0-2 | StatusBar: usar channels[] en vez de extra.canal vacío | `src/components/StatusBar.jsx` | ✅ |
| P0-3 | ActivityFeed: corregir referencia a canal_short inexistente | `src/hooks/useAgentStates.js` | ✅ |
| P0-4 | Eliminar sombra doble (dejar solo la del AgentRenderer) | `src/systems/GameEngine.js` | ✅ |

---

## Sprint 2 (P1) — Funcionalidad rota
> Objetivo: Que los botones y callbacks hagan lo que dicen.

| ID | Tarea | Archivo(s) | Estado |
|----|-------|------------|--------|
| P1-1 | Ocultar botón Pause/Resume (edge function agent-control no existe) | `src/components/AgentDetail.jsx` | ✅ |
| P1-2 | Eliminar dead code togglePause + onStateChange no-op | `src/AgentDetail.jsx`, `src/App.jsx` | ✅ |

---

## Sprint 3 (P2) — Deuda técnica
> Objetivo: Código limpio, sin duplicación ni dead code.

| ID | Tarea | Archivo(s) | Estado |
|----|-------|------------|--------|
| P2-1 | Extraer STATUS_COLORS a archivo compartido | Nuevo `src/data/statusConfig.js` + 4 archivos | ✅ |
| P2-2 | Eliminar getAnimForState() dead code | `src/data/spriteConfig.js` | ✅ |
| P2-3 | Eliminar ECS scaffolding muerto (components, COMPONENT_TYPES) | `src/entities/Agent.js` | ✅ |
| P2-4 | Limpiar console.logs de debug (mover detrás de flag DEBUG) | `src/systems/GameEngine.js` | ✅ |
| P2-5 | Actualizar BACKUP-DOCUMENTATION.md a v14/v15 | `BACKUP-DOCUMENTATION.md` | ✅ |

---

## Sprint 4 (P3) — Robustez y seguridad
> Objetivo: La app no se rompe y tiene protección básica.

| ID | Tarea | Archivo(s) | Estado |
|----|-------|------------|--------|
| P3-1 | Agregar React Error Boundary | Nuevo `src/components/ErrorBoundary.jsx` + `main.jsx` | ✅ |
| P3-2 | Agregar Cache-Control headers a edge function | `supabase/functions/agent-office-status/index.ts` | ✅ |
| P3-3 | Agregar autenticación opcional (x-api-key header) | `supabase/functions/agent-office-status/index.ts` | ✅ |

---

## Sprint 5 (P4) — Mejoras de UX
> Objetivo: Mejor experiencia visual y mantenibilidad.

| ID | Tarea | Archivo(s) | Estado |
|----|-------|------------|--------|
| P4-1 | Canvas responsive (aspect-ratio + contain) | `src/components/PixelOffice.jsx` | ✅ |
| P4-2 | Más variedad de sprites (al menos 5 personajes) | `src/data/spriteConfig.js` + assets | 🔲 Necesita PNGs |
| P4-3 | Histórico de métricas (tabla snapshots en Supabase) | Nueva edge function + componente | 🔲 Futuro |
| P4-4 | Tests unitarios (mapAgentsFromAPI + statusConfig) | `tests/` — 10 tests passing | ✅ |

---

## Registro de cambios

| Fecha | Sprint | Tarea | Descripción |
|-------|--------|-------|-------------|
| 2026-03-03 | P0 | P0-1 | Añadido CANAL_SHORT_MAP + canal_short en channels[] de edge function |
| 2026-03-03 | P0 | P0-2 | StatusBar muestra todos los canales activos del agente (hasta 3) |
| 2026-03-03 | P0 | P0-3 | ActivityFeed usa canal del primer canal activo |
| 2026-03-03 | P0 | P0-4 | Eliminada sombra rectangular duplicada en GameEngine |
| 2026-03-03 | P1 | P1-1 | Botón Pause/Resume deshabilitado con texto PRÓXIMAMENTE |
| 2026-03-03 | P1 | P1-2 | Eliminados togglePause, isUpdating, onStateChange muertos |
| 2026-03-03 | P2 | P2-1 | STATUS_COLORS/LABELS/ICONS centralizados en statusConfig.js |
| 2026-03-03 | P2 | P2-2 | Eliminada getAnimForState() sin uso |
| 2026-03-03 | P2 | P2-3 | Eliminado ECS scaffolding (components Map, COMPONENT_TYPES) |
| 2026-03-03 | P2 | P2-4 | console.logs detrás de flag DEBUG=false |
| 2026-03-03 | P2 | P2-5 | BACKUP-DOCUMENTATION reescrito para modelo v2 |
| 2026-03-03 | P3 | P3-1 | ErrorBoundary envuelve App en main.jsx |
| 2026-03-03 | P3 | P3-2 | Cache-Control: max-age=5 en response de edge function |
| 2026-03-03 | P3 | P3-3 | Validación opcional de x-api-key en edge function |
| 2026-03-03 | P4 | P4-1 | Canvas con aspect-ratio y object-fit: contain |
| 2026-03-03 | P4 | P4-4 | 10 tests unitarios con vitest (mapAgentsFromAPI + statusConfig) |
