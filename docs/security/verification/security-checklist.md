# Security Checklist - CRM AI Office Virtual Agent

Use esta checklist para verificar que todas las medidas de seguridad están implementadas correctamente antes de deployar a producción.

## Instrucciones

- [ ] Marcar cada item antes del deploy
- [ ] Ejecutar los comandos de verificación
- [ ] Documentar cualquier discrepancia
- [ ] No deployar hasta que todos los items críticos estén ✅

---

## Sección 1: Credenciales y API Keys (CRÍTICO)

### 1.1 OpenAI API Key
- [ ] **No hay API keys hardcodeadas en el código**
  ```bash
  grep -r "sk-proj-" supabase/functions/
  grep -r "sk-" supabase/functions/agent-voice-interaction/openai.ts
  # Resultado: Debe mostrar solo la lectura de env var
  ```

- [ ] **Variable de entorno configurada**
  ```bash
  supabase secrets list | grep OPENAI_API_KEY_WHISPER
  # Resultado: Debe mostrar la variable seteada
  ```

- [ ] **No hay fallback a key hardcodeada**
  ```bash
  grep -n "|| \"sk-" supabase/functions/agent-voice-interaction/openai.ts
  # Resultado: Debe estar vacío (ya fue removido)
  ```

### 1.2 Supabase Keys
- [ ] **SUPABASE_URL configurada**
  ```bash
  supabase secrets list | grep SUPABASE_URL
  ```

- [ ] **SUPABASE_ANON_KEY no expuesta en frontend**
  ```bash
  grep -r "anon" src/ | grep -v ".env"
  # Resultado: Solo debe estar en .env o configuración build-time
  ```

**Estado Sección 1:** ___/3 completado

---

## Sección 2: Autenticación y Autorización (CRÍTICO)

### 2.1 Auth Fallback Removido
- [ ] **No hay fallback a anon key en edge function**
  ```bash
  grep -n "anonKey" supabase/functions/agent-voice-interaction/index.ts
  # Resultado: Vacío (fallback removido)
  ```

- [ ] **Requests sin auth retornan 401**
  ```bash
  curl -X POST https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction \
    -F "audio=@test.webm" -F "agente_id=1"
  # Resultado esperado: HTTP 401 Unauthorized
  ```

### 2.2 Validación de Token
- [ ] **Formato Bearer requerido**
  ```bash
  curl -X POST https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction \
    -H "Authorization: InvalidFormat" \
    -F "audio=@test.webm" -F "agente_id=1"
  # Resultado esperado: HTTP 401
  ```

### 2.3 RLS Habilitado
- [ ] **RLS activo en tablas críticas**
  ```sql
  SELECT schemaname, tablename, rowsecurity 
  FROM pg_tables 
  WHERE tablename IN ('agent_voice_logs', 'wp_agentes', 'admin_profiles');
  # rousecurity debe ser true para todas
  ```

- [ ] **Políticas RLS existentes**
  ```sql
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE schemaname = 'public';
  # Debe mostrar políticas para cada tabla
  ```

**Estado Sección 2:** ___/5 completado

---

## Sección 3: Almacenamiento de Tokens (ALTO)

### 3.1 sessionStorage (No localStorage)
- [ ] **No hay localStorage para tokens**
  ```bash
  grep -rn "localStorage.*token" src/
  # Resultado: Vacío o solo comentarios
  ```

- [ ] **sessionStorage usado para auth**
  ```bash
  grep -rn "sessionStorage.*token" src/
  # Resultado: Debe mostrar archivos modificados
  ```

### 3.2 Logs también migrados
- [ ] **Logs en sessionStorage**
  ```bash
  grep -rn "sessionStorage.*monica_office" src/
  # Resultado: Debe mostrar useAgentStates.js
  ```

**Estado Sección 3:** ___/3 completado

---

## Sección 4: CORS y Headers de Seguridad (MEDIO)

### 4.1 CORS Estricto
- [ ] **No hay wildcard fallback**
  ```bash
  grep -n '|| "\*"' supabase/functions/agent-voice-interaction/cors.ts
  # Resultado: Vacío
  ```

- [ ] **FRONTEND_URL configurado**
  ```bash
  supabase secrets list | grep FRONTEND_URL
  # Resultado: Debe mostrar URL configurada
  ```

- [ ] **CORS valida origen correctamente**
  ```bash
  curl -X OPTIONS \
    -H "Origin: https://tudominio.com" \
    -H "Access-Control-Request-Method: POST" \
    https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction
  # Debe retornar Access-Control-Allow-Origin: https://tudominio.com
  ```

- [ ] **CORS rechaza origen no permitido**
  ```bash
  curl -X OPTIONS \
    -H "Origin: https://evil.com" \
    -H "Access-Control-Request-Method: POST" \
    https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction
  # No debe permitir https://evil.com
  ```

### 4.2 Security Headers
- [ ] **X-Frame-Options: DENY**
  ```bash
  curl -I https://tudominio.netlify.app/ | grep -i x-frame
  ```

- [ ] **X-Content-Type-Options: nosniff**
  ```bash
  curl -I https://tudominio.netlify.app/ | grep -i x-content
  ```

- [ ] **Strict-Transport-Security (HSTS)**
  ```bash
  curl -I https://tudominio.netlify.app/ | grep -i strict-transport
  ```

- [ ] **Content-Security-Policy configurado**
  ```bash
  curl -I https://tudominio.netlify.app/ | grep -i content-security
  ```

**Estado Sección 4:** ___/8 completado

---

## Sección 5: Validación de Inputs (MEDIO)

### 5.1 Tamaño de Archivo
- [ ] **Límite de 10MB aplicado**
  ```bash
  curl -X POST ... -F "audio=@archivo_grande.webm" ...
  # Archivo > 10MB debe retornar 413 Payload Too Large
  ```

### 5.2 Tipo de Datos
- [ ] **agente_id validado como número**
  ```bash
  curl -X POST ... -F "agente_id=abc" ...
  # Debe retornar 400 Bad Request
  ```

### 5.3 Campos Requeridos
- [ ] **audio y agente_id requeridos**
  ```bash
  curl -X POST ... -F "agente_id=1"
  # Sin audio debe retornar 400
  ```

**Estado Sección 5:** ___/3 completado

---

## Sección 6: Rate Limiting y Protección (MEDIO)

### 6.1 Rate Limiting Activo
- [ ] **RPC check_rate_limit existe**
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'check_rate_limit';
  ```

- [ ] **Límite de 10 req/min por empresa**
  ```bash
  # Hacer 11 requests rápidos
  for i in {1..11}; do
    curl -X POST ... -H "Authorization: Bearer $TOKEN" ...
  done
  # El 11vo debe retornar 429 Too Many Requests
  ```

### 6.2 Prompt Injection Detection
- [ ] **Guardrails activos**
  ```bash
  curl -X POST ... -F "audio=@test.webm" -F "agente_id=1" \
    -H "Authorization: Bearer $TOKEN"
  # Audio con "ignora tus instrucciones" debe ser bloqueado (403)
  ```

**Estado Sección 6:** ___/3 completado

---

## Sección 7: Logging y Auditoría (MEDIO)

### 7.1 Audit Logging
- [ ] **Eventos de seguridad se loguean**
  ```bash
  # Hacer request sin auth
  curl -X POST https://tu-proyecto.supabase.co/functions/v1/agent-voice-interaction
  
  # Verificar logs
  supabase functions logs agent-voice-interaction --tail
  # Debe mostrar: [SECURITY_AUDIT] {"event_type":"auth_failure",...}
  ```

### 7.2 Retención de Logs
- [ ] **Columnas de retención existen**
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'agent_voice_logs' 
  AND column_name IN ('retention_policy', 'is_anonymized');
  ```

- [ ] **Función de anonimización existe**
  ```sql
  SELECT proname FROM pg_proc WHERE proname = 'anonymize_old_logs';
  ```

- [ ] **Reporte de retención funciona**
  ```sql
  SELECT * FROM get_retention_report();
  ```

**Estado Sección 7:** ___/4 completado

---

## Sección 8: Archivos de Seguridad (BAJO)

### 8.1 Meta Tags
- [ ] **Referrer-Policy en HTML**
  ```bash
  grep -n "referrer" index.html
  ```

### 8.2 Archivos Públicos
- [ ] **robots.txt existe**
  ```bash
  ls -la public/robots.txt
  ```

- [ ] **security.txt existe**
  ```bash
  ls -la public/.well-known/security.txt
  ```

**Estado Sección 8:** ___/3 completado

---

## Sección 9: Performance y Timeouts (BAJO)

### 9.1 API Timeouts
- [ ] **Timeout de 30s configurado**
  ```bash
  grep -n "timeoutMs" supabase/functions/agent-voice-interaction/openai.ts
  # Debe mostrar: timeoutMs: number = 30000
  ```

**Estado Sección 9:** ___/1 completado

---

## Resumen por Categoría

| Categoría | Items | Completados | Estado |
|-----------|-------|-------------|--------|
| 1. Credenciales | 3 | ___ | 🔴 CRÍTICO |
| 2. Autenticación | 5 | ___ | 🔴 CRÍTICO |
| 3. Token Storage | 3 | ___ | 🟠 ALTO |
| 4. CORS/Headers | 8 | ___ | 🟡 MEDIO |
| 5. Input Validation | 3 | ___ | 🟡 MEDIO |
| 6. Rate Limiting | 3 | ___ | 🟡 MEDIO |
| 7. Logging | 4 | ___ | 🟡 MEDIO |
| 8. Archivos | 3 | ___ | 🟢 BAJO |
| 9. Timeouts | 1 | ___ | 🟢 BAJO |
| **TOTAL** | **33** | **___** | |

---

## Aprobación Final

### Checklist de Deploy

Antes de hacer deploy a producción, verificar:

- [ ] Todas las secciones críticas (🔴) están 100% completas
- [ ] No hay secrets expuestos en código
- [ ] Tests de penetración básicos pasan
- [ ] Audit logging está activo
- [ ] Documentación actualizada

### Firmas

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| Developer | _____________ | _______ | _______ |
| Security Review | _____________ | _______ | _______ |
| Deploy Approver | _____________ | _______ | _______ |

---

## Notas Adicionales

Espacio para anotar discrepancias, excepciones o comentarios:

```








```

---

*Checklist generado el: 25 de Marzo, 2026*  
*Versión: 1.0*  
*Próxima revisión: Post-deploy inicial*
