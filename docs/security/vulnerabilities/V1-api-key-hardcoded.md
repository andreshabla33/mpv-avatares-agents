# V1: API Key Hardcodeada - Documentación Completa

## Identificación

**ID:** V1  
**Categoría:** Manejo de Credenciales / Secrets Management  
**Severidad:** 🔴 **CRÍTICA**  
**CVSS Score:** 9.8 (Critical)  
**Fecha detectada:** 25 de Marzo, 2026  
**Fecha mitigación:** 25 de Marzo, 2026

---

## Descripción Técnica

### Problema Identificado

La API key de OpenAI estaba hardcodeada directamente en el código fuente de la edge function, actuando como un fallback cuando la variable de entorno no estaba configurada.

### Ubicación del Código Vulnerable

```typescript
// File: supabase/functions/agent-voice-interaction/openai.ts
// Line: 6

constructor() {
  // ANTES (VULNERABLE):
  const key = Deno.env.get('OPENAI_API_KEY_WHISPER') || 
    "sk-proj-REDACTED_API_KEY_FOR_SECURITY_REASONS";
  if (!key) throw new Error('OPENAI_API_KEY_WHISPER no está configurada');
  this.apiKey = key;
}
```

---

## Impacto y Riesgos

### Vectores de Ataque

1. **Exposición en Repositorio Git**
   - La key está en historial de commits
   - Cualquier persona con acceso al repo puede verla
   - Forks del repositorio también contienen la key

2. **Costos No Controlados**
   - Atacante puede usar la key para hacer requests a OpenAI
   - Facturación directa a la cuenta del desarrollador
   - Potencial de Denial of Wallet (agotar créditos)

3. **Reputacional**
   - La key expuesta puede asociarse al proyecto públicamente
   - Riesgo de ban por OpenAI por uso inusual

4. **Persistencia del Problema**
   - Incluso revocando la key, permanece en el historial git
   - Requiere rotación de key + limpieza de historial

### Escenarios de Ataque

```
Escenario 1: Exposición Accidental
1. Repositorio se hace público
2. Bot escanea GitHub por patrones de API keys
3. Key es extraída automáticamente
4. Uso no autorizado comienza

Escenario 2: Insiders
1. Desarrollador con acceso al repo clona el código
2. Extrae la key para uso personal
3. Usa los créditos de la empresa
```

---

## Mitigación Implementada

### Código Corregido

```typescript
// File: supabase/functions/agent-voice-interaction/openai.ts
// Lines: 4-9

constructor() {
  // DESPUÉS (SEGURO):
  const key = Deno.env.get('OPENAI_API_KEY_WHISPER');
  if (!key) throw new Error('OPENAI_API_KEY_WHISPER no está configurada');
  this.apiKey = key;
}
```

### Cambios Realizados

1. **Removido fallback hardcodeado**
   - Eliminado el operador `|| "sk-proj-..."`
   - No hay valor por defecto inseguro

2. **Validación estricta**
   - Si no hay env var, la aplicación no inicia
   - Error claro para el desarrollador

3. **Documentación**
   - Comentario explicando el requisito

---

## Guía de Implementación

### Requisitos Previos

- Acceso al dashboard de OpenAI
- Acceso a Supabase CLI o Dashboard

### Pasos para Configuración

#### Paso 1: Generar Nueva API Key

```bash
# En OpenAI Dashboard
1. Ir a https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Nombre: "UAL CRM Production" o "UAL CRM Development"
4. Copiar la key (se muestra solo una vez)
```

#### Paso 2: Configurar en Supabase

```bash
# Usando Supabase CLI
supabase login
supabase secrets set OPENAI_API_KEY_WHISPER=sk-nueva-key-aqui

# Verificar
supabase secrets list
```

O desde el Dashboard:
1. Ir a Project Settings → Secrets
2. Agregar nueva secret: `OPENAI_API_KEY_WHISPER`
3. Pegar la API key

#### Paso 3: Deploy

```bash
# Deploy de la edge function
supabase functions deploy agent-voice-interaction
```

#### Paso 4: Verificación

```bash
# Test de la función
supabase functions serve agent-voice-interaction

# Debe funcionar correctamente con la nueva key
# Si no hay key configurada, debe dar error claro
```

---

## Verificación de Mitigación

### Checklist de Verificación

- [ ] API key antigua revocada en OpenAI dashboard
- [ ] Nueva API key configurada en Supabase secrets
- [ ] Edge function redeployed
- [ ] Funcionalidad verificada (voice interaction funciona)
- [ ] Logs no muestran la key
- [ ] Código fuente no contiene strings que empiecen con `sk-`

### Comandos de Verificación

```bash
# Buscar cualquier key hardcodeada en el código
grep -r "sk-" supabase/functions/

# Debe retornar vacío o solo referencias a env vars

# Verificar que la env var está configurada
supabase secrets list | grep OPENAI
```

---

## Lecciones Aprendidas

### Anti-Patrones Evitados

1. ❌ **Nunca hardcodear secrets en código fuente**
   - Incluso "temporalmente"
   - Incluso "solo para desarrollo"
   - Incluso con comentarios de "TODO: remover"

2. ❌ **Nunca usar fallback con secret real**
   ```typescript
   // MAL:
   const key = process.env.KEY || "real-secret-here";
   ```

3. ✅ **Siempre usar validación estricta**
   ```typescript
   // BIEN:
   const key = process.env.KEY;
   if (!key) throw new Error('KEY no configurada');
   ```

### Mejores Prácticas Adoptadas

1. **Principle of Least Privilege**
   - La aplicación falla si no hay configuración segura
   - No hay "modo degradado" inseguro

2. **Fail Secure**
   - Error por defecto = más seguro
   - No funciona sin configuración adecuada

3. **12-Factor App**
   - Configuración en environment variables
   - Código libre de credenciales

---

## Referencias

- [OWASP: Hardcoded Credentials](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password)
- [OpenAI: API Key Security](https://platform.openai.com/docs/guides/production-best-practices)
- [Supabase: Secrets Management](https://supabase.com/docs/guides/functions/secrets)
- [CWE-798: Use of Hard-coded Credentials](https://cwe.mitre.org/data/definitions/798.html)

---

## Historial de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-03-25 | Cascade AI | Mitigación implementada - removido fallback hardcodeado |

---

*Documentación generada para: CRM AI Office Virtual Agent*  
*Propietario: Equipo de Seguridad UAL*
