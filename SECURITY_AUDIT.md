# Análisis de Seguridad Informática - CRM AI Office Virtual Agent

## Resumen Ejecutivo

Este documento presenta un análisis completo de seguridad informática del sistema CRM AI Office Virtual Agent, identificando fortalezas, vulnerabilidades y riesgos con sus respectivas recomendaciones de mitigación.

---

## 1. AUTENTICACIÓN Y AUTORIZACIÓN

### 1.1 Fortalezas

| Control | Implementación | Ubicación |
|---------|---------------|-----------|
| **RLS (Row Level Security)** | Habilitado en todas las tablas críticas: `admin_profiles`, `agent_voice_logs`, `wp_empresa_perfil`, `wp_agentes`, `wp_numeros` | `@/supabase/migrations/20260314000000_crm_scalability_rls.sql:31-38` |
| **Políticas RLS por empresa** | Multi-tenant isolation mediante `get_current_admin_empresa_id()` | `@/supabase/migrations/20260314000000_crm_scalability_rls.sql:40-69` |
| **Validación de propiedad** | RPC `log_agent_voice_interaction` verifica que el agente pertenezca a la empresa del admin | `@/supabase/migrations/20260314000000_crm_scalability_rls.sql:77-107` |
| **SECURITY DEFINER** | Funciones RPC ejecutan con privilegios elevados pero verifican permisos antes | `@/supabase/migrations/20260314000000_crm_scalability_rls.sql:107` |
| **Client-side auth propagation** | Auth header se propaga del frontend a la edge function y luego a Supabase | `@/supabase/functions/agent-voice-interaction/index.ts:22-41` |

### 1.2 Vulnerabilidades

| Severidad | Vulnerabilidad | Ubicación | Impacto |
|-----------|----------------|-----------|---------|
| **CRÍTICA** | API Key de OpenAI hardcodeada en código fuente | `@/supabase/functions/agent-voice-interaction/openai.ts:6` | Exposición de credenciales de IA, uso no autorizado, costos inesperados |
| **ALTA** | Fallback a localStorage para tokens de auth | `@/src/hooks/useVoiceInteraction.js:20-24` | XSS puede robar tokens, session hijacking |
| **ALTA** | Uso de publishable key en lugar de session tokens | `@/supabase/functions/agent-voice-interaction/index.ts:24-26` | Bypass de autenticación real en desarrollo |
| **MEDIA** | No hay MFA/2FA implementado | - | Compromiso de cuenta única capa de protección |
| **MEDIA** | No hay password policy visible | - | Contraseñas débiles posibles |
| **BAJA** | Información de debug expuesta en logs | `@/supabase/functions/agent-voice-interaction/index.ts:55` | Information disclosure |

---

## 2. CONTROL DE ACCESO Y AUTORIZACIÓN

### 2.1 Implementación RLS

```sql
-- Estrategia de aislamiento multi-tenant
CREATE POLICY "Admins pueden ver agentes de su empresa" 
    ON public.wp_agentes FOR SELECT 
    USING (empresa_id = public.get_current_admin_empresa_id());
```

**Evaluación:** ✅ **FUERTE**
- Aislamiento por empresa mediante `empresa_id`
- Validación en RPC antes de operaciones
- CASCADE delete para referencias integrity

### 2.2 Problemas de Autorización

| Problema | Descripción | Riesgo |
|----------|-------------|--------|
| **Auth Fallback** | Si no hay Authorization header, usa anon key | Permite requests sin autenticación real |
| **Token Storage** | localStorage es vulnerable a XSS | Robo de sesión mediante scripts maliciosos |
| **Missing RBAC** | No hay roles diferenciados (admin, viewer, etc) | Exceso de privilegios |

---

## 3. VALIDACIÓN DE INPUTS Y SANITIZACIÓN

### 3.1 Fortalezas

| Control | Ubicación | Descripción |
|---------|-----------|-------------|
| **Tamaño de archivo limitado** | `@/supabase/functions/agent-voice-interaction/index.ts:77-82` | 10MB max para audio |
| **Validación numérica** | `@/supabase/functions/agent-voice-interaction/index.ts:84-90` | `parseInt` con validación de NaN |
| **Sanitización XSS** | `@/src/components/VoiceControl.jsx:20-21` | DOMPurify en transcripción y respuesta |
| **URL encoding** | `@/supabase/functions/agent-voice-interaction/index.ts:148-149` | Headers codificados para caracteres especiales |
| **Heurística anti-inyección** | `@/supabase/functions/agent-voice-interaction/index.ts:111-125` | Detección de frases prohibidas en prompts |

### 3.2 Vulnerabilidades

| Vulnerabilidad | Severidad | Descripción |
|----------------|-----------|-------------|
| **No hay validación de tipo MIME** | MEDIA | Audio files no verifican formato real |
| **No hay virus scanning** | MEDIA | Archivos subidos no escaneados |
| **Regex básica para agente_id** | BAJA | Solo remueve dígitos, podría ser más estricto |
| **Missing input length limits** | BAJA | Transcripción no tiene límite de caracteres |

---

## 4. PREVENCIÓN DE INYECCIÓN

### 4.1 SQL Injection

**Estado:** ✅ **PROTEGIDO**

| Control | Implementación |
|---------|---------------|
| **RPC Parametrizado** | `@/supabase/functions/agent-voice-interaction/supabase.ts:34-38` |
| **Supabase Client** | Query builder escapa parámetros automáticamente |
| **No concatenación SQL** | Todas las queries usan el ORM |

### 4.2 Prompt Injection

**Estado:** ⚠️ **PARCIALMENTE PROTEGIDO**

**Fortalezas:**
- System Security Policy con reglas explícitas (`@/supabase/functions/agent-voice-interaction/prompts.ts:1-75`)
- Input wrapping en XML tags (`<user_input>`)
- Heurística de detección de frases prohibidas

**Debilidades:**
- No hay sandboxing real del LLM
- Prompt leak potential mediante "jailbreaking" avanzado
- No hay validación de output del LLM antes de mostrar al usuario

---

## 5. CONFIGURACIÓN DE CORS

### 5.1 Implementación Actual

```typescript
// @/supabase/functions/agent-voice-interaction/cors.ts:1-8
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL") || "*";
export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Transcription, X-Response-Text"
};
```

### 5.2 Evaluación

| Aspecto | Estado | Comentario |
|---------|--------|------------|
| **Wildcard en desarrollo** | ⚠️ | `"*"` permite cualquier origen cuando no hay FRONTEND_URL |
| **Métodos restringidos** | ✅ | Solo POST y OPTIONS |
| **Headers expuestos** | ✅ | Solo los necesarios |
| **Preflight handling** | ✅ | OPTIONS respondido correctamente |

**Recomendación:** Remover fallback a `"*"` en producción.

---

## 6. RATE LIMITING

### 6.1 Implementación

```typescript
// @/supabase/functions/agent-voice-interaction/index.ts:43-63
const { data, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
  p_endpoint: 'agent-voice-interaction',
  p_max_requests: 10,
  p_window_minutes: 1
});
```

**Evaluación:** ✅ **IMPLEMENTADO**
- 10 requests/minuto por empresa
- HTTP 429 con Retry-After header
- Graceful degradation si falla el check

### 6.2 Limitaciones

| Limitación | Descripción |
|------------|-------------|
| **No hay rate limit por IP** | Potencial para DDoS desde múltiples cuentas |
| **No hay rate limit global** | Un usuario puede consumir toda la cuota |
| **Window fijo** | 1 minuto puede ser bypassed con timing attacks |

---

## 7. MANEJO DE SECRETS Y CREDENCIALES

### 7.1 Secrets Identificados

| Secret | Ubicación | Estado |
|--------|-----------|--------|
| `OPENAI_API_KEY_WHISPER` | Environment variable | ✅ Seguro |
| **OpenAI Key Hardcodeada** | `@/openai.ts:6` | ❌ **CRÍTICA** |
| `SUPABASE_URL` | Environment variable | ✅ Seguro |
| `SUPABASE_ANON_KEY` | Environment variable | ✅ Seguro |
| `FRONTEND_URL` | Environment variable | ✅ Seguro |

### 7.2 Análisis de Exposición

```typescript
// CRÍTICO: API Key expuesta en código fuente
const key = Deno.env.get('OPENAI_API_KEY_WHISPER') || 
  "sk-proj-REDACTED_API_KEY_FOR_SECURITY_REASONS";
```

**Impacto:**
- Exposición en repositorio Git
- Costos por uso no autorizado
- Posible uso para otros proyectos
- No se puede rotar sin deploy

---

## 8. LOGGING Y AUDITORÍA

### 8.1 Logging Implementado

| Evento | Loggeado | Ubicación |
|--------|----------|-----------|
| Interacciones de voz | ✅ | `agent_voice_logs` table |
| Rate limit failures | ⚠️ | Console.warn only |
| Auth failures | ⚠️ | Console.warn only |
| Errores de API | ✅ | Console.error |

### 8.2 Preocupaciones

| Problema | Severidad | Descripción |
|----------|-----------|-------------|
| **PII en logs** | MEDIA | Transcripciones de voz almacenadas sin enmascaramiento |
| **No hay retención policy** | MEDIA | Logs guardados indefinidamente |
| **Missing correlation IDs** | BAJA | Difícil trazar requests a través del sistema |
| **Debug info en producción** | BAJA | `console.warn` expone información interna |

---

## 9. PROTECCIÓN CONTRA XSS Y CSRF

### 9.1 XSS Prevention

| Control | Estado | Ubicación |
|---------|--------|-----------|
| DOMPurify | ✅ | `@/src/components/VoiceControl.jsx:20-21` |
| No innerHTML | ✅ | No se detectó uso inseguro |
| encodeURIComponent | ✅ | Headers de respuesta |

### 9.2 CSRF Prevention

| Control | Estado | Comentario |
|---------|--------|------------|
| SameSite cookies | ❓ | No verificado |
| CSRF tokens | ❌ | No implementado |
| Origin validation | ⚠️ | Parcial (CORS) |

**Nota:** El uso de `Authorization: Bearer` header mitiga CSRF en cierta medida, pero no hay tokens específicos para state-changing operations.

---

## 10. SEGURIDAD DE INFRAESTRUCTURA

### 10.1 Supabase Configuration

| Aspecto | Estado |
|---------|--------|
| **RLS habilitado** | ✅ Todas las tablas relevantes |
| **CASCADE deletes** | ✅ Integridad referencial |
| **SECURITY DEFINER** | ✅ Para RPCs |
| **search_path** | ✅ Vacío en funciones sensitivas |

### 10.2 Edge Functions

| Aspecto | Estado | Comentario |
|---------|--------|------------|
| **Timeout configurado** | ❓ | No verificado |
| **Memory limits** | ❓ | No verificado |
| **Cold start** | ⚠️ | Potencial DoS por cold starts frecuentes |

---

## 11. MATRIZ DE RIESGO

| ID | Vulnerabilidad | Probabilidad | Impacto | Riesgo | Prioridad |
|----|----------------|--------------|---------|--------|-----------|
| V1 | API Key OpenAI hardcodeada | Alta | Crítico | **CRÍTICO** | P0 |
| V2 | localStorage para tokens | Alta | Alto | **ALTO** | P1 |
| V3 | Auth fallback a anon key | Media | Alto | **ALTO** | P1 |
| V4 | No MFA/2FA | Alta | Medio | **MEDIO** | P2 |
| V5 | CORS wildcard en dev | Alta | Bajo | **MEDIO** | P3 |
| V6 | PII en logs sin retención | Media | Medio | **MEDIO** | P3 |
| V7 | No CSRF tokens | Baja | Medio | **BAJO** | P4 |
| V8 | Rate limit sin IP | Media | Bajo | **BAJO** | P4 |

---

## 12. RECOMENDACIONES PRIORITARIAS

### 12.1 Inmediatas (P0 - P1)

1. **Remover API Key hardcodeada**
   ```typescript
   // ANTES:
   const key = Deno.env.get('OPENAI_API_KEY_WHISPER') || "sk-proj-...";
   
   // DESPUÉS:
   const key = Deno.env.get('OPENAI_API_KEY_WHISPER');
   if (!key) throw new Error('OPENAI_API_KEY_WHISPER no configurada');
   ```

2. **Implementar HttpOnly cookies**
   - Migrar de localStorage a cookies con `HttpOnly`, `Secure`, `SameSite=Strict`
   - Implementar refresh token rotation

3. **Remover auth fallback**
   ```typescript
   // ANTES:
   if (!authHeader) {
     const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
     if (anonKey) { authHeader = `Bearer ${anonKey}`; }
   }
   
   // DESPUÉS:
   if (!authHeader) {
     return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
   }
   ```

### 12.2 Corto Plazo (P2 - P3)

4. **Implementar MFA/2FA**
   - OTP con TOTP
   - Backup codes
   - Opcional para usuarios admin

5. **Configurar CORS estricto en producción**
   ```typescript
   const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL"); // Sin fallback a "*"
   if (!ALLOWED_ORIGIN) throw new Error("FRONTEND_URL requerido");
   ```

6. **Agregar retención de logs**
   ```sql
   -- Ejemplo: Retención de 90 días
   DELETE FROM agent_voice_logs WHERE created_at < NOW() - INTERVAL '90 days';
   ```

### 12.3 Mediano Plazo (P4+)

7. **Implementar CSRF tokens** para operaciones state-changing
8. **Agregar rate limiting por IP** además de por empresa
9. **Implementar WAF** (Web Application Firewall)
10. **Auditoría de dependencias** (npm audit, deno audit)
11. **Content Security Policy (CSP)** headers
12. **Subresource Integrity (SRI)** para assets externos

---

## 13. COMPLIANCE Y ESTÁNDARES

| Estándar | Cumplimiento | Notas |
|----------|--------------|-------|
| **OWASP Top 10 2021** | 7/10 | Faltan: A01 (Access Control), A07 (Auth Failures), A08 (Data Integrity) |
| **GDPR** | ⚠️ Parcial | PII en logs, falta retention policy |
| **SOC 2** | ❌ No | Falta auditoría formal |
| **ISO 27001** | ❌ No | No implementado |

---

## 14. CONCLUSIÓN

El sistema CRM AI Office Virtual Agent tiene **una base de seguridad sólida** con RLS bien implementado, rate limiting, y protecciones contra XSS/SQL injection. Sin embargo, presenta **vulnerabilidades críticas** que deben ser abordadas inmediatamente, particularmente la exposición de API keys y el manejo inseguro de tokens.

**Puntuación General:** 6.5/10
- Arquitectura base: 8/10
- Implementación: 5/10
- Operación: 6/10

**Próximos pasos recomendados:**
1. Rotar API key de OpenAI expuesta
2. Implementar cookie-based auth
3. Remover fallbacks de desarrollo
4. Configurar CORS estricto
5. Implementar política de retención de datos

---

## Apéndice: Archivos Revisados

| Ruta | Líneas | Foco de Seguridad |
|------|--------|-------------------|
| `@/supabase/functions/agent-voice-interaction/index.ts` | 1-165 | Auth, Rate Limit, Input Validation |
| `@/supabase/functions/agent-voice-interaction/cors.ts` | 1-9 | CORS Configuration |
| `@/supabase/functions/agent-voice-interaction/openai.ts` | 1-123 | API Key Management |
| `@/supabase/functions/agent-voice-interaction/prompts.ts` | 1-75 | Prompt Injection Prevention |
| `@/supabase/functions/agent-voice-interaction/supabase.ts` | 1-44 | RLS Enforcement |
| `@/supabase/migrations/20260314000000_crm_scalability_rls.sql` | 1-108 | RLS Policies, RPC Security |
| `@/src/hooks/useVoiceInteraction.js` | 1-194 | Token Handling, API Calls |
| `@/src/hooks/useAgentStates.js` | 1-274 | Data Fetching, Realtime |
| `@/src/components/VoiceControl.jsx` | 1-133 | XSS Prevention |
| `@/.env` | 1-3 | Environment Variables |

---

*Reporte generado el: Marzo 25, 2026*
*Metodología: Análisis estático de código + Revisión manual de configuraciones*
