-- Migración: Integración Chatbots-Agentes CRM
-- Fecha: 2026-03-25
-- Descripción: Tablas y funciones para conectar chatbots externos con agentes del CRM

-------------------------------------------------------------------------------
-- 1. TABLA DE CONFIGURACIÓN DE CHATBOTS INTEGRADOS
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_integrations (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INTEGER NOT NULL REFERENCES public.wp_empresa_perfil(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('whatsapp', 'facebook', 'instagram', 'telegram', 'web', 'api')),
    
    -- Configuración del webhook externo
    webhook_url TEXT,  -- URL para enviar respuestas de vuelta al chatbot
    webhook_secret TEXT,  -- Secret para firmar requests
    webhook_headers JSONB DEFAULT '{}'::jsonb,  -- Headers adicionales
    
    -- Configuración de autenticación
    api_key_encrypted TEXT,  -- API key del servicio externo (encriptada)
    auth_type TEXT DEFAULT 'bearer' CHECK (auth_type IN ('bearer', 'basic', 'api_key', 'none')),
    
    -- Configuración de enrutamiento
    agente_id INTEGER REFERENCES public.wp_agentes(id),  -- Agente asignado por defecto
    distribucion_mode TEXT DEFAULT 'fixed' CHECK (distribucion_mode IN ('fixed', 'round_robin', 'least_busy', 'skill_based')),
    
    -- Configuración de comportamiento
    respuesta_automatica BOOLEAN DEFAULT true,  -- Responder automáticamente o esperar
    horario_atencion JSONB DEFAULT '{"timezone": "America/Mexico_City", "schedule": {"monday": {"start": "09:00", "end": "18:00"}}}'::jsonb,
    fuera_horario_mensaje TEXT DEFAULT 'Hola, en este momento estamos fuera de horario de atención. Te responderemos lo antes posible.',
    
    -- Estado y métricas
    activo BOOLEAN DEFAULT true,
    mensajes_recibidos INTEGER DEFAULT 0,
    mensajes_enviados INTEGER DEFAULT 0,
    ultimo_mensaje_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.chatbot_integrations ENABLE ROW LEVEL SECURITY;

-- RLS: Solo admins de la empresa pueden ver/modificar sus integraciones
CREATE POLICY "Admins pueden gestionar sus integraciones de chatbot"
    ON public.chatbot_integrations FOR ALL
    USING (empresa_id = public.get_current_admin_empresa_id());

-------------------------------------------------------------------------------
-- 2. TABLA DE CONVERSACIONES DE CHATBOT
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
    id BIGSERIAL PRIMARY KEY,
    chatbot_id INTEGER NOT NULL REFERENCES public.chatbot_integrations(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES public.wp_empresa_perfil(id) ON DELETE CASCADE,
    
    -- Identificadores externos
    external_conversation_id TEXT NOT NULL,  -- ID de conversación en el sistema externo
    external_user_id TEXT NOT NULL,  -- ID del usuario/cliente en el sistema externo
    external_user_name TEXT,  -- Nombre del usuario
    external_user_phone TEXT,  -- Teléfono (para WhatsApp)
    
    -- Asignación a agente
    agente_id INTEGER REFERENCES public.wp_agentes(id),
    agente_asignado_at TIMESTAMP WITH TIME ZONE,
    
    -- Estado de la conversación
    estado TEXT DEFAULT 'active' CHECK (estado IN ('active', 'waiting', 'closed', 'transferred')),
    prioridad INTEGER DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),  -- 1=urgente, 5=baja
    
    -- Contexto y metadata
    contexto JSONB DEFAULT '{}'::jsonb,  -- Variables de contexto de la conversación
    ultimo_mensaje TEXT,
    ultimo_mensaje_at TIMESTAMP WITH TIME ZONE,
    mensajes_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    closed_reason TEXT CHECK (closed_reason IN ('completed', 'timeout', 'transferred', 'spam'))
);

-- Índices para búsquedas eficientes
CREATE INDEX idx_chatbot_conv_chatbot ON public.chatbot_conversations(chatbot_id, estado);
CREATE INDEX idx_chatbot_conv_agente ON public.chatbot_conversations(agente_id, estado);
CREATE INDEX idx_chatbot_conv_external ON public.chatbot_conversations(external_conversation_id);
CREATE INDEX idx_chatbot_conv_empresa ON public.chatbot_conversations(empresa_id, created_at DESC);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- RLS: Solo admins de la empresa pueden ver conversaciones de su empresa
CREATE POLICY "Admins pueden ver conversaciones de su empresa"
    ON public.chatbot_conversations FOR ALL
    USING (empresa_id = public.get_current_admin_empresa_id());

-------------------------------------------------------------------------------
-- 3. TABLA DE MENSAJES DE CHATBOT
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
    empresa_id INTEGER NOT NULL REFERENCES public.wp_empresa_perfil(id) ON DELETE CASCADE,
    
    -- Contenido del mensaje
    remitente TEXT NOT NULL CHECK (remitente IN ('user', 'agent', 'system', 'bot')),
    contenido TEXT NOT NULL,
    tipo TEXT DEFAULT 'text' CHECK (tipo IN ('text', 'image', 'audio', 'file', 'location', 'template')),
    
    -- Metadata del mensaje
    external_message_id TEXT,  -- ID del mensaje en el sistema externo
    metadata JSONB DEFAULT '{}'::jsonb,  -- Info adicional (URLs de media, etc.)
    
    -- Estado de procesamiento
    procesado BOOLEAN DEFAULT false,
    error_procesamiento TEXT,
    enviado_externo BOOLEAN DEFAULT false,
    externo_error TEXT,
    
    -- Relación con agent_voice_logs (si aplica)
    voice_log_id INTEGER REFERENCES public.agent_voice_logs(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_chatbot_msg_conversation ON public.chatbot_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chatbot_msg_procesado ON public.chatbot_messages(procesado, created_at) WHERE procesado = false;

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Solo admins de la empresa pueden ver mensajes de su empresa
CREATE POLICY "Admins pueden ver mensajes de su empresa"
    ON public.chatbot_messages FOR ALL
    USING (empresa_id = public.get_current_admin_empresa_id());

-------------------------------------------------------------------------------
-- 4. FUNCIÓN PARA ENRUTAR CONVERSACIONES A AGENTES
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.route_conversation_to_agent(
    p_chatbot_id INTEGER,
    p_empresa_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_agente_id INTEGER;
    v_distribucion_mode TEXT;
    v_last_assigned_agent INTEGER;
BEGIN
    -- Obtener modo de distribución del chatbot
    SELECT distribucion_mode INTO v_distribucion_mode
    FROM public.chatbot_integrations
    WHERE id = p_chatbot_id;
    
    CASE v_distribucion_mode
        WHEN 'fixed' THEN
            -- Agente fijo asignado al chatbot
            SELECT agente_id INTO v_agente_id
            FROM public.chatbot_integrations
            WHERE id = p_chatbot_id;
            
        WHEN 'round_robin' THEN
            -- Round robin entre agentes activos de la empresa
            WITH agentes_ordenados AS (
                SELECT a.id, COALESCE(c.ultima_asignacion, '1970-01-01') as ultima_asignacion
                FROM public.wp_agentes a
                LEFT JOIN (
                    SELECT agente_id, MAX(agente_asignado_at) as ultima_asignacion
                    FROM public.chatbot_conversations
                    WHERE empresa_id = p_empresa_id
                    GROUP BY agente_id
                ) c ON c.agente_id = a.id
                WHERE a.empresa_id = p_empresa_id
                  AND a.active = true
                ORDER BY COALESCE(c.ultima_asignacion, '1970-01-01')
                LIMIT 1
            )
            SELECT id INTO v_agente_id FROM agentes_ordenados;
            
        WHEN 'least_busy' THEN
            -- Agente con menos conversaciones activas
            SELECT a.id INTO v_agente_id
            FROM public.wp_agentes a
            LEFT JOIN public.chatbot_conversations c 
                ON c.agente_id = a.id AND c.estado = 'active'
            WHERE a.empresa_id = p_empresa_id
              AND a.active = true
            GROUP BY a.id
            ORDER BY COUNT(c.id) ASC
            LIMIT 1;
            
        ELSE
            -- Por defecto: agente fijo o null
            SELECT agente_id INTO v_agente_id
            FROM public.chatbot_integrations
            WHERE id = p_chatbot_id;
    END CASE;
    
    RETURN v_agente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 5. FUNCIÓN PARA RECIBIR MENSAJES DE CHATBOTS EXTERNOS
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_chatbot_message(
    p_chatbot_id INTEGER,
    p_external_conversation_id TEXT,
    p_external_user_id TEXT,
    p_external_user_name TEXT,
    p_external_user_phone TEXT,
    p_contenido TEXT,
    p_external_message_id TEXT DEFAULT NULL,
    p_tipo TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_empresa_id INTEGER;
    v_conversation_id INTEGER;
    v_agente_id INTEGER;
    v_mensaje_id INTEGER;
    v_fuera_horario BOOLEAN := false;
    v_horario_config JSONB;
    v_result JSONB;
BEGIN
    -- Obtener empresa_id del chatbot
    SELECT empresa_id, horario_atencion INTO v_empresa_id, v_horario_config
    FROM public.chatbot_integrations
    WHERE id = p_chatbot_id;
    
    IF v_empresa_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Chatbot no encontrado');
    END IF;
    
    -- Verificar si está fuera de horario (lógica simplificada, puede expandirse)
    -- Por ahora asumimos siempre dentro de horario
    
    -- Buscar o crear conversación
    SELECT id, agente_id INTO v_conversation_id, v_agente_id
    FROM public.chatbot_conversations
    WHERE chatbot_id = p_chatbot_id
      AND external_conversation_id = p_external_conversation_id
      AND estado IN ('active', 'waiting');
    
    IF v_conversation_id IS NULL THEN
        -- Nueva conversación: enrutar a agente
        v_agente_id := public.route_conversation_to_agent(p_chatbot_id, v_empresa_id);
        
        INSERT INTO public.chatbot_conversations (
            chatbot_id, empresa_id, external_conversation_id, external_user_id,
            external_user_name, external_user_phone, agente_id, agente_asignado_at, estado
        ) VALUES (
            p_chatbot_id, v_empresa_id, p_external_conversation_id, p_external_user_id,
            p_external_user_name, p_external_user_phone, v_agente_id, 
            CASE WHEN v_agente_id IS NOT NULL THEN NOW() ELSE NULL END,
            CASE WHEN v_agente_id IS NOT NULL THEN 'active' ELSE 'waiting' END
        )
        RETURNING id INTO v_conversation_id;
    END IF;
    
    -- Insertar mensaje
    INSERT INTO public.chatbot_messages (
        conversation_id, empresa_id, remitente, contenido, tipo,
        external_message_id, metadata, procesado
    ) VALUES (
        v_conversation_id, v_empresa_id, 'user', p_contenido, p_tipo,
        p_external_message_id, p_metadata, false
    )
    RETURNING id INTO v_mensaje_id;
    
    -- Actualizar contadores de conversación
    UPDATE public.chatbot_conversations
    SET mensajes_count = mensajes_count + 1,
        ultimo_mensaje = p_contenido,
        ultimo_mensaje_at = NOW()
    WHERE id = v_conversation_id;
    
    -- Actualizar métricas del chatbot
    UPDATE public.chatbot_integrations
    SET mensajes_recibidos = mensajes_recibidos + 1,
        ultimo_mensaje_at = NOW()
    WHERE id = p_chatbot_id;
    
    -- Retornar resultado
    v_result := jsonb_build_object(
        'success', true,
        'conversation_id', v_conversation_id,
        'message_id', v_mensaje_id,
        'agente_id', v_agente_id,
        'fuera_horario', v_fuera_horario,
        'nueva_conversacion', v_agente_id IS NULL
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 6. FUNCIÓN PARA ENVIAR RESPUESTAS DESDE AGENTES
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_chatbot_response(
    p_conversation_id INTEGER,
    p_contenido TEXT,
    p_tipo TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB AS $$
DECLARE
    v_chatbot_id INTEGER;
    v_empresa_id INTEGER;
    v_external_conv_id TEXT;
    v_webhook_url TEXT;
    v_webhook_secret TEXT;
    v_webhook_headers JSONB;
    v_mensaje_id INTEGER;
BEGIN
    -- Obtener datos de la conversación y chatbot
    SELECT 
        c.chatbot_id, c.empresa_id, c.external_conversation_id,
        i.webhook_url, i.webhook_secret, i.webhook_headers
    INTO v_chatbot_id, v_empresa_id, v_external_conv_id, v_webhook_url, v_webhook_secret, v_webhook_headers
    FROM public.chatbot_conversations c
    JOIN public.chatbot_integrations i ON i.id = c.chatbot_id
    WHERE c.id = p_conversation_id;
    
    IF v_chatbot_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Conversación no encontrada');
    END IF;
    
    -- Insertar mensaje de respuesta
    INSERT INTO public.chatbot_messages (
        conversation_id, empresa_id, remitente, contenido, tipo, metadata
    ) VALUES (
        p_conversation_id, v_empresa_id, 'agent', p_contenido, p_tipo, p_metadata
    )
    RETURNING id INTO v_mensaje_id;
    
    -- Actualizar contadores
    UPDATE public.chatbot_integrations
    SET mensajes_enviados = mensajes_enviados + 1
    WHERE id = v_chatbot_id;
    
    -- Nota: El envío real al webhook externo se hace desde la edge function
    -- Esta función solo registra el mensaje en la BD
    
    RETURN jsonb_build_object(
        'success', true,
        'message_id', v_mensaje_id,
        'webhook_url', v_webhook_url,
        'external_conversation_id', v_external_conv_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-------------------------------------------------------------------------------
-- 7. TRIGGER PARA ACTUALIZAR updated_at
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chatbot_integrations_updated_at
    BEFORE UPDATE ON public.chatbot_integrations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-------------------------------------------------------------------------------
-- 8. FUNCIÓN PARA OBTENER CONVERSACIONES PENDIENTES DE UN AGENTE
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_agent_pending_conversations(
    p_agente_id INTEGER
) RETURNS TABLE (
    conversation_id INTEGER,
    chatbot_nombre TEXT,
    chatbot_tipo TEXT,
    external_user_name TEXT,
    external_user_phone TEXT,
    ultimo_mensaje TEXT,
    ultimo_mensaje_at TIMESTAMP WITH TIME ZONE,
    mensajes_pendientes BIGINT,
    prioridad INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as conversation_id,
        i.nombre as chatbot_nombre,
        i.tipo as chatbot_tipo,
        c.external_user_name,
        c.external_user_phone,
        c.ultimo_mensaje,
        c.ultimo_mensaje_at,
        COUNT(m.id) as mensajes_pendientes,
        c.prioridad
    FROM public.chatbot_conversations c
    JOIN public.chatbot_integrations i ON i.id = c.chatbot_id
    LEFT JOIN public.chatbot_messages m ON m.conversation_id = c.id AND m.procesado = false AND m.remitente = 'user'
    WHERE c.agente_id = p_agente_id
      AND c.estado = 'active'
    GROUP BY c.id, i.nombre, i.tipo, c.external_user_name, c.external_user_phone, c.ultimo_mensaje, c.ultimo_mensaje_at, c.prioridad
    ORDER BY c.prioridad ASC, c.ultimo_mensaje_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
