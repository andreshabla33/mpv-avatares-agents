# Guía de Implementación de Seguridad - Paso a Paso

## Pre-Requisitos

Antes de comenzar, asegúrate de tener:
- [ ] Acceso al proyecto en Supabase
- [ ] Supabase CLI instalado y configurado
- [ ] Acceso al dashboard de OpenAI
- [ ] Permisos para hacer deploy de edge functions
- [ ] Node.js y npm instalados (para verificación local)

---

## Phase 1: Configuración de Variables de Entorno

### Paso 1.1: OpenAI API Key

```bash
# 1. Generar nueva API Key en OpenAI Dashboard
# Ir a: https://platform.openai.com/api-keys
# Click: "Create new secret key"
# Nombre: "UAL CRM Production"

# 2. Copiar la key (empieza con sk-...)

# 3. Configurar en Supabase
supabase secrets set OPENAI_API_KEY_WHISPER=sk-tu-key-aqui

# 4. Verificar que se guardó correctamente
supabase secrets list | grep OPENAI
```

**Verificación:**
```bash
# Test que la variable está configurada
supabase functions serve agent-voice-interaction
# Debe iniciar sin errores de "OPENAI_API_KEY_WHISPER no está configurada"
```

### Paso 1.2: Configurar FRONTEND_URL (CORS)

```bash
# Para desarrollo local
supabase secrets set FRONTEND_URL=http://localhost:5173

# Para producción (ejemplo con Netlify)
supabase secrets set FRONTEND_URL=https://ual-crm.netlify.app

# Para múltiples orígenes (separados por coma)
supabase secrets set FRONTEND_URL="https://app1.com,https://app2.com"
```

**Verificación:**
```bash
supabase secrets list | grep FRONTEND
```

### Paso 1.3: Variables Requeridas Checklist

Asegúrate de tener configuradas:

| Variable | Propósito | Estado |
|----------|-----------|--------|
| `OPENAI_API_KEY_WHISPER` | API de OpenAI | ✅ Requerido |
| `SUPABASE_URL` | URL del proyecto | Auto-configurado |
| `SUPABASE_ANON_KEY` | Key pública | Auto-configurado |
| `FRONTEND_URL` | CORS origen permitido | ✅ Requerido |

---

## Phase 2: Aplicar Migraciones de Base de Datos

### Paso 2.1: Migraciones de RLS (Ya existentes)

```bash
# Aplicar migraciones de seguridad
supabase db push

# O específicamente
supabase db reset  # ⚠️ Solo en desarrollo, borra datos
```

### Paso 2.2: Migración de Retención de Logs

```bash
# Aplicar migración específica
psql $DATABASE_URL -f supabase/migrations/20260325180000_retention_policy.sql

# O si usas migrations automáticas:
supabase migration up
```

**Verificación:**
```sql
-- Conectar a la base de datos y verificar:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agent_voice_logs';

-- Debe mostrar:
-- retention_policy
-- is_anonymized
```

---

## Phase 3: Deploy de Edge Functions

### Paso 3.1: Deploy de agent-voice-interaction

```bash
# Deploy de la función
supabase functions deploy agent-voice-interaction

# Verificar estado
supabase functions list
```

### Paso 3.2: Verificación Post-Deploy

```bash
# Logs de la función
supabase functions logs agent-voice-interaction --tail

# Debe mostrar que inicia sin errores
```

---

## Phase 4: Verificación de Seguridad

### Test 4.1: API Key Protegida

```bash
# Buscar API keys hardcodeadas en el código
grep -r "sk-" supabase/functions/

# Resultado esperado: vacío (o solo comentarios)

# Verificar que no hay fallback
supabase functions serve agent-voice-interaction
# Sin OPENAI_API_KEY_WHISPER configurada, debe dar error
```

### Test 4.2: Autenticación Requerida

```bash
# Test sin Authorization header
curl -X POST https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction \
  -F "audio=@test.webm" \
  -F "agente_id=1"

# Resultado esperado:
# HTTP 401
# {"error":"Unauthorized - Se requiere token de autenticación válido"}
```

### Test 4.3: CORS Estricto

```bash
# Test desde origen permitido
curl -X OPTIONS \
  -H "Origin: https://ual-crm.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction

# Debe retornar: Access-Control-Allow-Origin: https://ual-crm.netlify.app

# Test desde origen no permitido
curl -X OPTIONS \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction

# No debe permitir el origen
```

### Test 4.4: SessionStorage (Frontend)

```bash
# En el proyecto frontend
grep -r "localStorage" src/

# Resultado esperado: vacío o solo comentarios
grep -r "sessionStorage" src/

# Resultado esperado: archivos modificados
```

---

## Phase 5: Configuración de Producción

### Paso 5.1: Security Headers (Netlify)

El archivo `netlify.toml` ya está configurado. Verificar:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    Content-Security-Policy = "default-src 'self'; ..."
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "microphone=(self)"
```

### Paso 5.2: Archivos de Seguridad

Verificar que existen:
- [ ] `public/robots.txt` - Evita indexación
- [ ] `public/.well-known/security.txt` - Reporte de vulnerabilidades
- [ ] Meta tags en `index.html` - Referrer policy, etc.

### Paso 5.3: Audit Logging

```bash
# Verificar que los logs de seguridad funcionan
supabase functions logs agent-voice-interaction --tail

# Hacer un request inválido (sin auth)
curl -X POST https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction

# Debe aparecer en logs:
# [SECURITY_AUDIT] {"event_type":"auth_failure",...}
```

---

## Phase 6: Configuración Opcional

### Opción A: pg_cron para Limpieza Automática

```sql
-- Instalar extensión (desde Supabase Dashboard)
-- Database → Extensions → pg_cron → Enable

-- Crear job
SELECT cron.schedule(
    'daily-voice-logs-cleanup',
    '0 3 * * *',  -- 3:00 AM todos los días
    'SELECT anonymize_old_logs()'
);

-- Verificar
SELECT * FROM cron.job;
```

### Opción B: Webhook de Seguridad

```typescript
// Opcional: Enviar eventos de seguridad a sistema externo
// Agregar en index.ts donde se llama logSecurityEvent

async function notifySecurityTeam(event: SecurityEvent) {
  if (event.event_type === 'auth_failure' || 
      event.event_type === 'prompt_injection_detected') {
    await fetch('https://tu-webhook.com/security-alerts', {
      method: 'POST',
      body: JSON.stringify(event)
    });
  }
}
```

---

## Troubleshooting

### Problema: "OPENAI_API_KEY_WHISPER no está configurada"

**Causa:** Variable de entorno no configurada  
**Solución:**
```bash
supabase secrets set OPENAI_API_KEY_WHISPER=sk-tu-key
supabase functions deploy agent-voice-interaction
```

### Problema: "FRONTEND_URL debe estar configurado"

**Causa:** Variable CORS no configurada  
**Solución:**
```bash
supabase secrets set FRONTEND_URL=https://tu-dominio.com
supabase functions deploy agent-voice-interaction
```

### Problema: CORS errors en frontend

**Causa:** Origen no coincide con FRONTEND_URL  
**Solución:**
```bash
# Verificar origen actual
echo $FRONTEND_URL

# Actualizar si es necesario
supabase secrets set FRONTEND_URL=https://origen-correcto.com
```

### Problema: 401 Unauthorized en requests válidos

**Causa:** Token no se está enviando correctamente  
**Verificación:**
```javascript
// En frontend, verificar:
console.log(sessionStorage.getItem('supabase.auth.token'));

// Debe tener un objeto con currentSession.access_token
```

---

## Checklist Final Pre-Deploy

- [ ] Todas las variables de entorno configuradas
- [ ] Edge function deployed exitosamente
- [ ] Tests de seguridad pasan (auth, CORS, validaciones)
- [ ] Frontend usa sessionStorage (no localStorage)
- [ ] Migraciones aplicadas a base de datos
- [ ] Audit logging funcionando
- [ ] Rate limiting activo
- [ ] Security headers configurados
- [ ] robots.txt y security.txt en lugar
- [ ] Documentación de seguridad actualizada

---

## Comandos Rápidos de Referencia

```bash
# Deploy completo
supabase secrets set OPENAI_API_KEY_WHISPER=sk-xxx
supabase secrets set FRONTEND_URL=https://tudominio.com
supabase functions deploy agent-voice-interaction
supabase db push

# Verificación
grep -r "sk-" supabase/functions/  # Debe estar vacío
grep -r "localStorage" src/         # Debe estar vacío
curl -H "Authorization: Bearer invalid" ...  # Debe dar 401

# Logs
supabase functions logs agent-voice-interaction --tail
supabase secrets list
```

---

*Guía generada el: 25 de Marzo, 2026*  
*Versión: 1.0*  
*Mantenida por: Equipo de Seguridad UAL*
