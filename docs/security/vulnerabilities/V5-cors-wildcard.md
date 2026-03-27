# V5: CORS Wildcard - Documentación Completa

## Identificación

**ID:** V5  
**Categoría:** Configuración CORS / Cross-Origin Resource Sharing  
**Severidad:** 🟡 **MEDIA**  
**CVSS Score:** 5.3 (Medium)  
**Fecha detectada:** 25 de Marzo, 2026  
**Fecha mitigación:** 25 de Marzo, 2026

---

## Descripción Técnica

### Problema Identificado

La configuración de CORS en la edge function usaba `"*"` (wildcard) como fallback cuando la variable de entorno `FRONTEND_URL` no estaba configurada. Esto permitía que cualquier origen hiciera requests a la API.

### Ubicación del Código Vulnerable

```typescript
// File: supabase/functions/agent-voice-interaction/cors.ts
// Line: 1 (ANTES)

// ANTES (VULNERABLE):
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL") || "*";
// Si FRONTEND_URL no está set, permite CORS desde CUALQUIER origen

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,  // Podría ser "*"
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Transcription, X-Response-Text"
};
```

---

## Impacto y Riesgos

### Vectores de Ataque

1. **CSRF (Cross-Site Request Forgery) Facilitado**
   ```javascript
   // Sitio malicioso puede hacer requests a tu API
   // desde el navegador de una víctima autenticada
   
   fetch('https://tuapi.supabase.co/functions/v1/agent-voice-interaction', {
     method: 'POST',
     credentials: 'include',  // Envía cookies de auth
     body: formData
   });
   ```

2. **Data Exfiltration**
   - Sitios de phishing pueden embedder tu aplicación
   - Scripts de terceros pueden hacer requests en nombre del usuario

3. **Information Leakage**
   - Headers personalizados expuestos a cualquier origen
   - Datos de transcripción potencialmente accesibles

4. **Abuso de API**
   - Scripts automatizados desde cualquier dominio pueden usar tu API
   - Difícil de rastrear quién hace los requests

### Diferencia: Wildcard vs Origen Específico

| Configuración | Comportamiento | Riesgo |
|--------------|----------------|--------|
| `"*"` ❌ | Permite cualquier origen | Alto - Cualquier sitio puede hacer requests |
| `"https://tudominio.com"` ✅ | Solo permite tu dominio | Bajo - Controlas quién accede |
| Múltiples orígenes | Lista de dominios permitidos | Bajo - Flexibilidad controlada |

---

## Mitigación Implementada

### Código Corregido

```typescript
// File: supabase/functions/agent-voice-interaction/cors.ts
// Lines: 1-12 (DESPUÉS)

// Configuración estricta de CORS - requiere FRONTEND_URL configurado
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL");
if (!ALLOWED_ORIGIN) {
  throw new Error("FRONTEND_URL debe estar configurado en variables de entorno");
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "X-Transcription, X-Response-Text"
};
```

### Cambios Realizados

1. **Removido fallback a wildcard**
   - Eliminado `|| "*"`
   - No hay valor por defecto inseguro

2. **Validación estricta**
   - Si `FRONTEND_URL` no está configurado, la edge function falla al iniciar
   - Error claro indicando qué variable falta

3. **Configuración explícita requerida**
   - El desarrollador debe configurar explícitamente el origen permitido
   - No hay "modo de conveniencia" inseguro

---

## Comportamiento Esperado

### Antes (Vulnerable)

```bash
# Request desde cualquier origen
Origin: https://sitio-malicioso.com

# Response headers
Access-Control-Allow-Origin: *
# ✅ Request aceptado desde CUALQUIER origen
```

### Después (Seguro)

```bash
# Request desde origen permitido
Origin: https://ual-crm.netlify.app

# Response headers
Access-Control-Allow-Origin: https://ual-crm.netlify.app
# ✅ Request aceptado - origen en whitelist
```

```bash
# Request desde origen NO permitido
Origin: https://sitio-malicioso.com

# Response
HTTP 403 Forbidden
# ❌ Request rechazado - origen no permitido
```

### Desarrollo Local

```bash
# Para desarrollo, configurar FRONTEND_URL:
supabase secrets set FRONTEND_URL=http://localhost:5173

# O usar archivo .env local:
# FRONTEND_URL=http://localhost:5173
```

---

## Configuración para Diferentes Ambientes

### Desarrollo

```bash
# .env.local
FRONTEND_URL=http://localhost:5173
```

### Staging

```bash
# Staging environment
FRONTEND_URL=https://ual-crm-staging.netlify.app
```

### Producción

```bash
# Production environment
FRONTEND_URL=https://ual-crm.netlify.app
```

### Múltiples Orígenes (Opcional)

Si necesitas permitir múltiples orígenes (por ejemplo, varios subdominios):

```typescript
// Versión extendida para múltiples orígenes
const ALLOWED_ORIGIN = Deno.env.get("FRONTEND_URL");
if (!ALLOWED_ORIGIN) {
  throw new Error("FRONTEND_URL debe estar configurado");
}

// Soporte para lista de orígenes separados por coma
const allowedOrigins = ALLOWED_ORIGIN.split(',').map(o => o.trim());

export function getCorsHeaders(requestOrigin: string | null) {
  const origin = requestOrigin || '';
  
  // Verificar si el origen de la request está en la whitelist
  const isAllowed = allowedOrigins.includes(origin) || 
                    allowedOrigins.includes('*');  // Opcional: wildcard explícito
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Transcription, X-Response-Text"
  };
}
```

Uso con lista:
```bash
supabase secrets set FRONTEND_URL="https://app1.com,https://app2.com,https://app3.com"
```

---

## Headers de Seguridad Relacionados

### Configuración en netlify.toml (Ya existente)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"                          # Evita clickjacking
    X-Content-Type-Options = "nosniff"                # Previene MIME sniffing
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"  # HSTS
    Content-Security-Policy = "..."                   # CSP configurado
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "microphone=(self)"          # Permiso de micrófono
```

### Interacción con CORS

CORS controla:
- Qué **otros sitios** pueden hacer requests **a tu API**

Headers de seguridad controlan:
- Cómo **tu sitio** se comporta y qué puede hacer

Son complementarios:
- CORS protege tu API desde fuera
- Security headers protegen tu frontend desde dentro

---

## Guía de Implementación

### Paso 1: Configurar FRONTEND_URL

```bash
# Obtener la URL de tu frontend
# Ejemplo: https://ual-crm.netlify.app

# Configurar en Supabase
supabase secrets set FRONTEND_URL=https://ual-crm.netlify.app

# Verificar
supabase secrets list | grep FRONTEND
```

### Paso 2: Deploy de la Edge Function

```bash
# Deploy con la nueva configuración
supabase functions deploy agent-voice-interaction
```

### Paso 3: Verificar CORS Headers

```bash
# Test de preflight request
curl -X OPTIONS \
  -H "Origin: https://ual-crm.netlify.app" \
  -H "Access-Control-Request-Method: POST" \
  https://tusupabase.supabase.co/functions/v1/agent-voice-interaction \
  -v

# Debe mostrar:
# Access-Control-Allow-Origin: https://ual-crm.netlify.app
```

### Paso 4: Test desde Origen No Permitido

```bash
# Test con origen malicioso
curl -X OPTIONS \
  -H "Origin: https://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://tusupabase.supabase.co/functions/v1/agent-voice-interaction \
  -v

# Debe mostrar error o Access-Control-Allow-Origin diferente
```

---

## Verificación de Mitigación

### Checklist de Verificación

- [ ] Variable `FRONTEND_URL` configurada en Supabase
- [ ] No hay `"*"` en el código de CORS
- [ ] Preflight OPTIONS retorna origen correcto
- [ ] Requests desde origen permitido funcionan
- [ ] Requests desde origen no permitido son rechazados
- [ ] Headers expuestos son los mínimos necesarios

### Comandos de Verificación

```bash
# Buscar wildcard en código CORS
grep -r '"\*"' supabase/functions/agent-voice-interaction/
# Debe retornar vacío (o comentarios/documentación)

# Verificar configuración actual
grep "FRONTEND_URL" supabase/functions/agent-voice-interaction/cors.ts

# Test de CORS con httpie (opcional)
http OPTIONS https://tusupabase.supabase.co/functions/v1/agent-voice-interaction \
  Origin:https://ual-crm.netlify.app \
  Access-Control-Request-Method:POST
```

---

## Lecciones Aprendidas

### Anti-Patrones Evitados

1. ❌ **Nunca usar wildcard en producción**
   ```typescript
   // MAL:
   "Access-Control-Allow-Origin": "*"
   ```

2. ❌ **Nunca tener fallback a wildcard**
   ```typescript
   // MAL:
   const origin = process.env.FRONTEND_URL || "*";
   ```

3. ✅ **Siempre validar configuración**
   ```typescript
   // BIEN:
   const origin = Deno.env.get("FRONTEND_URL");
   if (!origin) throw new Error("FRONTEND_URL requerido");
   ```

4. ✅ **Ser explícito con headers expuestos**
   - Solo exponer headers necesarios
   - No exponer información sensible innecesariamente

### Contexto de Decisión

**Por qué no permitir wildcard para desarrollo:**

| Escenario | Solución |
|-----------|----------|
| Desarrollo local | Configurar `FRONTEND_URL=http://localhost:5173` |
| Múltiples developers | Usar variable de entorno por developer |
| Review apps | Script que configura FRONTEND_URL dinámicamente |
| Wildcard necesario | Requiere aprobación de seguridad explícita |

---

## Integración con Otras Medidas

Esta mitigación trabaja junto con:

- **netlify.toml security headers:** Protección en múltiples capas
- **Authentication (V3):** CORS + Auth = defensa en profundidad
- **Rate Limiting:** Limita impacto si alguien bypass CORS
- **CSP:** Controla qué recursos puede cargar el frontend

---

## Referencias

- [OWASP: CORS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Origin_Resource_Sharing_Cheat_Sheet.html)
- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Supabase: Functions CORS](https://supabase.com/docs/guides/functions/cors)
- [CWE-942: Overly Permissive CORS](https://cwe.mitre.org/data/definitions/942.html)

---

## Historial de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-03-25 | Cascade AI | Removido fallback a wildcard, implementado validación estricta de FRONTEND_URL |

---

*Documentación generada para: CRM AI Office Virtual Agent*  
*Propietario: Equipo de Seguridad UAL*
