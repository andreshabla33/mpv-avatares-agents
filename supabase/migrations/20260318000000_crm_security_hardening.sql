-- Migración Día 2: Hardening de Seguridad (Rate Limiting, Auditoría y Preparación MFA)
-- Esta migración prepara la BD para escalabilidad Enterprise (Fase 2 y 3).

-------------------------------------------------------------------------------
-- 1. PREPARACIÓN PARA FASE 3: TABLA DE AUDITORÍA (SIEM)
-------------------------------------------------------------------------------
-- Esta tabla inmutable registrará todas las acciones críticas.
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    actor_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Solo inserción permitida (Inmutable)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los admins pueden ver la auditoría de su empresa"
    ON public.audit_logs FOR SELECT
    USING (
        (metadata->>'empresa_id')::integer = public.get_current_admin_empresa_id()
    );

-- Función helper para registrar en auditoría fácilmente desde otros RPC
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, actor_id, metadata)
    VALUES (
        p_action, 
        p_entity_type, 
        p_entity_id, 
        auth.uid(), 
        p_metadata || jsonb_build_object('empresa_id', public.get_current_admin_empresa_id())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-------------------------------------------------------------------------------
-- 2. RATE LIMITING EN BASE DE DATOS PARA ENDPOINTS (IA / VOZ)
-------------------------------------------------------------------------------
-- Tabla para registrar el uso de endpoints costosos y prevenir abuso
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES public.wp_empresa_perfil(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para búsquedas rápidas en la ventana de tiempo
CREATE INDEX idx_api_usage_empresa_time ON public.api_usage_logs (empresa_id, endpoint, created_at);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RPC para verificar Rate Limit: Devuelve TRUE si está permitido, FALSE si excedió el límite
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_endpoint TEXT,
    p_max_requests INTEGER,
    p_window_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_empresa_id INTEGER;
    v_recent_requests INTEGER;
BEGIN
    SELECT empresa_id INTO v_empresa_id FROM public.admin_profiles WHERE id = auth.uid();
    
    IF v_empresa_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Contar peticiones en la ventana de tiempo
    SELECT COUNT(*) INTO v_recent_requests
    FROM public.api_usage_logs
    WHERE empresa_id = v_empresa_id
      AND endpoint = p_endpoint
      AND created_at > now() - (p_window_minutes || ' minutes')::interval;

    IF v_recent_requests >= p_max_requests THEN
        -- Registrar intento fallido (Ataque potencial)
        PERFORM public.log_audit_event('rate_limit_exceeded', 'api', p_endpoint, jsonb_build_object('requests', v_recent_requests, 'limit', p_max_requests));
        RETURN FALSE;
    END IF;

    -- Registrar uso exitoso
    INSERT INTO public.api_usage_logs (empresa_id, endpoint) VALUES (v_empresa_id, p_endpoint);
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-------------------------------------------------------------------------------
-- 3. PREPARACIÓN FASE 2: POLÍTICAS DE ACCESO MFA (Multi-Factor Authentication)
-------------------------------------------------------------------------------
-- Estas políticas aseguran que acciones altamente destructivas o acceso a datos muy sensibles
-- (Fase 3: PII, facturación) requieran que el usuario haya iniciado sesión con MFA.

-- Ejemplo: Una vista de facturación futura o un delete crítico
-- CREATE POLICY "Solo admins con MFA pueden borrar agentes"
--     ON public.wp_agentes FOR DELETE
--     USING (
--         empresa_id = public.get_current_admin_empresa_id() 
--         AND (auth.jwt()->>'aal') = 'aal2' -- Verifica Nivel de Autenticación 2 (MFA)
--     );
