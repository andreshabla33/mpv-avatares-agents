-- Migración Día 3: Enmascaramiento de Datos y Preparación para Cifrado Pgsodium (Vault)
-- Objetivo: Proteger la PII (Información Personal Identificable) en logs y prepararse para escalabilidad Enterprise.

-------------------------------------------------------------------------------
-- 1. FUNCIÓN DE ENMASCARAMIENTO DE DATOS (DATA MASKING)
-------------------------------------------------------------------------------
-- Esta función reemplaza patrones que parecen tarjetas de crédito o teléfonos
-- en textos libres antes de que se guarden en claro en auditorías de uso regular.

CREATE OR REPLACE FUNCTION public.mask_sensitive_data(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    masked_text TEXT := input_text;
BEGIN
    -- Enmascarar números que parecen tarjetas de crédito (13-16 dígitos seguidos o con guiones/espacios)
    -- Ejemplo: 1234-5678-9012-3456 -> ****-****-****-3456
    masked_text := regexp_replace(
        masked_text,
        '\b(?:\d[ -]*?){12,15}\d\b',
        '[TARJETA ENMASCARADA]',
        'g'
    );

    -- Enmascarar números que parecen teléfonos (muy simplificado para el ejemplo)
    -- Ejemplo: +34 612 345 678 -> [TELÉFONO ENMASCARADO]
    masked_text := regexp_replace(
        masked_text,
        '\+?\b\d{2,3}[- \.]?\d{3}[- \.]?\d{4,6}\b',
        '[TELÉFONO ENMASCARADO]',
        'g'
    );

    RETURN masked_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-------------------------------------------------------------------------------
-- 2. ACTUALIZACIÓN DEL RPC log_agent_voice_interaction PARA USAR DATA MASKING
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_agent_voice_interaction(
    p_agente_id INTEGER,
    p_transcription TEXT,
    p_llm_response TEXT
) RETURNS public.agent_voice_logs AS $$
DECLARE
    v_log public.agent_voice_logs;
    v_empresa_id INTEGER;
    v_is_valid BOOLEAN;
    v_masked_transcription TEXT;
    v_masked_response TEXT;
BEGIN
    -- 1. Obtener la empresa del admin
    SELECT empresa_id INTO v_empresa_id FROM public.admin_profiles WHERE id = auth.uid();
    
    -- 2. Validar que el agente pertenezca a esa empresa (a través de wp_numeros)
    SELECT EXISTS (
        SELECT 1 FROM public.wp_numeros 
        WHERE agente_id = p_agente_id AND empresa_id = v_empresa_id
    ) INTO v_is_valid;

    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Acceso denegado: El agente no existe o no pertenece a tu empresa.';
    END IF;

    -- 2.5 Aplicar enmascaramiento antes de guardar
    v_masked_transcription := public.mask_sensitive_data(p_transcription);
    v_masked_response := public.mask_sensitive_data(p_llm_response);

    -- 3. Insertar el log de forma segura con los datos enmascarados
    INSERT INTO public.agent_voice_logs (admin_id, agente_id, transcription, llm_response)
    VALUES (auth.uid(), p_agente_id, v_masked_transcription, v_masked_response)
    RETURNING * INTO v_log;

    RETURN v_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-------------------------------------------------------------------------------
-- 3. PREPARACIÓN PARA SUPABASE VAULT (PGSODIUM)
-------------------------------------------------------------------------------
-- Nota: Para usar pgsodium, primero debe habilitarse la extensión en Supabase.
-- Dado que la extensión Vault requiere configuraciones específicas en la UI,
-- dejamos la estructura lista para cuando el proyecto escale a Enterprise.

-- Habilitación manual requerida:
-- CREATE EXTENSION IF NOT EXISTS pgsodium;
-- CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Ejemplo de cómo se vería la tabla futura para datos altamente sensibles usando el Vault:
/*
CREATE TABLE public.secure_crm_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id INTEGER REFERENCES public.wp_empresa_perfil(id),
    service_name TEXT NOT NULL,
    -- Aquí usaríamos el key_id del vault para cifrar el token
    encrypted_token TEXT NOT NULL, 
    key_id UUID NOT NULL
);
*/
