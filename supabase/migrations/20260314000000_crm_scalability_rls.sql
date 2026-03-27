-- Migración Día 1: Cimientos del Backend (Supabase, RLS, Tablas para Voz y RPC)
-- Este script prepara la BD para escalabilidad, multi-tenant (múltiples empresas) e interacciones por voz.

-------------------------------------------------------------------------------
-- 1. CREACIÓN DE TABLAS NUEVAS
-------------------------------------------------------------------------------

-- Tabla para enlazar el usuario de Autenticación de Supabase (auth.users) con una empresa del CRM.
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id INTEGER REFERENCES public.wp_empresa_perfil(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para almacenar el registro de interacciones de voz entre Admin y Agente.
CREATE TABLE IF NOT EXISTS public.agent_voice_logs (
    id BIGSERIAL PRIMARY KEY,
    admin_id UUID REFERENCES public.admin_profiles(id) ON DELETE CASCADE,
    agente_id INTEGER REFERENCES public.wp_agentes(id) ON DELETE CASCADE,
    transcription TEXT NOT NULL,
    llm_response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-------------------------------------------------------------------------------
-- 2. CONFIGURACIÓN DE RLS (ROW LEVEL SECURITY)
-------------------------------------------------------------------------------

-- Habilitar RLS en las tablas nuevas
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_voice_logs ENABLE ROW LEVEL SECURITY;

-- (Opcional) Habilitar RLS en tablas existentes si aún no lo tienen
ALTER TABLE public.wp_empresa_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wp_agentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wp_numeros ENABLE ROW LEVEL SECURITY;

-- Función Helper: Obtener el ID de la empresa del administrador logueado actualmente
CREATE OR REPLACE FUNCTION public.get_current_admin_empresa_id()
RETURNS INTEGER AS $$
    SELECT empresa_id FROM public.admin_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas para admin_profiles
CREATE POLICY "Admins pueden ver su propio perfil" 
    ON public.admin_profiles FOR SELECT 
    USING (id = auth.uid());

-- Políticas para wp_empresa_perfil
CREATE POLICY "Admins pueden ver solo su propia empresa" 
    ON public.wp_empresa_perfil FOR SELECT 
    USING (id = public.get_current_admin_empresa_id());

-- Políticas para wp_numeros (Canales)
CREATE POLICY "Admins pueden ver canales de su empresa" 
    ON public.wp_numeros FOR SELECT 
    USING (empresa_id = public.get_current_admin_empresa_id());

-- Políticas para wp_agentes 
-- Optimización de rendimiento y seguridad: Validamos usando la columna desnormalizada empresa_id
CREATE POLICY "Admins pueden ver agentes de su empresa" 
    ON public.wp_agentes FOR SELECT 
    USING (empresa_id = public.get_current_admin_empresa_id());

-- Políticas para agent_voice_logs
CREATE POLICY "Admins pueden gestionar sus propios logs de voz" 
    ON public.agent_voice_logs FOR ALL 
    USING (admin_id = auth.uid());

-------------------------------------------------------------------------------
-- 3. FUNCIONES RPC (Stored Procedures Seguros)
-------------------------------------------------------------------------------

-- RPC: Registrar de forma segura una interacción de voz
-- Esto previene inyecciones SQL y verifica que el admin tenga permisos sobre el agente
CREATE OR REPLACE FUNCTION public.log_agent_voice_interaction(
    p_agente_id INTEGER,
    p_transcription TEXT,
    p_llm_response TEXT
) RETURNS public.agent_voice_logs AS $$
DECLARE
    v_log public.agent_voice_logs;
    v_empresa_id INTEGER;
    v_is_valid BOOLEAN;
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

    -- 3. Insertar el log de forma segura
    INSERT INTO public.agent_voice_logs (admin_id, agente_id, transcription, llm_response)
    VALUES (auth.uid(), p_agente_id, p_transcription, p_llm_response)
    RETURNING * INTO v_log;

    RETURN v_log;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
