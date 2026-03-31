# 🏠 DEPLOY LOCAL - UAL Office Virtual Agent

## Opciones para Demo Local al CEO

### ✅ OPCIÓN 1: Servir Build de Producción (Recomendado)

**Mejor para:** Demo profesional, más rápido, sin hot-reload

```bash
# 1. Construir para producción
npm run build

# 2. Servir localmente (opciones)

# Opción A: Con Python (si está instalado)
cd dist && python3 -m http.server 8080

# Opción B: Con Node.js (si tienes npx)
npx serve -s dist -l 8080

# Opción C: Con PHP (si está instalado)
cd dist && php -S localhost:8080

# Opción D: Usando el preview de Vite
npm run preview
```

**Abrir:** http://localhost:8080

---

### ⚡ OPCIÓN 2: Modo Desarrollo con Vite

**Mejor para:** Desarrollo activo, hot-reload

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir navegador automáticamente en:
# http://localhost:5173 (o el puerto que muestre la consola)
```

**Ventajas:**
- Hot module reload (cambios instantáneos)
- Source maps para debugging
- Más rápido para iterar

**Desventajas:**
- No es el build final de producción
- Puede tener logs de debug visibles

---

### 🐳 OPCIÓN 3: Docker (Si tienes Docker)

```bash
# Crear Dockerfile temporal
cat > Dockerfile << 'EOF'
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY netlify.toml /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Construir y ejecutar
docker build -t ual-office .
docker run -p 8080:80 ual-office
```

**Abrir:** http://localhost:8080

---

## 📋 PASOS RÁPIDOS (Ejecutar ahora)

```bash
# 1. Instalar dependencias (si no lo has hecho)
npm ci

# 2. Construir
npm run build

# 3. Servir
npx serve -s dist -l 8080
```

**Listo en:** http://localhost:8080

---

## 🔧 PREPARACIÓN PARA CEO DEMO

### 1. Verificar Environment Variables

El archivo `.env` en tu máquina local debe tener:

```
VITE_SUPABASE_URL=https://vecspltvmyopwbjzerow.supabase.co
VITE_SUPABASE_ANON_KEY=tu_key_aqui
```

### 2. Verificar Build

```bash
# Construir
npm run build

# Verificar que se creó dist/
ls -la dist/

# Debe mostrar:
# - index.html
# - assets/ (JS, CSS)
# - assets/ (imágenes, fuentes)
```

### 3. Iniciar Servidor Local

```bash
# Terminal 1: Servir la app
npx serve -s dist -l 8080

# O con Vite preview
npm run preview -- --port 8080
```

### 4. Abrir en Navegador

```
http://localhost:8080
```

---

## 🖥️ PARA PRESENTACIÓN EN LAPTOP LOCAL

### Setup Recomendado:

1. **Pantalla completa (F11)**
2. **Zoom 100%** (Ctrl+0 para resetear)
3. **DevTools cerrados** (F12 para toggle)
4. **Modo Incógnito** (evita cache de extensiones)

### Atajos Útiles:

| Acción | Tecla |
|--------|-------|
| Fullscreen | F11 |
| Refresh | F5 o Ctrl+R |
| DevTools | F12 |
| Zoom In | Ctrl++ |
| Zoom Out | Ctrl+- |
| Reset Zoom | Ctrl+0 |

---

## 🌐 COMPARTIR EN RED LOCAL (Opcional)

Si el CEO está en la misma red:

```bash
# Obtener IP local
ip addr show | grep "inet " | head -1
# o
ifconfig | grep "inet " | head -1

# Ejemplo: 192.168.1.100
# URL para CEO: http://192.168.1.100:8080
```

**Nota:** Asegúrate que el firewall permite puerto 8080

---

## ✅ CHECKLIST PRE-DEMO

- [ ] `npm ci` ejecutado sin errores
- [ ] `npm run build` exitoso
- [ ] Servidor iniciado en puerto 8080
- [ ] http://localhost:8080 carga correctamente
- [ ] Agentes visibles en oficina 2D
- [ ] Departamentos de colores visibles
- [ ] Conexión a Supabase funcionando (datos en tiempo real)
- [ ] Sin errores en consola (F12)
- [ ] Navegador en modo incógnito
- [ ] Pantalla completa activada

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "Cannot find module"
```bash
rm -rf node_modules
npm ci
```

### "Port 8080 already in use"
```bash
# Matar proceso en puerto 8080
lsof -ti:8080 | xargs kill -9
# o usar otro puerto
npx serve -s dist -l 3000
```

### "Blank screen"
```bash
# Reconstruir
rm -rf dist
npm run build
# Verificar que hay archivos en dist/assets/
ls -la dist/assets/
```

### "Failed to connect to Supabase"
- Verificar `.env` tiene las variables correctas
- Verificar Supabase project está online
- Verificar CORS está configurado en Supabase

---

## 📝 COMANDOS RÁPIDOS (Copiar y Pegar)

```bash
# Setup completo en un solo bloque:
rm -rf dist node_modules && \
npm ci && \
npm run build && \
npx serve -s dist -l 8080
```

---

## 🎯 RESUMEN

| Método | Comando | URL | Uso |
|--------|---------|-----|-----|
| **Producción** | `npx serve -s dist -l 8080` | localhost:8080 | ✅ **Demo CEO** |
| **Desarrollo** | `npm run dev` | localhost:5173 | Desarrollo |
| **Preview** | `npm run preview` | localhost:4173 | Test build |

**Recomendación:** Usar **Producción** (`serve`) para la demo al CEO - es el build final optimizado.

---

**Tu app estará lista en:** http://localhost:8080
