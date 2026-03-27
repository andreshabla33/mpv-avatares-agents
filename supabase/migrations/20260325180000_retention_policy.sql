-- Migración: Política de Retención de Datos (GDPR Compliance)
-- Fecha: 2026-03-25
-- Propósito: Establecer estructura para retención controlada de logs de voz
-- NOTA: Esta migración NO modifica datos existentes, solo prepara la estructura

-- 1. Agregar columna de política de retención a la tabla de logs
ALTER TABLE IF EXISTS public.agent_voice_logs 
ADD COLUMN IF NOT EXISTS retention_policy TEXT DEFAULT '90_days' 
CHECK (retention_policy IN ('30_days', '90_days', '1_year', 'indefinite'));

-- 2. Agregar columna para indicar si el registro ha sido anonimizado
ALTER TABLE IF EXISTS public.agent_voice_logs 
ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE;

-- 3. Agregar índice para optimizar limpieza programada
CREATE INDEX IF NOT EXISTS idx_agent_voice_logs_created_at 
ON public.agent_voice_logs(created_at) 
WHERE is_anonymized = FALSE;

-- 4. Función para anonimización segura (cumplimiento GDPR)
-- Esta función reemplaza contenido sensible con '[REDACTED]' en lugar de borrar,
-- preservando metadata para estadísticas mientras protege privacidad
CREATE OR REPLACE FUNCTION public.anonymize_old_voice_logs()
RETURNS TABLE (processed_count INTEGER) AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Solo procesar registros que:
    -- 1. Tienen política de retención vencida (según su configuración)
    -- 2. No han sido anonimizados previamente
    -- 3. Son más antiguos que el período de retención especificado
    
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
        -- Preservar metadata pero anonimizar contenido
        updated_at = NOW()
    FROM eligible_logs el
    WHERE vl.id = el.id;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    -- Retornar cantidad procesada para logging
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para reporte de retención (auditoría)
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

-- 6. Comentarios de documentación en la tabla
COMMENT ON COLUMN public.agent_voice_logs.retention_policy IS 
'Política de retención: 30_days, 90_days, 1_year, o indefinite. Default: 90_days';

COMMENT ON COLUMN public.agent_voice_logs.is_anonymized IS 
'Indica si el contenido sensible ha sido anonimizado según la política de retención';

-- 7. Nota para implementación futura de pg_cron
/* 
Para automatizar la limpieza, instalar la extensión pg_cron y programar:

SELECT cron.schedule(
    'daily-voice-logs-cleanup',  -- nombre del job
    '0 3 * * *',                 -- 3:00 AM daily
    'SELECT anonymize_old_voice_logs()'
);

O ejecutar manualmente cuando sea necesario:
SELECT * FROM anonymize_old_voice_logs();
*/

-- Verificación: Mostrar estado actual (no afecta datos)
SELECT 
    'Migration applied successfully' as status,
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE is_anonymized = TRUE) as already_anonymized
FROM public.agent_voice_logs;
