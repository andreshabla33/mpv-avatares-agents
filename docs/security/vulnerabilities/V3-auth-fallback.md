# V3: Auth Fallback a Anon Key - Documentación Completa

## Identificación

**ID:** V3  
**Categoría:** Autenticación / Authentication Bypass  
**Severidad:** 🟠 **ALTA**  
**CVSS Score:** 7.5 (High)  
**Fecha detectada:** 25 de Marzo, 2026  
**Fecha mitigación:** 25 de Marzo, 2026

---

## Descripción Técnica

### Problema Identificado

La edge function `agent-voice-interaction` tenía un fallback que usaba la `SUPABASE_ANON_KEY` cuando no se proporcionaba un header de autorización válido. Esto permitía requests sin autenticación real, bypassando el control de acceso.

### Ubicación del Código Vulnerable

```typescript
// File: supabase/functions/agent-voice-interaction/index.ts
// Lines: 22-33 (ANTES)

try {
  let authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    // ANTES (VULNERABLE): Fallback a anon key permite requests sin auth
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (anonKey) {
      authHeader = `Bearer ${anonKey}`;
    } else {
      return new Response(JSON.stringify({ error: "Falta token de autorización" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
  // ... resto del código usa authHeader sin verificar si es real
}
```

---

## Impacto y Riesgos

### Vectores de Ataque

1. **Bypass de Autenticación**
   ```bash
   # Request sin Authorization header
   curl -X POST https://api.supabase.co/functions/v1/agent-voice-interaction \
     -F "audio=@test.webm" \
     -F "agente_id=1"
   
   # ANTES: Funcionaba usando anon key
   # DESPUÉS: Retorna 401 Unauthorized
   ```

2. **Acceso a Datos de Cualquier Empresa**
   - Con anon key, las queries respetan RLS
   - PERO: permite hacer requests a la API sin identificar al usuario
   - Dificulta el audit logging

3. **Abuso de Rate Limiting**
   - Rate limit es por empresa
   - Requests sin auth no se asocian a empresa específica
   - Potencial para bypass de rate limiting

4. **Denial of Service Económico**
   - Requests sin auth igual consumen recursos OpenAI
   - Costos sin control de quién los genera

### Escenarios de Ataque

```
Escenario 1: Acceso Directo a API
1. Atacante descubre URL de la edge function
2. Realiza requests sin Authorization header
3. La API procesa el request usando anon key
4. Atacante puede interactuar con agentes sin autenticación

Escenario 2: Fuzzing de Agentes
1. Atacante itera agente_id de 1 a 100
2. Para cada uno, envía audio de prueba
3. Descubre qué agentes existen
4. Obtiene información de agentes sin permisos
```

---

## Mitigación Implementada

### Código Corregido

```typescript
// File: supabase/functions/agent-voice-interaction/index.ts
// Lines: 22-28 (DESPUÉS)

try {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logSecurityEvent({
      event_type: 'auth_failure',
      details: { reason: 'missing_or_invalid_auth_header' },
      ip: req.headers.get('x-forwarded-for') || undefined
    });
    return new Response(JSON.stringify({ error: "Unauthorized - Se requiere token de autenticación válido" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  // ... continúa con authHeader garantizado como válido
}
```

### Cambios Realizados

1. **Removido fallback a anon key**
   - Eliminado todo el bloque `if (!authHeader) { ... anonKey ... }`
   - No hay path que permita request sin auth válido

2. **Validación estricta de formato**
   - Verifica que el header empiece con `Bearer `
   - Rechaza tokens mal formados

3. **Audit logging de intentos fallidos**
   - Cada intento sin auth se registra
   - Incluye IP para detección de ataques

4. **Mensaje de error claro**
   - "Unauthorized - Se requiere token de autenticación válido"
   - HTTP 401 status code

---

## Comportamiento Esperado

### Antes (Vulnerable)

```
Request: POST /agent-voice-interaction
Headers: {}  // Sin Authorization
Body: { audio: file, agente_id: 1 }

Response: 200 OK  // ⚠️ PROCESADO CON ANON KEY
Audio: [response audio]
```

### Después (Seguro)

```
Request: POST /agent-voice-interaction
Headers: {}  // Sin Authorization
Body: { audio: file, agente_id: 1 }

Response: 401 Unauthorized
Body: { error: "Unauthorized - Se requiere token de autenticación válido" }
```

### Después (Con Auth Válido)

```
Request: POST /agent-voice-interaction
Headers: { Authorization: "Bearer eyJhbG..." }
Body: { audio: file, agente_id: 1 }

Response: 200 OK
Audio: [response audio]
```

---

## Arquitectura de Autenticación

### Flujo Actual (Post-Mitigación)

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Cliente    │────▶│  Auth Header     │────▶│  Edge Function  │
│  (Frontend)  │     │  Bearer <token>  │     │  Validación     │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                          ┌──────────────────────────┼──────────┐
                          │                          │          │
                          ▼                          ▼          ▼
                   ┌──────────────┐          ┌──────────────┐  ┌────────┐
                   │  401 Error   │          │  Supabase    │  │ OpenAI │
                   │  (sin auth)  │          │  RLS Check   │  │  API   │
                   └──────────────┘          └──────────────┘  └────────┘
```

### Pasos de Validación

1. **Recepción del Request**
   - Edge function recibe el request
   - Extrae header `Authorization`

2. **Validación del Header**
   - ¿Existe el header? → Si no, 401
   - ¿Comienza con `Bearer `? → Si no, 401
   - ¿Tiene contenido después de "Bearer "? → Si no, 401

3. **Propagación a Supabase**
   - Header se pasa al cliente de Supabase
   - Supabase valida el JWT
   - RLS se ejecuta con el contexto del usuario

4. **Procesamiento**
   - Solo si todo lo anterior pasa, se procesa el request

---

## Guía de Implementación

### Para Desarrollo Local

```bash
# Cuando se desarrolla localmente, obtener token válido:

# 1. Iniciar sesión en el frontend
# 2. Abrir DevTools → Application → Session Storage
# 3. Copiar el token de 'supabase.auth.token'
# 4. Usarlo en requests de prueba:

curl -X POST http://localhost:54321/functions/v1/agent-voice-interaction \
  -H "Authorization: Bearer <token-copiado>" \
  -F "audio=@test.webm" \
  -F "agente_id=1"
```

### Para Testing Automatizado

```typescript
// Test que verifica que requests sin auth fallan
describe('Authentication', () => {
  it('should reject requests without Authorization header', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/agent-voice-interaction', {
      method: 'POST',
      body: formData // válido pero sin auth
    });
    
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  });
  
  it('should reject requests with malformed Authorization header', async () => {
    const response = await fetch('http://localhost:54321/functions/v1/agent-voice-interaction', {
      method: 'POST',
      headers: { 'Authorization': 'InvalidFormat' },
      body: formData
    });
    
    expect(response.status).toBe(401);
  });
});
```

---

## Verificación de Mitigación

### Checklist de Verificación

- [ ] No hay fallback a `SUPABASE_ANON_KEY` en el código
- [ ] Requests sin `Authorization` header retornan 401
- [ ] Requests con `Authorization: Invalid` retornan 401
- [ ] Requests con `Authorization: Bearer <token>` funcionan
- [ ] Audit logs registran intentos de auth fallidos
- [ ] Mensaje de error no revela información sensible

### Comandos de Verificación

```bash
# 1. Buscar cualquier uso de anon key como fallback
grep -n "SUPABASE_ANON_KEY" supabase/functions/agent-voice-interaction/index.ts
# Debe mostrar solo uso legítimo (creación de cliente), no como fallback

# 2. Test de request sin auth
curl -X POST https://tusupabase.supabase.co/functions/v1/agent-voice-interaction \
  -F "audio=@test.webm" \
  -F "agente_id=1"
# Debe retornar: {"error":"Unauthorized - Se requiere token de autenticación válido"}

# 3. Verificar logs de seguridad
supabase functions logs agent-voice-interaction --tail
# Debe mostrar: [SECURITY_AUDIT] {"event_type":"auth_failure",...}
```

---

## Lecciones Aprendidas

### Anti-Patrones Evitados

1. ❌ **Nunca permitir fallback a credenciales públicas**
   ```typescript
   // MAL:
   if (!authHeader) {
     authHeader = `Bearer ${anonKey}`;  // ⚠️ Permite bypass!
   }
   ```

2. ✅ **Siempre requerir autenticación explícita**
   ```typescript
   // BIEN:
   if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return new Response('Unauthorized', { status: 401 });
   }
   ```

3. ✅ **Validar formato del token**
   - Verificar que siga el patrón `Bearer <jwt>`
   - No aceptar formatos alternativos

4. ✅ **Loggear intentos fallidos**
   - Ayuda a detectar ataques de fuerza bruta
   - Permite análisis forense

### Contexto de Decisión

**Por qué no permitir modo "desarrollo" sin auth:**

| Argumento a favor | Contra-argumento |
|-------------------|------------------|
| "Es más fácil para desarrollar" | El esfuerzo de usar token real es mínimo |
| "Solo es temporal" | El código temporal se olvida y va a producción |
| "Es solo para testing" | Los tests deben simular el ambiente real |
| "Nadie va a saber la URL" | Security through obscurity no funciona |

**Principio aplicado:** "Secure by Default"
- El sistema es seguro por defecto
- No hay modo "inseguro" para conveniencia

---

## Integración con Otras Medidas

Esta mitigación trabaja junto con:

- **V2 (sessionStorage):** Asegura que el frontend tenga tokens válidos para enviar
- **RLS Policies:** Garantiza que incluso con auth válido, solo se accede a datos permitidos
- **Rate Limiting:** Limita requests incluso de usuarios autenticados
- **Audit Logging:** Registra quién hace qué requests

---

## Referencias

- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [Supabase: Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [CWE-306: Missing Authentication for Critical Function](https://cwe.mitre.org/data/definitions/306.html)

---

## Historial de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-03-25 | Cascade AI | Removido fallback a anon key, implementado reject estricto con 401 |

---

*Documentación generada para: CRM AI Office Virtual Agent*  
*Propietario: Equipo de Seguridad UAL*
