# Guía de Deploy - UAL Office Virtual Agent

## Configuración de Variables de Entorno en Netlify

El error `supabaseUrl is required` indica que las variables de entorno no están configuradas correctamente en Netlify.

### Paso 1: Variables Requeridas

Ve a tu dashboard de Netlify:
1. Abre tu sitio
2. Ve a **Site settings** → **Environment variables**
3. Agrega estas variables:

| Variable | Valor | ¿Dónde lo encuentro? |
|----------|-------|---------------------|
| `VITE_SUPABASE_URL` | `https://vecspltvmyopwbjzerow.supabase.co` | Supabase Dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_...` | Supabase Dashboard → Project Settings → API → "Project API keys" |

⚠️ **IMPORTANTE:** `VITE_SUPABASE_ANON_KEY` debe ser la **publishable key** (empieza con `sb_publishable_`), NO la service_role key.

### Paso 2: Re-deploy

Después de agregar las variables:
1. Ve a **Deploys** en el dashboard de Netlify
2. Haz clic en **Trigger deploy** → **Deploy site**
3. Espera a que el build complete

### Paso 3: Verificación

Abre la consola del navegador (F12) y verifica que no aparezca:
```
Uncaught Error: Missing Supabase environment variables...
```

Si ves ese mensaje, las variables aún no están configuradas correctamente.

### Configuración Local vs Producción

**Local (desarrollo):**
- Usa archivo `.env` en la raíz del proyecto
- Vite lo lee automáticamente con `import.meta.env.VITE_*`

**Producción (Netlify):**
- Las variables deben estar en **Site settings → Environment variables**
- El `netlify.toml` tiene `VITE_SUPABASE_URL` hardcodeado (ya está configurado)
- `VITE_SUPABASE_ANON_KEY` **debe** estar en el dashboard de Netlify (por seguridad)

### Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| `supabaseUrl is required` | Falta `VITE_SUPABASE_URL` | Verificar variable en Netlify UI |
| `Missing Supabase environment variables` | Falta alguna variable | Revisar que ambas estén definidas |
| 401 Unauthorized en API | Anon key incorrecta | Verificar que uses la publishable key |

### Archivos Modificados

- `netlify.toml` - Agregado `[build.environment]` con URL de Supabase
- `src/hooks/useAgentStates.js` - Validación de variables con mensaje claro
- `src/lib/supabase.js` - Validación de variables con mensaje claro
