# Roadmap de Seguridad - Post-Entrega

## Resumen

Esta lista contiene mejoras de seguridad adicionales que se recomiendan implementar **después** de la entrega inicial del proyecto. Estas no son críticas para el MVP pero mejorarán significativamente la postura de seguridad a largo plazo.

---

## Prioridad 1: Autenticación Robusta (Semanas 2-3 post-entrega)

### 1.1 Implementar HttpOnly Cookies para Tokens

**Estado actual:** sessionStorage (mejorado pero no óptimo)  
**Objetivo:** HttpOnly cookies (óptimo para producción)

#### Implementación Propuesta

```typescript
// 1. Instalar dependencia
npm install @supabase/ssr

// 2. Crear middleware de autenticación
// src/middleware/auth.ts
import { createServerClient } from '@supabase/ssr'

export async function requireAuth(req: Request) {
  const supabase = createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => req.cookies.get(key)?.value,
        set: (key, value, options) => {
          // Configurar cookie HttpOnly
          res.cookies.set(key, value, {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 3600
          })
        },
        remove: (key, options) => {
          res.cookies.delete(key, options)
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}
```

**Beneficios:**
- ❌ No accesible por JavaScript (protección XSS total)
- ✅ Enviado automáticamente por el browser
- ✅ Soporte para refresh token automático
- ✅ Mejor integración con SSR

**Esfuerzo:** 2-3 días  
**Impacto:** Alto  
**Riesgo:** Breaking change - requiere re-login de todos los usuarios

---

### 1.2 Multi-Factor Authentication (MFA/2FA)

**Estado actual:** Single-factor (solo password/token)  
**Objetivo:** TOTP (Time-based One-Time Password)

#### Implementación Propuesta

```sql
-- 1. Extensión de tabla para MFA
ALTER TABLE admin_profiles 
ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN mfa_secret TEXT,
ADD COLUMN mfa_backup_codes TEXT[];
```

```typescript
// 2. Endpoints para MFA
// POST /mfa/setup - Genera QR code para Google Authenticator
// POST /mfa/verify - Verifica código TOTP
// POST /mfa/disable - Desactiva MFA (requiere verificación)
```

**Flujo:**
1. Usuario habilita MFA en settings
2. Sistema genera secreto TOTP y muestra QR
3. Usuario escanea con app (Google Authenticator, Authy)
4. Próximo login requiere código TOTP además de password

**Beneficios:**
- Protección contra credential stuffing
- Mitigación de phishing
- Compliance con regulaciones financieras/healthcare

**Esfuerzo:** 3-4 días  
**Impacto:** Alto  
**Opcional por rol:** Solo requerir para usuarios 'admin'

---

### 1.3 Password Policy

**Estado actual:** Sin política definida  
**Objetivo:** Política de contraseñas fuertes

#### Implementación

```typescript
// src/utils/passwordPolicy.ts
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 12) {
    errors.push('Mínimo 12 caracteres')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número')
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Al menos un símbolo especial')
  }
  if (/(.)
{3,}/.test(password)) {
    errors.push('No repitas caracteres consecutivamente')
  }
  
  // Verificar contra breach database (HaveIBeenPwned)
  // Opcional pero recomendado
  
  return { valid: errors.length === 0, errors }
}
```

**Beneficios:**
- Previene contraseñas débiles comunes
- Mejora resistencia a fuerza bruta
- Compliance NIST/CIS

---

## Prioridad 2: Protección Contra Ataques (Semanas 4-6)

### 2.1 CSRF Tokens

**Estado actual:** Protegido por Bearer tokens (parcial)  
**Objetivo:** Double-submit cookie pattern

#### Implementación

```typescript
// 1. Generar token CSRF en login
const csrfToken = crypto.randomUUID()
res.cookie('csrf-token', csrfToken, { 
  httpOnly: false,  // Frontend necesita leerlo
  sameSite: 'strict'
})

// 2. Frontend envía en header
fetch('/api/endpoint', {
  headers: {
    'X-CSRF-Token': getCookie('csrf-token'),
    'Authorization': `Bearer ${token}`
  }
})

// 3. Backend valida que cookie y header coinciden
if (req.cookies['csrf-token'] !== req.headers['x-csrf-token']) {
  return 403
}
```

**Prioridad:** Media  
**Nota:** Bearer tokens ya mitigan CSRF básico, esto es defensa en profundidad

---

### 2.2 Rate Limiting por IP

**Estado actual:** Rate limiting por empresa (10 req/min)  
**Objetivo:** Segunda capa por IP (30 req/min)

#### Implementación

```typescript
// En index.ts
const clientIP = req.headers.get('x-forwarded-for') || 
                 req.headers.get('x-real-ip') || 
                 'unknown'

// Verificar rate limit por IP (independiente de empresa)
const { allowed: ipAllowed } = await supabase.rpc('check_ip_rate_limit', {
  p_ip: clientIP,
  p_max_requests: 30,
  p_window_minutes: 1
})

if (!ipAllowed) {
  return new Response('Too Many Requests from this IP', { status: 429 })
}
```

**Beneficios:**
- Previene DDoS desde múltiples cuentas
- Protege contra bypass de rate limit por empresa

---

### 2.3 Content Security Policy (CSP) Estricto

**Estado actual:** CSP básico con 'unsafe-inline'  
**Objetivo:** CSP estricto sin 'unsafe-inline'

#### Implementación Actual (Mejorable)

```toml
# netlify.toml - ACTUAL (básico)
Content-Security-Policy = "default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline'; ..."
```

#### Objetivo Futuro

```toml
# netlify.toml - FUTURO (estricto)
Content-Security-Policy = "default-src 'self'; 
  script-src 'self' 'nonce-{random}'; 
  style-src 'self' 'nonce-{random}'; 
  connect-src 'self' https://*.supabase.co; 
  img-src 'self' data: blob:; 
  media-src 'self' blob:; 
  frame-ancestors 'none'; 
  base-uri 'self'; 
  form-action 'self';"
```

**Requerimientos:**
- Generar nonces por request
- Inyectar nonces en tags `<script>` y `<style>`
- Refactor de código inline a archivos externos

**Esfuerzo:** 2-3 días  
**Impacto:** Alto (mitigación XSS efectiva)

---

## Prioridad 3: Monitoreo y Detección (Semanas 5-8)

### 3.1 Alertas de Seguridad en Tiempo Real

**Estado actual:** Logs en consola  
**Objetivo:** Webhooks a sistemas de monitoreo

#### Implementación

```typescript
// Agregar a logSecurityEvent en index.ts
async function logSecurityEvent(event: SecurityEvent) {
  // Log local
  console.warn('[SECURITY_AUDIT]', JSON.stringify(event))
  
  // Alerta inmediata para eventos críticos
  if (['auth_failure', 'prompt_injection_detected'].includes(event.event_type)) {
    await notifySecurityWebhook(event)
  }
}

async function notifySecurityWebhook(event: SecurityEvent) {
  try {
    await fetch('https://hooks.slack.com/services/...', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Security Alert: ${event.event_type}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'Event', value: event.event_type, short: true },
            { title: 'IP', value: event.ip || 'unknown', short: true },
            { title: 'Details', value: JSON.stringify(event.details), short: false }
          ],
          footer: 'UAL CRM Security',
          ts: Math.floor(Date.now() / 1000)
        }]
      })
    })
  } catch (e) {
    // No fallar la request principal si el webhook falla
    console.error('Failed to send security alert', e)
  }
}
```

**Integraciones sugeridas:**
- Slack/Teams para notificaciones
- PagerDuty para escalación
- Datadog/NewRelic para análisis

---

### 3.2 Dashboard de Seguridad

**Objetivo:** Panel de control para monitorear amenazas

#### Métricas a Mostrar

```sql
-- Intentos de login fallidos por hora
SELECT date_trunc('hour', timestamp) as hour,
       COUNT(*) as failed_attempts
FROM security_events
WHERE event_type = 'auth_failure'
GROUP BY 1
ORDER BY 1 DESC;

-- IPs con mayor número de intentos bloqueados
SELECT ip, COUNT(*) as blocked_attempts
FROM security_events
WHERE event_type = 'rate_limit_exceeded'
GROUP BY ip
ORDER BY blocked_attempts DESC
LIMIT 10;

-- Prompt injection attempts
SELECT date_trunc('day', timestamp) as day,
       COUNT(*) as attempts
FROM security_events
WHERE event_type = 'prompt_injection_detected'
GROUP BY 1
ORDER BY 1 DESC;
```

**Implementación:**
- Ruta: `/admin/security-dashboard`
- Protegida por autenticación + rol admin
- Actualización en tiempo real (Supabase Realtime)

---

### 3.3 WAF (Web Application Firewall)

**Opciones:**
- Cloudflare WAF (recomendado por facilidad)
- AWS WAF (si se migra a AWS)
- ModSecurity (self-hosted, más control)

#### Reglas Sugeridas

```
OWASP Core Rule Set:
- SQL Injection protection
- XSS protection  
- LFI/RFI protection
- Protocol violations
- Bot detection

Custom Rules:
- Rate limiting agresivo para /functions/v1/*
- Geo-blocking (si aplica)
- IP reputation filtering
```

**Costo:** Cloudflare Pro ~$20/mes  
**Beneficio:** Protección contra ataques comunes automatizados

---

## Prioridad 4: Compliance y Auditoría (Semanas 6-10)

### 4.1 GDPR Completo

**Estado actual:** Estructura básica (retención)  
**Objetivo:** Full compliance

#### Derechos del Usuario a Implementar

1. **Derecho de Acceso (Art. 15)**
   - Endpoint: `GET /api/me/data`
   - Exporta todos los datos del usuario

2. **Derecho de Rectificación (Art. 16)**
   - Endpoint: `PUT /api/me/data`
   - Permite corrección de datos

3. **Derecho al Olvido (Art. 17)**
   - Endpoint: `DELETE /api/me`
   - Anonimización inmediata de logs
   - Eliminación de cuenta

4. **Derecho de Portabilidad (Art. 20)**
   - Endpoint: `GET /api/me/export`
   - Formato: JSON estándar

5. **Consentimiento Explícito**
   - Checkbox en registro para retención de datos
   - Política de privacidad vinculante
   - Opción de revocar consentimiento

---

### 4.2 Auditoría de Dependencias

**Implementación:**

```bash
# npm audit - revisión de vulnerabilidades en paquetes
npm audit
npm audit fix

# Dependabot o Snyk para monitoreo continuo
# Configurar en GitHub: Settings → Security → Dependabot alerts
```

**Proceso mensual:**
1. Revisar alerts de Dependabot
2. Actualizar paquetes con vulnerabilidades
3. Test de regresión
4. Deploy

---

### 4.3 Penetration Testing

**Frecuencia:** Trimestral  
**Alcance:**
- OWASP Top 10
- Testing de lógica de negocio
- Pruebas de rate limiting
- Fuzzing de inputs

**Herramientas:**
- Burp Suite Professional
- OWASP ZAP
- sqlmap (para verificar SQL injection)

---

## Prioridad 5: Mejoras Arquitectónicas (Meses 2-3)

### 5.1 Arquitectura Zero-Trust

**Principios:**
- Nunca confiar, siempre verificar
- Autenticación continua
- Acceso de mínimo privilegio
- Segmentación de red

#### Implementación

```
┌─────────────────────────────────────┐
│           API Gateway               │
│    (Auth, Rate Limit, WAF)          │
└──────────────┬──────────────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│Auth  │  │Voice │  │CRM   │
│Svc   │  │Svc   │  │Svc   │
└──┬───┘  └──┬───┘  └──┬───┘
   │         │         │
   └─────────┼─────────┘
             │
     ┌───────▼────────┐
     │   Database     │
     │   (RLS enabled)│
     └────────────────┘
```

**Beneficios:**
- Servicios aislados
- Fallo de uno no afecta otros
- Escalabilidad independiente

---

### 5.2 Circuit Breaker para APIs Externas

**Problema:** Si OpenAI falla, nuestra API también falla  
**Solución:** Circuit breaker pattern

```typescript
class CircuitBreaker {
  private failures = 0
  private lastFailureTime?: Date
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (e) {
      this.onFailure()
      throw e
    }
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = new Date()
    if (this.failures >= 5) {
      this.state = 'OPEN'
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false
    const minutesSinceLastFailure = (Date.now() - this.lastFailureTime.getTime()) / 60000
    return minutesSinceLastFailure > 5  // Intentar después de 5 min
  }
}

// Uso
const openaiCircuitBreaker = new CircuitBreaker()

async function transcribeAudio(audio: Blob) {
  return openaiCircuitBreaker.execute(async () => {
    return await openaiService.transcribeAudio(audio)
  })
}
```

---

## Cronograma Sugerido

```
Semana 2-3:  Autenticación Robusta
  ├─ HttpOnly cookies
  ├─ MFA para admins
  └─ Password policy

Semana 4-6:  Protección Contra Ataques
  ├─ CSRF tokens
  ├─ Rate limiting por IP
  └─ CSP estricto

Semana 5-8:  Monitoreo y Detección
  ├─ Alertas en tiempo real
  ├─ Dashboard de seguridad
  └─ WAF

Semana 6-10: Compliance y Auditoría
  ├─ GDPR completo
  ├─ Auditoría de dependencias
  └─ Penetration testing

Meses 2-3:  Mejoras Arquitectónicas
  ├─ Zero-trust architecture
  └─ Circuit breakers
```

---

## Métricas de Éxito

| Métrica | Actual | Objetivo (3 meses) |
|---------|--------|-------------------|
| Puntuación OWASP | 7/10 | 9/10 |
| Tiempo de detección de incidentes | Horas | Minutos |
| False positive rate (alertas) | N/A | < 5% |
| Vulnerabilidades críticas | 0 | 0 |
| Tiempo de remediación (media) | 1 día | < 4 horas |
| Compliance GDPR | 60% | 95% |

---

## Recursos y Presupuesto

| Item | Costo Estimado | Prioridad |
|------|---------------|-----------|
| Cloudflare Pro (WAF) | $20/mes | Alta |
| Burp Suite Pro | $449/año | Media |
| Snyk/Dependabot | Gratis | Alta |
| PagerDuty | $29/mes | Media |
| Penetration Testing | $5,000/año | Media |
| **Total Anual** | **~$6,500** | |

---

*Roadmap generado el: 25 de Marzo, 2026*  
*Revisión recomendada: Trimestral*  
*Propietario: Equipo de Seguridad UAL*
