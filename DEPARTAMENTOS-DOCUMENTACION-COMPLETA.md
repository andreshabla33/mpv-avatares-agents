# Sistema de Departamentos - Documentación Técnica Completa

## UAL Office Virtual Agent v4.3.2026
**Fecha:** 31 de Marzo, 2026  
**Versión:** 1.0.0  
**Autor:** Cascade AI  
**Estado:** ✅ PRODUCCIÓN

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Los 4 Departamentos](#2-los-4-departamentos)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Flujo de Funcionamiento](#4-flujo-de-funcionamiento)
5. [API Reference](#5-api-reference)
6. [Integración con Agentes](#6-integración-con-agentes)
7. [Mapeo de Estados](#7-mapeo-de-estados)
8. [Diagrama de la Oficina](#8-diagrama-de-la-oficina)
9. [Implementación Técnica](#9-implementación-técnica)
10. [Testing y Verificación](#10-testing-y-verificación)

---

## 1. Resumen Ejecutivo

El **Sistema de Departamentos** es una característica central de UAL Office Virtual Agent que organiza visualmente a los agentes de IA en una oficina 2D pixelada según su actividad actual. Cada agente se mueve automáticamente a una zona específica de la oficina (departamento) basándose en su estado operativo, creando una representación visual en tiempo real del flujo de trabajo del CRM.

### Objetivos del Sistema

- **Visualización Organizacional:** Agrupar agentes por función para comprensión instantánea
- **Monitoreo en Tiempo Real:** Observar distribución de carga de trabajo visualmente
- **Gamificación:** Crear una experiencia de "oficina virtual" inmersiva
- **Eficiencia Operativa:** Identificar rápidamente cuántos agentes están en cada función

### Características Principales

✅ 4 departamentos distintivos con colores representativos  
✅ Movimiento automático de agentes según cambio de estado  
✅ Pathfinding inteligente con evasión de obstáculos  
✅ Integración completa con Supabase Realtime  
✅ Sistema de zonas basado en coordenadas de tiles  

---

## 2. Los 4 Departamentos

### 2.1 Departamento de Mensajes (RESPONDING)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `responding` |
| **Nombre** | Respondiendo mensajes |
| **Color Primario** | `#3B82F6` (Azul) |
| **Color Claro** | `#93C5FD` (Azul claro) |
| **Color Texto** | `#FFFFFF` (Blanco) |
| **Ubicación** | Cuadrante superior izquierdo |
| **Propósito** | Comunicación activa con clientes |

**Estados Asignados:**
- `responding` - Respondiendo mensajes de clientes
- `thinking` - Procesando información / pensando
- `sending` - Enviando respuestas

**Descripción:**
El departamento azul representa la actividad principal del agente: comunicación directa. Los agentes en este departamento están activamente interactuando con clientes a través del chat. El color azul transmite profesionalismo, confianza y comunicación fluida.

---

### 2.2 Departamento de Calificación (QUALIFYING)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `qualifying` |
| **Nombre** | Calificando lead |
| **Color Primario** | `#F59E0B` (Naranja/Ámbar) |
| **Color Claro** | `#FCD34D` (Amarillo claro) |
| **Color Texto** | `#1F2937` (Gris oscuro) |
| **Ubicación** | Cuadrante superior derecho |
| **Propósito** | Evaluación y calificación de leads |

**Estados Asignados:**
- `qualifying` - Analizando y calificando leads potenciales

**Descripción:**
El departamento naranja representa el proceso de evaluación comercial. Los agentes aquí están analizando leads, verificando calificación de prospectos y determinando prioridades de seguimiento. El naranja/ámbar simboliza energía, evaluación y proceso de ventas.

---

### 3.3 Departamento de Agendamiento (SCHEDULING)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `scheduling` |
| **Nombre** | Agendando cita |
| **Color Primario** | `#10B981` (Verde esmeralda) |
| **Color Claro** | `#6EE7B7` (Verde menta) |
| **Color Texto** | `#FFFFFF` (Blanco) |
| **Ubicación** | Cuadrante inferior izquierdo |
| **Propósito** | Gestión de calendario y programación |

**Estados Asignados:**
- `scheduling` - Agendando citas en calendario

**Descripción:**
El departamento verde representa el crecimiento y la organización temporal. Los agentes aquí están coordinando horarios, agendando citas y gestionando el calendario del CRM. El verde simboliza crecimiento, organización y éxito en la programación.

---

### 2.4 Departamento de Descanso (REST)

| Propiedad | Valor |
|-----------|-------|
| **ID** | `rest` |
| **Nombre** | Descanso |
| **Color Primario** | `#6B7280` (Gris) |
| **Color Claro** | `#9CA3AF` (Gris claro) |
| **Color Texto** | `#FFFFFF` (Blanco) |
| **Ubicación** | Cuadrante inferior derecho |
| **Propósito** | Espera entre actividades / inactividad |

**Estados Asignados:**
- `idle` - Inactivo, esperando asignación
- `paused` - Pausado temporalmente
- `waiting` - Esperando respuesta/evento
- (Default para estados no mapeados)

**Descripción:**
El departamento gris representa el estado de espera o standby. Los agentes aquí no tienen actividad activa asignada y están disponibles para nuevas tareas. El gris simboliza neutralidad, espera y disponibilidad.

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE PRESENTACIÓN                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│  │  App.jsx    │  │ StatusBar   │  │   ActivityFeed      │     │
│  └──────┬──────┘  └─────────────┘  └─────────────────────┘     │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CAPA DE ESTADO                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              useAgentStates Hook                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │   │
│  │  │   agents     │  │   states     │  │ updateAgentDeps  │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘  │   │
│  └────────────────────┬───────────────────────────────────────┘   │
└───────────────────────┼───────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CAPA DE OFICINA 2D                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              OfficeState Class                            │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  departments: Department[]                          │  │   │
│  │  │  agentDepartments: Map<agentId, DepartmentId>     │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                                                           │   │
│  │  Methods:                                                 │   │
│  │  • setAgentDepartmentByStatus(agentId, status)           │   │
│  │  • sendToDepartment(agentId, deptId)                     │   │
│  │  • getAgentDepartment(agentId)                           │   │
│  │  • isAgentInDepartment(agentId)                          │   │
│  └────────────────────┬──────────────────────────────────────┘   │
└───────────────────────┼───────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CAPA DE CONFIGURACIÓN                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              departments.ts                                 │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │  getDepartments(cols, rows) → Department[]       │   │   │
│  │  │  getDepartmentForStatus(status) → DepartmentId   │   │   │
│  │  │  getRandomTileInDepartment(dept) → Tile          │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Estructura de Datos

#### Department Interface

```typescript
interface Department {
  id: DepartmentId;                    // 'responding' | 'qualifying' | 'scheduling' | 'rest'
  name: string;                        // Nombre legible
  color: string;                       // Color primario (hex)
  colorLight: string;                  // Variante clara para pisos
  textColor: string;                 // Color de texto para contraste
  zoneTiles: Array<{col, row}>;        // Tiles caminables en la zona
  labelPosition: {col, row};          // Posición del label del departamento
}
```

#### DepartmentId Enum

```typescript
const DepartmentId = {
  RESPONDING: 'responding',    // 🔵 Azul
  QUALIFYING: 'qualifying',    // 🟠 Naranja
  SCHEDULING: 'scheduling',    // 🟢 Verde
  REST: 'rest'                 // ⚪ Gris
} as const;
```

---

## 4. Flujo de Funcionamiento

### 4.1 Diagrama de Secuencia

```
Usuario/CRM          Supabase          useAgentStates         OfficeState         Canvas
    │                    │                    │                    │                │
    │  Nuevo mensaje     │                    │                    │                │
    │───────────────────>│                    │                    │                │
    │                    │  Realtime INSERT   │                    │                │
    │                    │─────────────────>│                    │                │
    │                    │                    │  Actualiza state   │                │
    │                    │                    │  de agente a        │                │
    │                    │                    │  'responding'      │                │
    │                    │                    │────┐               │                │
    │                    │                    │    │               │                │
    │                    │                    │<───┘               │                │
    │                    │                    │  Detecta cambio    │                │
    │                    │                    │  de estado         │                │
    │                    │                    │  para agente-123   │                │
    │                    │                    │                    │                │
    │                    │                    │  Llama             │                │
    │                    │                    │  officeState.      │                │
    │                    │                    │  setAgentDeptByStatus(123, 'responding')
    │                    │                    │─────────────────>│                │
    │                    │                    │                    │ Determina dept │
    │                    │                    │                    │ = RESPONDING   │
    │                    │                    │                    │                │
    │                    │                    │                    │ Si cambió de   │
    │                    │                    │                    │ departamento:  │
    │                    │                    │                    │                │
    │                    │                    │                    │ 1. Busca tile  │
    │                    │                    │                    │    aleatorio   │
    │                    │                    │                    │    en zona     │
    │                    │                    │                    │                │
    │                    │                    │                    │ 2. Calcula     │
    │                    │                    │                    │    pathfinding │
    │                    │                    │                    │                │
    │                    │                    │                    │ 3. Inicia      │
    │                    │                    │                    │    movimiento  │
    │                    │                    │                    │    (WALK)      │
    │                    │                    │                    │                │
    │                    │                    │                    │─────┐          │
    │                    │                    │                    │     │          │
    │                    │                    │                    │<────┘          │
    │                    │                    │                    │                │
    │                    │                    │                    │  Loop de       │
    │                    │                    │                    │  animación     │
    │                    │                    │                    │  cada frame    │
    │                    │                    │                    │───────────────>│
    │                    │                    │                    │                │
    │                    │                    │                    │  Renderiza     │
    │                    │                    │                    │  agente        │
    │                    │                    │                    │  caminando     │
    │                    │                    │                    │                │
    │                    │                    │                    │<───────────────│
    │                    │                    │                    │  (cada 16ms)   │
    │                    │                    │                    │                │
    │                    │                    │                    │  Al llegar:   │
    │                    │                    │                    │  state = TYPE  │
    │                    │                    │                    │                │
    │                    │                    │                    │─────┐          │
    │                    │                    │                    │     │          │
    │                    │                    │                    │<────┘          │
    │                    │                    │                    │                │
    │                    │                    │                    │  Renderiza     │
    │                    │                    │                    │  agente        │
    │                    │                    │                    │  sentado       │
    │                    │                    │                    │  trabajando    │
    │                    │                    │                    │───────────────>│
    │                    │                    │                    │                │
```

### 4.2 Proceso Detallado

**Paso 1: Detección de Cambio de Estado**
- Supabase Realtime detecta cambio en `wp_mensajes`
- `useAgentStates` actualiza el estado del agente
- Se detecta diferencia entre estado anterior y nuevo

**Paso 2: Determinación de Departamento**
- Se llama `getDepartmentForStatus(newStatus)`
- Retorna el `DepartmentId` correspondiente
- Ejemplo: `'responding'` → `DepartmentId.RESPONDING`

**Paso 3: Verificación de Cambio**
- Se compara `currentDeptId` vs `newDeptId`
- Si son iguales: no se hace nada (agente ya está donde debe)
- Si son diferentes: se inicia proceso de movimiento

**Paso 4: Cálculo de Destino**
- Se obtiene departamento de `officeState.departments`
- Se llama `getRandomTileInDepartment(department)`
- Retorna coordenadas `{col, row}` aleatorias dentro de la zona

**Paso 5: Pathfinding**
- Se ejecuta `findPath(currentCol, currentRow, targetCol, targetRow)`
- Algoritmo A* considera obstáculos (muebles, paredes)
- Se genera array de pasos `[{col, row}, {col, row}, ...]`

**Paso 6: Movimiento**
- Se asigna `character.path = calculatedPath`
- Se cambia `character.state = CharacterState.WALK`
- Se inicia animación de caminata

**Paso 7: Llegada y Actividad**
- Al completar el path, `character.path = []`
- Se cambia estado según actividad:
  - Si está activo: `CharacterState.TYPE` (escribiendo)
  - Si está inactivo: `CharacterState.IDLE` (sentado esperando)

---

## 5. API Reference

### 5.1 OfficeState Methods

#### `setAgentDepartmentByStatus(agentId: number, status: string): void`

**Descripción:** Actualiza el departamento de un agente basándose en su estado actual.

**Parámetros:**
- `agentId` (number): ID numérico del agente
- `status` (string): Estado actual del agente (ej: 'responding', 'idle')

**Comportamiento:**
1. Obtiene el personaje del agente
2. Si no existe, retorna sin acción
3. Determina el departamento correspondiente al estado
4. Si el departamento cambió, llama `sendToDepartment()`

**Ejemplo:**
```typescript
officeState.setAgentDepartmentByStatus(123, 'responding');
// Agente 123 se moverá al departamento RESPONDING (azul)
```

---

#### `sendToDepartment(agentId: number, departmentId: DepartmentId): boolean`

**Descripción:** Envía un agente a un departamento específico usando pathfinding.

**Parámetros:**
- `agentId` (number): ID del agente a mover
- `departmentId` (DepartmentId): ID del departamento destino

**Retorna:** `boolean` - `true` si se inició el movimiento, `false` si falló

**Comportamiento:**
1. Verifica que el agente exista y no sea sub-agente
2. Obtiene el departamento de la lista
3. Busca tile aleatorio en la zona del departamento
4. Calcula pathfinding al destino
5. Si hay path, inicia movimiento y retorna `true`
6. Si no hay path, intenta buscar tile walkable más cercano
7. Si todo falla, retorna `false`

**Ejemplo:**
```typescript
const success = officeState.sendToDepartment(123, DepartmentId.SCHEDULING);
if (success) {
  console.log('Agente moviéndose a Agendamiento');
}
```

---

#### `getAgentDepartment(agentId: number): DepartmentId | null`

**Descripción:** Obtiene el departamento actual asignado a un agente.

**Parámetros:**
- `agentId` (number): ID del agente

**Retorna:** `DepartmentId` del departamento actual, o `null` si no está asignado

**Ejemplo:**
```typescript
const deptId = officeState.getAgentDepartment(123);
if (deptId === DepartmentId.RESPONDING) {
  console.log('Agente está en Mensajes');
}
```

---

#### `isAgentInDepartment(agentId: number): boolean`

**Descripción:** Verifica si un agente está físicamente dentro de su departamento asignado.

**Parámetros:**
- `agentId` (number): ID del agente

**Retorna:** `boolean` - `true` si el agente está en su zona, `false` si no

**Uso típico:**
- Verificar si agente llegó a destino
- Mostrar indicadores visuales
- Lógica de "ya está donde debe estar"

**Ejemplo:**
```typescript
if (!officeState.isAgentInDepartment(123)) {
  // Agente aún no llega a su departamento
  showTravelingIndicator(123);
}
```

---

#### `getDepartments(): Department[]`

**Descripción:** Retorna la lista completa de departamentos configurados.

**Retorna:** Array de objetos `Department`

**Ejemplo:**
```typescript
const depts = officeState.getDepartments();
depts.forEach(dept => {
  console.log(`${dept.name}: ${dept.zoneTiles.length} tiles`);
});
```

---

### 5.2 Utility Functions (departments.ts)

#### `getDepartments(cols: number, rows: number): Department[]`

**Descripción:** Genera la configuración de departamentos para un layout de oficina.

**Parámetros:**
- `cols` (number): Número de columnas del layout
- `rows` (number): Número de filas del layout

**Retorna:** Array de 4 departamentos con zonas calculadas

**Lógica:**
- Divide la oficina en 4 cuadrantes
- Cada departamento ocupa un cuadrante
- Calcula `zoneTiles` para cada departamento
- Posiciona labels en bordes apropiados

---

#### `getDepartmentForStatus(status: string): DepartmentId`

**Descripción:** Mapea un estado de agente a su departamento correspondiente.

**Parámetros:**
- `status` (string): Estado del agente

**Retorna:** `DepartmentId` asignado

**Mapeo:**
| Estado | Departamento |
|--------|--------------|
| `responding`, `thinking`, `sending` | `RESPONDING` |
| `qualifying` | `QUALIFYING` |
| `scheduling` | `SCHEDULING` |
| `idle`, `paused`, `waiting` | `REST` |
| (otros) | `REST` (default) |

---

#### `getRandomTileInDepartment(department: Department): {col, row} | null`

**Descripción:** Selecciona un tile aleatorio dentro de la zona de un departamento.

**Parámetros:**
- `department` (Department): Objeto departamento

**Retorna:** Coordenadas `{col, row}` o `null` si no hay tiles

**Uso:** Posicionar agentes aleatoriamente dentro del departamento

---

## 6. Integración con Agentes

### 6.1 Flujo de Datos desde Supabase

```javascript
// useAgentStates.js - Simplified flow

const { agents, states, updateAgentDepartments } = useAgentStates(5000);

// Cuando cambia el estado de un agente:
useEffect(() => {
  if (officeState) {
    updateAgentDepartments(officeState);
  }
}, [states, officeState]);

// updateAgentDepartments implementación:
const updateAgentDepartments = useCallback((officeState) => {
  agents.forEach(agent => {
    const status = states[agent.id];
    if (status) {
      officeState.setAgentDepartmentByStatus(agent.id, status);
    }
  });
}, [agents, states]);
```

### 6.2 Estados del Agente y Transiciones

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CICLO DE VIDA DEL AGENTE                         │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │    IDLE     │◄─────────────────────────────┐
                    │   (REST)    │                              │
                    │   Gris      │                              │
                    └──────┬──────┘                              │
                           │                                    │
                           │ Nuevo mensaje                     │
                           ▼                                    │
                    ┌─────────────┐                            │
                    │  THINKING   │◄──────────┐                │
                    │ (RESPONDING)│            │                │
                    │    Azul     │            │                │
                    └──────┬──────┘            │                │
                           │                   │                │
                           │ Procesando        │ Respuesta      │ No hay
                           ▼                   │ enviada        │ actividad
                    ┌─────────────┐            │                │
                    │  RESPONDING │────────────┘                │
                    │   (ACTIVE)  │                             │
                    │    Azul     │                             │
                    └──────┬──────┘                             │
                           │                                     │
                           │ Calificar lead                     │
                           ▼                                     │
                    ┌─────────────┐                             │
                    │  QUALIFYING │                             │
                    │   (ACTIVE)  │                             │
                    │   Naranja   │                             │
                    └──────┬──────┘                             │
                           │                                     │
                           │ Agendar cita                       │
                           ▼                                     │
                    ┌─────────────┐                             │
                    │  SCHEDULING │                             │
                    │   (ACTIVE)  │                             │
                    │   Verde     │                             │
                    └──────┬──────┘                             │
                           │                                     │
                           │ Tarea completada                   │
                           └─────────────────────────────────────┘
```

### 6.3 Configuración Visual por Estado

| Estado | Departamento | Animación | Color Indicador |
|--------|--------------|-----------|-----------------|
| `idle` | REST | Sentado, idle | ⚪ Gris |
| `responding` | RESPONDING | Sentado, typing | 🔵 Azul |
| `thinking` | RESPONDING | Sentado, typing (lento) | 🔵 Azul |
| `qualifying` | QUALIFYING | Sentado, typing | 🟠 Naranja |
| `scheduling` | SCHEDULING | Sentado, typing | 🟢 Verde |
| `sending` | RESPONDING | Sentado, typing (rápido) | 🔵 Azul |
| `waiting` | REST | Sentado, idle | ⚪ Gris |
| `paused` | REST | Sentado, idle | ⚪ Gris |

---

## 7. Mapeo de Estados

### 7.1 Tabla de Mapeo Completa

| Estado de Agente | Departamento Asignado | Prioridad |
|------------------|----------------------|-----------|
| `responding` | 🔵 RESPONDING | Alta |
| `thinking` | 🔵 RESPONDING | Alta |
| `sending` | 🔵 RESPONDING | Alta |
| `qualifying` | 🟠 QUALIFYING | Media |
| `scheduling` | 🟢 SCHEDULING | Media |
| `idle` | ⚪ REST | Baja |
| `waiting` | ⚪ REST | Baja |
| `paused` | ⚪ REST | Baja |
| `error` | ⚪ REST | Baja |
| `offline` | ⚪ REST | Baja |
| `unknown` | ⚪ REST | Baja |

### 7.2 Lógica de Prioridad

Los estados se evalúan en orden de prioridad:

1. **Estados de Comunicación (Alta):** `responding`, `thinking`, `sending`
   - Indican interacción activa con cliente
   - Prioridad máxima para atención visual

2. **Estados de Proceso (Media):** `qualifying`, `scheduling`
   - Indican trabajo en proceso específico
   - Segunda prioridad para seguimiento

3. **Estados de Espera (Baja):** `idle`, `waiting`, `paused`
   - Indican disponibilidad o inactividad
   - Default cuando no hay actividad definida

---

## 8. Diagrama de la Oficina

### 8.1 Layout por Defecto (40x24 tiles)

```
    0         10        20        30        40  (cols)
    │         │         │         │         │
    ▼         ▼         ▼         ▼         ▼
   ┌─────────────────────────────────────────────┐
 0 │                                             │
   │  ┌─────────────────┐  ┌─────────────────┐   │
   │  │   🔵 RESPONDING │  │  🟠 QUALIFYING  │   │
   │  │   MENSAJES      │  │   LEADS         │   │
 6 │  │                 │  │                 │   │
   │  │   [Agents]      │  │   [Agents]      │   │
   │  │                 │  │                 │   │
   │  │                 │  │                 │   │
12 │  └─────────────────┘  └─────────────────┘   │
   │                                             │
   │  ┌─────────────────┐  ┌─────────────────┐   │
   │  │  🟢 SCHEDULING  │  │  ⚪ REST         │   │
   │  │  CITAS          │  │  DESCANSO       │   │
18 │  │                 │  │                 │   │
   │  │   [Agents]      │  │   [Agents]      │   │
   │  │                 │  │                 │   │
   │  │                 │  │                 │   │
24 │  └─────────────────┘  └─────────────────┘   │
   └─────────────────────────────────────────────┘

Leyenda:
[Agents] = Posiciones donde pueden estar agentes
🔵 = Departamento Azul (Mensajes)
🟠 = Departamento Naranja (Leads)
🟢 = Departamento Verde (Citas)
⚪ = Departamento Gris (Descanso)
```

### 8.2 Zonas de Tiles por Departamento

| Departamento | Rango de Tiles (col, row) | Área aproximada |
|--------------|---------------------------|-----------------|
| RESPONDING | (2,4) a (18,10) | ~136 tiles |
| QUALIFYING | (22,4) a (38,10) | ~136 tiles |
| SCHEDULING | (2,14) a (18,20) | ~136 tiles |
| REST | (22,14) a (38,20) | ~136 tiles |

---

## 9. Implementación Técnica

### 9.1 Archivos Modificados/Creados

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/office2d/office/types.ts` | +22 | DepartmentId, Department interface |
| `src/office2d/office/layout/departments.ts` | +176 | Configuración de departamentos |
| `src/office2d/office/engine/officeState.ts` | +95 | Lógica de movimiento y estado |
| `src/hooks/useAgentStates.js` | +15 | updateAgentDepartments function |

### 9.2 Dependencias

```typescript
// departments.ts
import type { Department, DepartmentId } from '../types';
import { DepartmentId as DeptId } from '../types';

// officeState.ts
import type { Character, Department, DepartmentId, ... } from '../types';
import { getDepartments, getDepartmentForStatus, getRandomTileInDepartment } from '../layout/departments';

// useAgentStates.js
// No new imports - uses existing officeState reference
```

### 9.3 Tests Sugeridos

```typescript
// departments.test.ts - Ejemplos de tests

describe('Department System', () => {
  test('should create 4 departments for 40x24 layout', () => {
    const depts = getDepartments(40, 24);
    expect(depts).toHaveLength(4);
    expect(depts.map(d => d.id)).toContain('responding');
    expect(depts.map(d => d.id)).toContain('qualifying');
    expect(depts.map(d => d.id)).toContain('scheduling');
    expect(depts.map(d => d.id)).toContain('rest');
  });

  test('should map responding status to RESPONDING department', () => {
    expect(getDepartmentForStatus('responding')).toBe(DepartmentId.RESPONDING);
    expect(getDepartmentForStatus('thinking')).toBe(DepartmentId.RESPONDING);
    expect(getDepartmentForStatus('sending')).toBe(DepartmentId.RESPONDING);
  });

  test('should return random tile within department zone', () => {
    const dept = getDepartments(40, 24)[0]; // RESPONDING
    const tile = getRandomTileInDepartment(dept);
    
    expect(tile).not.toBeNull();
    expect(tile!.col).toBeGreaterThanOrEqual(2);
    expect(tile!.col).toBeLessThan(20);
    expect(tile!.row).toBeGreaterThanOrEqual(4);
    expect(tile!.row).toBeLessThan(12);
  });

  test('should move agent to department when status changes', () => {
    const office = new OfficeState();
    office.addAgent(123, 'Agente Test', 0);
    
    // Initially should be in rest (default)
    office.setAgentDepartmentByStatus(123, 'idle');
    expect(office.getAgentDepartment(123)).toBe(DepartmentId.REST);
    
    // Change to responding
    office.setAgentDepartmentByStatus(123, 'responding');
    expect(office.getAgentDepartment(123)).toBe(DepartmentId.RESPONDING);
  });
});
```

---

## 10. Testing y Verificación

### 10.1 Verificación Manual

```bash
# 1. Verificar tipos
npx tsc --noEmit src/office2d/office/types.ts

# 2. Verificar departamentos
npx tsc --noEmit src/office2d/office/layout/departments.ts

# 3. Verificar officeState
npx tsc --noEmit src/office2d/office/engine/officeState.ts

# 4. Ejecutar aplicación
npm run dev
```

### 10.2 Checklist de Verificación Visual

- [ ] Abrir la oficina 2D
- [ ] Verificar que los 4 departamentos están definidos
- [ ] Confirmar que cada departamento tiene color distintivo
- [ ] Verificar que agentes aparecen en departamentos según estado
- [ ] Cambiar estado de agente y confirmar movimiento
- [ ] Verificar pathfinding evade obstáculos
- [ ] Confirmar animación de caminata durante movimiento
- [ ] Verificar que al llegar, agente adopta estado TYPE o IDLE

### 10.3 Escenarios de Prueba

| Escenario | Entrada | Resultado Esperado |
|-----------|---------|-------------------|
| Agente pasa de idle a responding | Estado cambia a 'responding' | Agente se mueve a departamento azul |
| Agente calificando lead | Estado 'qualifying' | Agente en departamento naranja |
| Agente agendando | Estado 'scheduling' | Agente en departamento verde |
| Agente sin actividad | Estado 'idle' | Agente en departamento gris |
| Múltiples agentes en mismo dept | 5 agentes en 'responding' | 5 agentes distribuidos en zona azul |
| Cambio rápido de estados | idle → responding → idle | Agente se mueve a azul, luego vuelve a gris |
| Obstáculos en camino | Mueble bloqueando path | Agente encuentra ruta alternativa |
| Layout pequeño | 20x12 tiles | Departamentos se ajustan al tamaño |

---

## Apéndice A: Constantes y Configuración

### A.1 Colores de Departamentos

```typescript
export const DEPARTMENT_COLORS: Record<DepartmentId, { primary: string; light: string; text: string }> = {
  [DeptId.RESPONDING]: {
    primary: '#3B82F6',    // Blue 500
    light: '#93C5FD',      // Blue 300
    text: '#FFFFFF',       // White
  },
  [DeptId.QUALIFYING]: {
    primary: '#F59E0B',    // Amber 500
    light: '#FCD34D',      // Amber 300
    text: '#1F2937',       // Gray 800
  },
  [DeptId.SCHEDULING]: {
    primary: '#10B981',    // Emerald 500
    light: '#6EE7B7',      // Emerald 300
    text: '#FFFFFF',       // White
  },
  [DeptId.REST]: {
    primary: '#6B7280',    // Gray 500
    light: '#9CA3AF',      // Gray 400
    text: '#FFFFFF',       // White
  },
};
```

### A.2 Nombres de Departamentos

```typescript
export const DEPARTMENT_NAMES: Record<DepartmentId, string> = {
  [DeptId.RESPONDING]: 'Respondiendo mensajes',
  [DeptId.QUALIFYING]: 'Calificando lead',
  [DeptId.SCHEDULING]: 'Agendando cita',
  [DeptId.REST]: 'Descanso',
};
```

---

## Apéndice B: Troubleshooting

### B.1 Problemas Comunes

**Problema:** Agente no se mueve al cambiar de estado  
**Causa posible:** Pathfinding no encuentra ruta válida  
**Solución:** Verificar que hay tiles caminables en el departamento destino

**Problema:** Agente se queda atascado  
**Causa posible:** Obstáculo bloquea todos los paths  
**Solución:** Sistema tiene fallback a tile más cercano walkable

**Problema:** Departamentos no aparecen visuales  
**Causa posible:** Renderizado de departamentos no implementado  
**Nota:** La lógica existe pero el renderizado visual de labels/zonas es mejora futura

**Problema:** Agente aparece en departamento incorrecto  
**Causa posible:** Mapeo de estado incorrecto  
**Verificación:** Revisar función `getDepartmentForStatus()`

---

## Apéndice C: Mejoras Futuras Sugeridas

1. **Renderizado Visual de Departamentos**
   - Mostrar labels de departamento en el canvas
   - Colorear pisos con `colorLight`
   - Mostrar bordes delimitadores

2. **Estadísticas de Departamentos**
   - Contador de agentes por departamento
   - Tiempo promedio en cada departamento
   - Gráficos de flujo entre departamentos

3. **Personalización**
   - Configurar posiciones de departamentos desde UI
   - Permitir más de 4 departamentos
   - Personalizar colores por departamento

4. **Animaciones Avanzadas**
   - Efecto de transición al cambiar departamento
   - Indicador visual de dirección durante movimiento
   - Partículas o efectos especiales por departamento

5. **Sonidos**
   - Sonido al llegar a departamento
   - Tonos diferentes por departamento
   - Alertas cuando muchos agentes en REST

---

**Fin de Documentación**

*Documento generado el 31 de Marzo, 2026*  
*Para: UAL Office Virtual Agent v4.3.2026*  
*Sistema: Departamentos de Estado*
