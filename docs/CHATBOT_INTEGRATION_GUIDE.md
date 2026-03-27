# Guía de Integración: Chatbots Externos ↔ Agentes CRM

## Arquitectura de Sincronización Bidireccional

Esta guía explica cómo conectar tus chatbots externos (WhatsApp, Facebook Messenger, Instagram, etc.) con los agentes del CRM AI Office Virtual Agent, logrando sincronización de actividad en tiempo real.

---

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE MENSAJES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

USUARIO FINAL                                          CRM AI OFFICE
     │                                                         │
     │  1. Envía mensaje                                       │
     │ ─────────────────►                                      │
     │                                                         │
┌────▼─────┐                                          ┌─────────▼──────────┐
│ Chatbot  │                                          │  Edge Function     │
│ Externo  │                                          │  chatbot-webhook   │
│(WhatsApp)│                                          └─────────┬──────────┘
└────┬─────┘                                                    │
     │  2. POST a webhook                                      │
     │ ───────────────────────────────────────────────────────►│
     │                                                         │
     │                                              ┌──────────▼──────────┐
     │                                              │  Función RPC        │
     │                                              │  receive_chatbot_   │
     │                                              │  message()          │
     │                                              └──────────┬──────────┘
     │                                                         │
     │                                              ┌──────────▼──────────┐
     │                                              │  Tablas:            │
     │                                              │  - chatbot_          │
     │                                              │    conversations    │
     │                                              │  - chatbot_messages │
     │                                              └──────────┬──────────┘
     │                                                         │
     │                                              ┌──────────▼──────────┐
     │                                              │  Supabase Realtime  │
     │                                              │  (broadcast)        │
     │                                              └──────────┬──────────┘
     │                                                         │
     │                              ┌──────────────────────────┘
     │                              │
     │                              ▼
     │                  ┌─────────────────────┐
     │                  │  Office Virtual UI  │
     │                  │  (Agente ve mensaje)│
     │                  └──────────┬────────────┘
     │                             │
     │                  3. Agente responde
     │                             │
     │                  ┌──────────▼────────────┐
     │                  │  Hook useChatbot      │
     │                  │  AgentSync            │
     │                  │  sendResponse()       │
     │                  └──────────┬────────────┘
     │                             │
     │                  ┌──────────▼────────────┐
     │                  │  Edge Function        │
     │                  │  chatbot-send-response│
     │                  └──────────┬────────────┘
     │                             │
     │                  ┌──────────▼────────────┐
     │  4. Webhook a    │  POST a webhook        │
     │ ◄─────────────── │  externo             │
     │     chatbot      └────────────────────────┘
     │
┌────▼─────┐
│ Usuario  │
│ recibe   │
│ respuesta│
└──────────┘
```

---

## Componentes Creados

### 1. Base de Datos

| Tabla | Propósito |
|-------|-----------|
| `chatbot_integrations` | Configuración de cada chatbot externo conectado |
| `chatbot_conversations` | Conversaciones individuales entre usuarios y agentes |
| `chatbot_messages` | Mensajes dentro de cada conversación |

### 2. Edge Functions

| Function | URL | Propósito |
|----------|-----|-----------|
| `chatbot-webhook` | `/functions/v1/chatbot-webhook` | Recibe mensajes de chatbots externos |
| `chatbot-send-response` | `/functions/v1/chatbot-send-response` | Envía respuestas a chatbots externos |

### 3. Hooks React

| Hook | Propósito |
|------|-----------|
| `useChatbotAgentSync` | Sincronización bidireccional en tiempo real |

---

## Configuración Paso a Paso

### Paso 1: Aplicar Migración de Base de Datos

```bash
# Aplicar la migración SQL
supabase db push

# O manualmente
supabase migration up
```

Esto creará:
- Las 3 tablas de chatbot
- Las funciones RPC para enrutamiento
- Las políticas RLS de seguridad
- Los índices para performance

### Paso 2: Deploy Edge Functions

```bash
# Deploy de las edge functions
deno run -A supabase/functions/chatbot-webhook/index.ts
deno run -A supabase/functions/chatbot-send-response/index.ts

# O usando Supabase CLI
supabase functions deploy chatbot-webhook
supabase functions deploy chatbot-send-response
```

### Paso 3: Configurar Chatbot en el CRM

Usa la siguiente SQL para registrar tu chatbot:

```sql
-- Insertar configuración de chatbot
INSERT INTO chatbot_integrations (
  empresa_id,
  nombre,
  tipo,
  webhook_url,              -- URL donde el CRM enviará respuestas
  webhook_secret,           -- Secret para firmar requests
  agente_id,                -- Agente asignado (null = auto-asignar)
  distribucion_mode,        -- 'fixed', 'round_robin', 'least_busy'
  respuesta_automatica,
  horario_atencion
) VALUES (
  1,                        -- ID de tu empresa
  'WhatsApp Business API',  -- Nombre descriptivo
  'whatsapp',               -- Tipo: whatsapp|facebook|instagram|telegram|web|api
  'https://api.twilio.com/...',  -- URL de tu proveedor de WhatsApp
  'sk_chatbot_webhook_secret',    -- Genera un secret seguro
  null,                     -- null = auto-asignar según distribucion_mode
  'round_robin',            -- Distribuye conversaciones entre agentes
  false,                    -- true = responde automáticamente con agente AI
  '{"timezone": "America/Mexico_City", "schedule": {...}}'::jsonb
);

-- Obtener el ID generado
SELECT id FROM chatbot_integrations WHERE nombre = 'WhatsApp Business API';
-- Anota este ID, lo necesitarás para configurar el webhook externo
```

### Paso 4: Configurar Webhook Externo

En tu plataforma de chatbot (Twilio, Meta, etc.), configura el webhook:

**URL del Webhook:**
```
https://[TU_PROYECTO].supabase.co/functions/v1/chatbot-webhook
```

**Payload esperado (JSON):**
```json
{
  "chatbot_id": 1,                    // ID del chatbot en el CRM
  "external_conversation_id": "conv_123",  // ID de conversación externo
  "external_user_id": "user_456",      // ID del usuario
  "external_user_name": "Juan Pérez",  // Nombre del usuario
  "external_user_phone": "+5215512345678", // Teléfono (WhatsApp)
  "message": {
    "id": "msg_789",                   // ID del mensaje externo
    "content": "Hola, tengo una pregunta",
    "type": "text",                    // text|image|audio|file|location
    "metadata": {}                     // Info adicional
  },
  "timestamp": "2026-03-25T10:30:00Z"
}
```

**Headers requeridos:**
- `Content-Type: application/json`
- `Authorization: Bearer [opcional si configuras]`

### Paso 5: Usar el Hook en el Frontend

```jsx
import { useChatbotAgentSync } from '../hooks/useChatbotAgentSync';

function AgentChatInterface({ agenteId }) {
  const {
    conversations,        // Lista de conversaciones asignadas
    activeConversation,   // Conversación seleccionada
    messages,            // Mensajes de la conversación activa
    isLoading,
    error,
    stats,               // { total, active, waiting, unread }
    
    // Acciones
    sendResponse,        // Enviar respuesta al usuario
    closeConversation,   // Cerrar conversación
    selectConversation,  // Seleccionar conversación
    refresh             // Recargar lista
  } = useChatbotAgentSync(agenteId, {
    pollInterval: 5000,     // Polling cada 5 segundos
    enableRealtime: true,   // Usar Supabase Realtime
    autoAssign: true        // Auto-asignar conversaciones
  });

  // Renderizar lista de conversaciones
  return (
    <div className="chat-interface">
      {/* Sidebar: Lista de conversaciones */}
      <div className="conversations-list">
        <h3>Conversaciones ({stats.total})</h3>
        <p>Pendientes: {stats.unread}</p>
        
        {conversations.map(conv => (
          <div 
            key={conv.conversation_id}
            onClick={() => selectConversation(conv)}
            className={conv.mensajes_pendientes > 0 ? 'unread' : ''}
          >
            <strong>{conv.external_user_name}</strong>
            <span>{conv.chatbot_nombre}</span>
            <p>{conv.ultimo_mensaje?.substring(0, 50)}...</p>
            {conv.mensajes_pendientes > 0 && (
              <span className="badge">{conv.mensajes_pendientes}</span>
            )}
          </div>
        ))}
      </div>

      {/* Chat activo */}
      {activeConversation && (
        <div className="active-chat">
          <div className="messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.remitente}`}>
                <p>{msg.contenido}</p>
                <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleSend}>
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Escribe tu respuesta..."
            />
            <button type="submit">Enviar</button>
          </form>
          
          <button onClick={() => closeConversation(activeConversation.conversation_id)}>
            Cerrar conversación
          </button>
        </div>
      )}
    </div>
  );

  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    await sendResponse(
      activeConversation.conversation_id,
      newMessage,
      { type: 'text' }
    );
    
    setNewMessage('');
  }
}
```

---

## Flujo de Datos Detallado

### 1. Recepción de Mensajes (Chatbot → CRM)

```javascript
// Tu servidor de chatbot (Twilio, Meta, etc.) recibe mensaje
app.post('/webhook/whatsapp', async (req, res) => {
  const { From, Body, MessageSid } = req.body;
  
  // Enviar al CRM
  const response = await fetch(
    'https://[TU_PROYECTO].supabase.co/functions/v1/chatbot-webhook',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatbot_id: 1,                        // Tu ID de chatbot
        external_conversation_id: From,      // Teléfono del usuario
        external_user_id: From,
        external_user_name: req.body.ProfileName || 'Usuario',
        external_user_phone: From,
        message: {
          id: MessageSid,
          content: Body,
          type: 'text',
          metadata: {}
        }
      })
    }
  );
  
  res.sendStatus(200);
});
```

### 2. Procesamiento en el CRM

La edge function `chatbot-webhook`:

1. **Valida el payload**
   - Verifica que tenga todos los campos requeridos
   - Valida que el chatbot_id existe y está activo

2. **Crea/actualiza conversación**
   - Si es mensaje nuevo: crea conversación y enruta a agente
   - Si conversación existe: agrega mensaje

3. **Enruta al agente**
   - `fixed`: Asigna al agente configurado
   - `round_robin`: Distribuye equitativamente
   - `least_busy`: Asigna al agente con menos carga

4. **Notifica en tiempo real**
   - Emite evento Realtime al canal del agente
   - Actualiza el estado del agente a "responding"
   - Dispara evento para animaciones del Office Virtual

### 3. El Agente Responde (CRM → Chatbot)

```javascript
// El hook useChatbotAgentSync llama a:
const sendResponse = async (conversationId, content) => {
  // 1. Registra mensaje en BD
  await supabase.rpc('send_chatbot_response', { ... });
  
  // 2. Llama a edge function
  await fetch('/functions/v1/chatbot-send-response', {
    method: 'POST',
    body: JSON.stringify({
      conversation_id: conversationId,
      content: content,
      type: 'text'
    })
  });
};
```

La edge function `chatbot-send-response`:

1. Obtiene configuración del webhook externo
2. Construye payload con la respuesta
3. Envía al webhook de tu proveedor (Twilio, Meta, etc.)
4. Maneja reintentos si falla
5. Actualiza estado en BD

---

## Modos de Distribución

### 1. Fixed (Agente Específico)

```sql
UPDATE chatbot_integrations 
SET agente_id = 5, distribucion_mode = 'fixed'
WHERE id = 1;
```
Todas las conversaciones van al agente 5.

### 2. Round Robin

```sql
UPDATE chatbot_integrations 
SET distribucion_mode = 'round_robin'
WHERE id = 1;
```
Distribuye equitativamente entre todos los agentes activos.

### 3. Least Busy

```sql
UPDATE chatbot_integrations 
SET distribucion_mode = 'least_busy'
WHERE id = 1;
```
Asigna al agente con menos conversaciones activas.

### 4. Skill Based (Futuro)

Requiere extensión: asignar conversaciones según etiquetas/skills.

---

## Sincronización con Office Virtual

El hook `useChatbotAgentSync` integra con el GameEngine:

```javascript
// Cuando llega mensaje nuevo:
window.dispatchEvent(new CustomEvent('phaser:chatbotMessage', {
  detail: { 
    agenteId: agenteId,
    conversationId: newMessage.conversation_id,
    preview: newMessage.contenido?.substring(0, 50)
  }
}));
```

Esto permite:
- El agente en el office virtual "salta" o muestra animación
- Badge de mensajes pendientes en el avatar
- Sonido de notificación
- Cambio de estado a "responding"

---

## Seguridad

### Autenticación del Webhook

Recomendado: Firma HMAC de los payloads

```typescript
// En tu servidor de chatbot
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Enviar en header
headers: {
  'X-Webhook-Signature': signature
}

// La edge function verifica
const isValid = verifySignature(payload, signature, secret);
```

### Rate Limiting

Ya implementado en las edge functions:
- 10 requests/min por IP
- 30 requests/min por endpoint

### RLS Policies

Las tablas tienen RLS:
- Solo usuarios autenticados de la empresa pueden ver sus datos
- Agente solo ve conversaciones asignadas a él

---

## Troubleshooting

### Mensajes no llegan al CRM

1. Verificar URL del webhook
2. Revisar logs de la edge function:
   ```bash
   supabase functions logs chatbot-webhook --tail
   ```
3. Verificar que chatbot_id existe y está activo

### Respuestas no llegan al usuario

1. Verificar webhook_url configurado
2. Revisar logs:
   ```bash
   supabase functions logs chatbot-send-response --tail
   ```
3. Verificar que webhook externo responde 200

### Agente no ve conversaciones

1. Verificar que agente_id está asignado
2. Revisar canal Realtime:
   ```javascript
   supabase.channel(`agent-chatbot:${agenteId}`).subscribe(console.log)
   ```
3. Usar polling como fallback (ya implementado)

---

## Próximas Mejoras

1. **Respuestas Automáticas con AI**
   - Integrar con `agent-voice-interaction`
   - Respuesta automática si agente no responde en X minutos

2. **Transferencia de Conversaciones**
   - Transferir de un agente a otro
   - Escalar a supervisor

3. **Análisis de Sentimiento**
   - Detectar clientes frustrados
   - Priorizar conversaciones automáticamente

4. **Histórico Unificado**
   - Ver todas las interacciones del cliente (chatbot + voice + manual)

---

## Ejemplo Completo: WhatsApp Business API

```javascript
// server.js - Tu servidor de WhatsApp
const express = require('express');
const app = express();

// Webhook de Twilio/WhatsApp
app.post('/webhook/whatsapp', express.urlencoded({ extended: false }), async (req, res) => {
  const { From, Body, MessageSid, ProfileName } = req.body;
  
  // Configuración
  const CRM_WEBHOOK_URL = 'https://[TU_PROYECTO].supabase.co/functions/v1/chatbot-webhook';
  const CHATBOT_ID = 1;
  
  try {
    const response = await fetch(CRM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatbot_id: CHATBOT_ID,
        external_conversation_id: From,
        external_user_id: From,
        external_user_name: ProfileName || 'Usuario WhatsApp',
        external_user_phone: From,
        message: {
          id: MessageSid,
          content: Body,
          type: 'text',
          metadata: { source: 'whatsapp' }
        }
      })
    });
    
    if (!response.ok) {
      console.error('CRM Error:', await response.text());
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error:', error);
    res.sendStatus(500);
  }
});

// Webhook para recibir respuestas del CRM
app.post('/webhook/crm-response', express.json(), async (req, res) => {
  const { conversation, message } = req.body;
  
  // Enviar mensaje de vuelta al usuario vía Twilio
  await twilioClient.messages.create({
    from: 'whatsapp:+[TU_NUMERO]',
    to: conversation.external_user_id,
    body: message.content
  });
  
  res.sendStatus(200);
});

app.listen(3000);
```

---

## Referencias

- **Migración SQL:** `supabase/migrations/20260325220000_chatbot_integration.sql`
- **Edge Function Inbound:** `supabase/functions/chatbot-webhook/index.ts`
- **Edge Function Outbound:** `supabase/functions/chatbot-send-response/index.ts`
- **Hook React:** `src/hooks/useChatbotAgentSync.js`

---

*Documentación generada: 25 de Marzo, 2026*
*Versión: 1.0*
