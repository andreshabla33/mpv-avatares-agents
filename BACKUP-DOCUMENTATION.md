# UAL Office Virtual Agent - Estado Actual del Proyecto
**Backup Documentation - 2 Mar 2026**

## 🎯 Proyecto Completamente Funcional
**UAL Office Virtual Agent** - Mission Control Dashboard para múltiples agentes de IA conversacionales

## 📂 Estructura del Proyecto

```
pixel-office/
├── public/
├── src/
│   ├── components/
│   │   ├── App.jsx                 ✅ Header actualizado a "UAL Office Virtual Agent"
│   │   ├── PixelOffice.jsx         ✅ Canvas principal con agentes agrupados
│   │   ├── AgentDetail.jsx         ✅ Modal completo con trazabilidad avanzada
│   │   ├── ActivityFeed.jsx        ✅ Panel lateral optimizado
│   │   └── StatusBar.jsx           ✅ Barra de estado actualizada
│   ├── hooks/
│   │   └── useAgentStates.js       ✅ Hook principal con nueva estructura
│   ├── data/
│   │   └── agents.js               ✅ Mapeo de agentes con agrupación por empresa
│   └── main.jsx
├── supabase/functions/
│   └── agent-office-status/
│       ├── index.ts                ✅ Edge Function refactorizada completamente
│       └── index-backup.ts         🔄 Versión anterior como respaldo
├── package.json                    ✅ Nombre actualizado a "ual-office-virtual-agent"
├── index.html                      ✅ Título actualizado
└── README.md
```

## 🗄️ Estructura de Base de Datos

### **Tablas Principales:**
- **`wp_numeros`**: Cada registro = un agente separado en el sistema
  - `id` (PK) - Usado como agente único
  - `agente_id` - Referencia a wp_agentes
  - `empresa_id` - Referencia a wp_empresa_perfil
  - `activo` - Estado del número (true/false)
  - `canal` - WhatsApp, Instagram, etc.
  - `timezone` - Zona horaria del agente
  - `telefono` - Número específico

- **`wp_agentes`**: Información base del agente
  - `nombre_agente`, `rol`, `llm`

- **`wp_empresa_perfil`**: Información de la empresa cliente
  - `nombre_empresa`

- **`wp_conversaciones`**: Conversaciones por agente
  - `contacto_id` - Para trazabilidad exacta

- **`wp_mensajes`**: Mensajes individuales
  - `uso_herramientas` - Para thought traces
  - `contenido` - Para cálculo de tokens

## 🔧 Funcionalidades Implementadas

### **🎮 Canvas Principal (PixelOffice.jsx)**
- ✅ **Agentes agrupados por empresa** con offset visual
- ✅ **Movimiento dinámico** según estados de actividad
- ✅ **Zonas de acción**: Responding, Scheduling, Analyzing
- ✅ **Nombres diferenciados**: "Dra Smile (WHATSAPP)" vs "Dra Smile (INSTAGRAM)"
- ✅ **Información de empresa** mostrada bajo cada agente
- ✅ **Canvas responsivo** con escalado automático
- ✅ **Efectos visuales**: Scanlines, vignette, tooltips

### **📊 Modal de Agente (AgentDetail.jsx)**
- ✅ **Dos pestañas**: "MÉTRICAS Y CONTROL" + "HUELLAS DEL PENSAMIENTO"
- ✅ **Métricas de rendimiento**: Msgs/2m, /5m, /1h, /24h
- ✅ **Sección ESTADO Y TIEMPO**:
  - 🟢/🔴 Estado del número (ACTIVO/INACTIVO)
  - ⏰ Tiempo sin responder con colores intuitivos
  - 📅 Timestamp de última respuesta
- ✅ **Sección TRAZABILIDAD & FALLOS**:
  - 🚨 Mensajes sin respuesta (fallos n8n)
  - 💔 Conversaciones abandonadas
  - ⚠️ Alertas automáticas
- ✅ **System Info**: MODEL, CANAL, TIMEZONE, TELÉFONO, EMPRESA
- ✅ **Thought Traces**: Logs con contacto_id y conversacion_id
- ✅ **Botón PAUSE AGENT** funcional

### **🔄 Edge Function (agent-office-status/index.ts)**
- ✅ **Arquitectura multi-agente**: Cada wp_numeros es un agente separado
- ✅ **Consultas optimizadas**: 7 queries para datos completos
- ✅ **Trazabilidad completa**:
  - `contacto_id` en cada thought trace
  - Tiempo exacto sin responder
  - Mensajes sin respuesta del agente
  - Conversaciones abandonadas
- ✅ **Estados inteligentes**: Solo asigna estados específicos si número está activo
- ✅ **Datos enriquecidos**: timezone, canal, teléfono, empresa por agente

### **⚡ Sistema de Estados**
```javascript
ESTADOS = {
  'paused': 'Número inactivo',
  'overloaded': 'Sobrecargado',
  'scheduling': 'Agendando cita',
  'qualifying': 'Calificando lead',
  'sending': 'Enviando contenido',
  'responding': 'Respondiendo',
  'waiting': 'Esperando procesar',
  'working': 'Activo',
  'idle': 'Sin actividad'
}
```

### **📱 Panel Lateral (ActivityFeed.jsx)**
- ✅ **KPIs en tiempo real**: Mensajes/hora, conversaciones, agentes activos
- ✅ **Activity Log**: Stream de actividades por agente
- ✅ **Status Summary**: Contadores visuales por estado
- ✅ **Layout optimizado**: Sin scroll, viewport completo

## 🎨 Sistema Visual Actual

### **Agentes Actuales:**
- **Círculos de colores** con nombres diferenciados
- **Agrupación por empresa** con offset visual (25px, 15px)
- **Iconos de canal** (WA, IG, MS, etc.)
- **Speech bubbles** con texto de acción
- **Tooltips** al hacer hover

### **Layout 2D:**
- **Escritorios**: 4x3 grid para agentes activos
- **Sala OFF**: Para agentes sin datos
- **Zonas de acción**: 3 áreas específicas por actividad
- **Branding**: "UAL OFFICE" de fondo

## 🔄 API y Datos

### **Endpoint Principal:**
`https://vecspltvmyopwbjzerow.supabase.co/functions/v1/agent-office-status`

### **Estructura de Respuesta:**
```json
{
  "agents": [
    {
      "id": "number-123",
      "db_id": 123,
      "agente_id": 4,
      "name": "Dra Smile",
      "empresa": "Clínica Dental Miami",
      "telefono": "+1234567890",
      "timezone": "America/New_York",
      "canal": "whatsapp",
      "status": "responding",
      "thought_traces": [...],
      "minutes_without_response": 15,
      "number_is_active": true,
      "unanswered_msgs": 0,
      "abandoned_convs": 1
    }
  ],
  "kpis": { ... }
}
```

## 📋 Configuración de Deploy

### **Actual:**
- **Framework**: Vite + React 19
- **Styling**: TailwindCSS 4.2.1
- **Backend**: Supabase Edge Functions
- **Nombre del proyecto**: "ual-office-virtual-agent"

## 🎯 Caso de Uso Principal

### **Para Soporte a Clientes:**
1. Cliente reporta: "Dra Smile no responde"
2. Abrir Mission Control → Clic en agente específico
3. Ver inmediatamente:
   - ⏰ "2h 15m SIN RESPONDER" 
   - 🔴 "NÚMERO INACTIVO"
   - 📞 "+1234567890 (WhatsApp)"
   - 🌎 "Miami EST"
   - 📊 Conversaciones abandonadas: 3
   - 🚨 Mensajes sin respuesta: 1

## 💾 Archivos de Respaldo

- **`supabase/functions/agent-office-status/index-backup.ts`** - Edge Function anterior
- **Todo el proyecto actual** funcionando perfectamente antes de implementar 3D

## 🚀 Estado Listo para 3D

El proyecto está **100% funcional** con:
- ✅ Arquitectura multi-agente por número
- ✅ Trazabilidad completa
- ✅ Agrupación por empresa
- ✅ Sistema de soporte robusto
- ✅ UI/UX optimizada
- ✅ Branding actualizado a "UAL Office Virtual Agent"

**CHECKPOINT SEGURO** - Punto de retorno garantizado antes de implementar avatares 3D.
