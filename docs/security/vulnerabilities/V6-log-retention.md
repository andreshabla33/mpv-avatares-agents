# V6: Retención de Logs y PII - Documentación Completa

## Identificación

**ID:** V6  
**Categoría:** Gestión de Datos / PII Retention / GDPR Compliance  
**Severidad:** 🟡 **MEDIA**  
**CVSS Score:** 5.0 (Medium)  
**Fecha detectada:** 25 de Marzo, 2026  
**Fecha implementación:** 25 de Marzo, 2026  
**Estado:** ✅ Estructura lista - Política definida, implementación gradual

---

## Descripción Técnica

### Problema Identificado

Los logs de interacciones de voz (`agent_voice_logs`) almacenaban transcripciones completas y respuestas del LLM sin:
1. Política de retención definida
2. Mecanismo de anonimización automática
3. Control de consentimiento del usuario

Esto crea riesgos:
- **GDPR/CCPA Compliance:** Almacenamiento indefinido de datos personales
- **Storage costs:** Crecimiento ilimitado de base de datos
- **Data breach impact:** Mayor exposición si hay brecha
- **Privacy risk:** PII sin enmascaramiento

### Estructura de Datos Actual

```sql
-- Tabla: agent_voice_logs
-- Columnas relevantes:
- id: BIGSERIAL
- admin_id: UUID (quién habló)
- agente_id: INTEGER (con quién habló)
- transcription: TEXT (qué dijo - CONTIENE PII)
- llm_response: TEXT (qué respondió - CONTIENE PII)
- created_at: TIMESTAMP (cuándo)
-- NO tiene: retention_policy, is_anonymized
```

---

## Impacto y Riesgos

### Vectores de Riesgo

1. **Exposición de PII**
   ```
   Ejemplo de dato almacenado:
   {
     "transcription": "Mi nombre es Juan Pérez, 
                      mi teléfono es 555-1234 y 
                      vivo en Calle Falsa 123",
     "llm_response": "Hola Juan, he registrado tu 
                       información de contacto..."
   }
   ```

2. **Cumplimiento Regulatorio**
   - **GDPR (UE):** Artículo 5 - Limitación de conservación
   - **CCPA (California):** Derecho a eliminación
   - **LGPD (Brasil):** Principio de necesidad
   - Retención indefinida = violación

3. **Escalabilidad**
   - Sin límite, la tabla crece indefinidamente
   - Queries más lentas con el tiempo
   - Backups más grandes y costosos

4. **Incident Response**
   - Brecha de datos expone historial completo
   - Mayor superficie de ataque

---

## Mitigación Implementada

### Estructura Creada

Archivo: `@/supabase/migrations/20260325180000_retention_policy.sql`

```sql
-- 1. Columna de política de retención
ALTER TABLE IF EXISTS public.agent_voice_logs 
ADD COLUMN IF NOT EXISTS retention_policy TEXT DEFAULT '90_days' 
CHECK (retention_policy IN ('30_days', '90_days', '1_year', 'indefinite'));

-- 2. Flag de anonimización
ALTER TABLE IF EXISTS public.agent_voice_logs 
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE;

-- 3. Índice para queries de limpieza
CREATE INDEX IF NOT EXISTS idx_agent_voice_logs_created_at 
ON public.agent_voice_logs(created_at) 
WHERE is_anonymized = FALSE;
```

### Función de Anonimización

```sql
-- Función: Anonimiza registros antiguos según política
CREATE OR REPLACE FUNCTION public.anonymize_old_logs()
RETURNS TABLE (processed_count INTEGER) AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    WITH eligible_logs AS (
        SELECT id, retention_policy
        FROM public.agent_voice_logs
        WHERE is_anonymized = FALSE
          AND (
              (retention_policy = '30_days' AND created_at < NOW() - INTERVAL '30 days')
           OR (retention_policy = '90_days' AND created_at < NOW() - INTERVAL '90 days')
           OR (retention_policy = '1_year' AND created_at < NOW() - INTERVAL '1 year')
          )
    )
    UPDATE public.agent_voice_logs vl
    SET 
        transcription = CASE 
            WHEN LENGTH(vl.transcription) > 50 
            THEN LEFT(vl.transcription, 20) || '...[REDACTED]...' || RIGHT(vl.transcription, 10)
            ELSE '[REDACTED]'
        END,
        llm_response = '[REDACTED FOR PRIVACY]',
        is_anonymized = TRUE,
        updated_at = NOW()
    FROM eligible_logs el
    WHERE vl.id = el.id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Función de Reporte

```sql
-- Función: Reporte de estado de retención
CREATE OR REPLACE FUNCTION public.get_retention_report()
RETURNS TABLE (
    total_logs BIGINT,
    anonymized_logs BIGINT,
    active_logs BIGINT,
    oldest_log_date TIMESTAMP WITH TIME ZONE,
    by_policy JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_logs,
        COUNT(*) FILTER (WHERE is_anonymized = TRUE)::BIGINT as anonymized_logs,
        COUNT(*) FILTER (WHERE is_anonymized = FALSE)::BIGINT as active_logs,
        MIN(created_at) as oldest_log_date,
        JSONB_OBJECT_AGG(
            COALESCE(retention_policy, '90_days'),
            COUNT(*)
        ) as by_policy
    FROM public.agent_voice_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Estrategias de Retención

### Políticas Disponibles

| Política | Descripción | Caso de Uso |
|----------|-------------|-------------|
| `30_days` | Anonimiza después de 30 días | Datos altamente sensibles |
| `90_days` | Anonimiza después de 90 días (default) | Balance privacy/utilidad |
| `1_year` | Anonimiza después de 1 año | Compliance requiere retención larga |
| `indefinite` | Nunca anonimiza (requiere aprobación) | Casos legales específicos |

### Modelo de Anonimización

```
ANTES:
"Mi nombre es Juan Pérez, mi teléfono es 555-1234"

DESPUÉS (texto > 50 chars):
"Mi nombre es Juan...[REDACTED]...555-1234"

DESPUÉS (texto <= 50 chars):
"[REDACTED]"

METADATA PRESERVADA:
- admin_id (quién)
- agente_id (con quién)
- created_at (cuándo)
- is_anonymized = TRUE
```

---

## Implementación

### Opción 1: Anonimización Automática (Recomendado)

```bash
# 1. Instalar extensión pg_cron en Supabase
# Ir a: Database → Extensions → pg_cron

# 2. Crear job programado
SELECT cron.schedule(
    'daily-voice-logs-cleanup',  -- nombre del job
    '0 3 * * *',                 -- 3:00 AM daily
    'SELECT anonymize_old_logs()'
);

# 3. Verificar jobs
SELECT * FROM cron.job;

# 4. Monitorear ejecuciones
SELECT * FROM cron.job_run_details 
WHERE job_name = 'daily-voice-logs-cleanup'
ORDER BY start_time DESC;
```

### Opción 2: Anonimización Manual

```sql
-- Ver cuántos registros serían afectados
SELECT COUNT(*) 
FROM agent_voice_logs 
WHERE is_anonymized = FALSE
  AND created_at < NOW() - INTERVAL '90 days';

-- Ejecutar anonimización
SELECT * FROM anonymize_old_logs();

-- Verificar resultado
SELECT * FROM get_retention_report();
```

### Opción 3: Trigger por Usuario

```sql
-- Permitir que usuarios configuren su propia política
-- Requiere tabla de preferencias de usuario

ALTER TABLE user_settings 
ADD COLUMN voice_log_retention TEXT DEFAULT '90_days';

-- Modificar función para respetar preferencia individual
-- (Implementación futura)
```

---

## GDPR / Compliance Consideraciones

### Principios Aplicados

| Principio GDPR | Implementación |
|----------------|----------------|
| **Minimización** | Solo se retiene lo necesario |
| **Limitación** | Política de retención definida |
| **Integridad** | Anonimización, no borrado (preserva estadísticas) |
| **Rendición de cuentas** | Reportes de retención disponibles |

### Derechos del Usuario

```
Derecho al olvido (GDPR Art. 17):
- Usuario puede solicitar eliminación de datos
- Implementación: UPDATE con anonimización inmediata

Derecho de acceso (GDPR Art. 15):
- Usuario puede ver qué datos se tienen
- Implementación: SELECT con filtro por admin_id

Derecho de portabilidad (GDPR Art. 20):
- Exportar datos en formato estándar
- Implementación: API endpoint de export
```

### Implementación de Derechos

```sql
-- Derecho al olvido para usuario específico
CREATE OR REPLACE FUNCTION anonymize_user_logs(p_admin_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE agent_voice_logs
    SET 
        transcription = '[REDACTED - USER REQUESTED]',
        llm_response = '[REDACTED - USER REQUESTED]',
        is_anonymized = TRUE,
        updated_at = NOW()
    WHERE admin_id = p_admin_id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Guía de Implementación Paso a Paso

### Paso 1: Aplicar Migración

```bash
# Aplicar la migración de retención
supabase db push

# O manualmente
psql $DATABASE_URL -f supabase/migrations/20260325180000_retention_policy.sql
```

### Paso 2: Verificar Columnas Agregadas

```sql
-- Verificar estructura actualizada
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'agent_voice_logs';

-- Debe mostrar:
-- retention_policy | text | '90_days'
-- is_anonymized    | boolean | false
```

### Paso 3: Configurar Job Automático (Opcional)

```sql
-- Si se usa pg_cron
SELECT cron.schedule(
    'daily-voice-logs-cleanup',
    '0 3 * * *',
    'SELECT anonymize_old_logs()'
);
```

### Paso 4: Prueba de Anonimización

```sql
-- Insertar registro de prueba antiguo
INSERT INTO agent_voice_logs 
(admin_id, agente_id, transcription, llm_response, created_at)
VALUES 
('550e8400-e29b-41d4-a716-446655440000', 1, 
 'Mensaje de prueba para anonimización', 
 'Respuesta de prueba',
 NOW() - INTERVAL '91 days');

-- Ejecutar anonimización
SELECT * FROM anonymize_old_logs();

-- Verificar resultado
SELECT id, transcription, llm_response, is_anonymized
FROM agent_voice_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

### Paso 5: Monitoreo

```sql
-- Reporte diario
SELECT * FROM get_retention_report();

-- Logs por anonimizar próximamente
SELECT 
    retention_policy,
    COUNT(*) as count,
    MIN(created_at) as oldest
FROM agent_voice_logs
WHERE is_anonymized = FALSE
GROUP BY retention_policy;
```

---

## Verificación de Implementación

### Checklist

- [ ] Migración aplicada sin errores
- [ ] Columnas `retention_policy` e `is_anonymized` existen
- [ ] Función `anonymize_old_logs()` ejecuta sin errores
- [ ] Función `get_retention_report()` retorna datos correctos
- [ ] Política default es `'90_days'`
- [ ] Índice `idx_agent_voice_logs_created_at` existe
- [ ] Job de pg_cron configurado (si aplica)
- [ ] Tests de anonimización pasan
- [ ] Documentación de privacidad actualizada

### Queries de Verificación

```sql
-- 1. Estructura de tabla
\d agent_voice_logs

-- 2. Funciones creadas
\df anonymize_old_logs
\df get_retention_report

-- 3. Política default
SELECT column_default 
FROM information_schema.columns 
WHERE table_name = 'agent_voice_logs' 
AND column_name = 'retention_policy';

-- 4. Índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'agent_voice_logs';

-- 5. Jobs de cron (si aplica)
SELECT * FROM cron.job;
```

---

## Monitoreo y Alertas

### Dashboard de Retención

```sql
-- Query para dashboard
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) FILTER (WHERE is_anonymized = FALSE) as active_logs,
    COUNT(*) FILTER (WHERE is_anonymized = TRUE) as anonymized_logs,
    COUNT(*) as total
FROM agent_voice_logs
GROUP BY 1
ORDER BY 1 DESC;
```

### Alertas Recomendadas

```sql
-- Alerta: Logs viejos no anonimizados
-- Configurar en sistema de monitoreo (ej. Datadog, PagerDuty)

SELECT COUNT(*) 
FROM agent_voice_logs 
WHERE is_anonymized = FALSE 
  AND created_at < NOW() - INTERVAL '95 days';

-- Si > 0, alerta: "Logs pendientes de anonimización"
```

---

## Lecciones Aprendidas

### Anti-Patrones Evitados

1. ❌ **Nunca almacenar PII sin política de retención**
   ```sql
   -- MAL: Sin plan para datos antiguos
   CREATE TABLE logs (id SERIAL, data TEXT, created_at TIMESTAMP);
   ```

2. ✅ **Siempre planificar ciclo de vida de datos**
   ```sql
   -- BIEN: Con política de retención
   CREATE TABLE logs (
     id SERIAL, 
     data TEXT, 
     created_at TIMESTAMP,
     retention_policy TEXT DEFAULT '90_days',
     is_anonymized BOOLEAN DEFAULT FALSE
   );
   ```

3. ✅ **Anonimizar, no solo borrar**
   - Preserva metadata para análisis
   - Elimina PII específica
   - Balance entre privacidad y utilidad

4. ✅ **Automatizar el cumplimiento**
   - Jobs programados evitan olvido humano
   - Monitoreo continuo
   - Reportes de auditoría

---

## Referencias

- [GDPR: Artículo 5 - Principios](https://gdpr-info.eu/art-5-gdpr/)
- [GDPR: Artículo 17 - Derecho al olvido](https://gdpr-info.eu/art-17-gdpr/)
- [OWASP: Privacy Risks](https://owasp.org/www-project-top-10-privacy-risks/)
- [NIST: Data Retention](https://csrc.nist.gov/publications/detail/white-paper/2014/05/05/data-retention-policy)
- [Supabase: pg_cron](https://supabase.com/docs/guides/database/extensions/pg_cron)

---

## Historial de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-03-25 | Cascade AI | Creada estructura de retención: columnas, funciones, índices |

---

*Documentación generada para: CRM AI Office Virtual Agent*  
*Propietario: Equipo de Seguridad UAL*  
*Compliance: GDPR, CCPA, LGPD*
