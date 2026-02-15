# 🔐 CONFIGURACIÓN DE SUPER_ADMIN EN FIRESTORE RULES

## Punto Clave

**El SUPER_ADMIN está definido DIRECTAMENTE en las REGLAS DE FIRESTORE**

✅ NO está en una colección `/users`  
✅ Se verifica por EMAIL o CLAIM PERSONALIZADO  
✅ No depende de datos en Firestore

---

## Cómo Funciona

### En firestore.rules

```javascript
// 🔐 SUPER_ADMIN - Definido directamente en las REGLAS
// NO depende de la colección /users
// Verificación por email o claim personalizado
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}
```

**Opciones de verificación:**

1. **Por Email (Actual):**
   ```javascript
   request.auth.token.email == 'hectorcobea03@gmail.com'
   ```

2. **Por Claim Personalizado:**
   ```javascript
   request.auth.token.admin == true
   ```

3. **Por UID (Alternativa):**
   ```javascript
   request.auth.uid == 'uid-del-superadmin'
   ```

---

## Configuración en Firebase

### Opción 1: Verificación por Email (Recomendada)
```javascript
// Solo requiere que el usuario inicie sesión con ese email
function isSuperAdmin() {
  return request.auth != null && 
    request.auth.token.email == 'hectorcobea03@gmail.com';
}
```

**Ventajas:**
- ✅ No requiere configuración adicional
- ✅ Funciona inmediatamente
- ✅ Simple y confiable

**Pasos:**
1. Crear usuario en Firebase Auth con email: `hectorcobea03@gmail.com`
2. Las reglas verificarán automáticamente
3. ¡Listo!

---

### Opción 2: Claims Personalizados (Más Seguro)
```javascript
// Requiere claims personalizados configurados en Firebase Auth
function isSuperAdmin() {
  return request.auth != null && 
    request.auth.token.admin == true;
}
```

**Ventajas:**
- ✅ Más flexible
- ✅ Permite cambiar permisos sin actualizar reglas
- ✅ Mejor para múltiples super admins

**Pasos:**
1. Crear usuario en Firebase Auth
2. Usar Firebase Admin SDK para asignar claim:
   ```javascript
   admin.auth().setCustomUserClaims(uid, {admin: true});
   ```
3. El claim se verifica automáticamente en `request.auth.token`

---

### Opción 3: Combinada (Recomendada)
```javascript
// Verifica email O claim personalizado
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}
```

**Ventajas:**
- ✅ Funciona con email predeterminado
- ✅ Permite agregar más admins con claims
- ✅ Máxima flexibilidad

---

## Estructura de /users

La colección `/users` contiene SOLO:
- ADMIN_COUNTRY
- DISTRIBUTOR
- STORE

**NO contiene SUPER_ADMIN**

```javascript
// ✅ Usuarios EN la colección /users
{
  email: "admin@ecuador.com",
  role: "ADMIN_COUNTRY",
  countryId: "ECU",
  status: "active"
}

// ❌ SUPER_ADMIN NO está en /users
// ✅ SUPER_ADMIN se verifica en las REGLAS
```

---

## Comparación Antigua vs Nueva

### ❌ Anterior (Incorrecto)
```javascript
function isSuperAdmin() {
  return isRole('SUPER_ADMIN');  // Leía de /users
}

// Requería documento en /users con role: 'SUPER_ADMIN'
```

### ✅ Actual (Correcto)
```javascript
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}

// Verifica directamente en Auth, sin depender de /users
```

---

## Implementación Completa

### 1. Crear Usuario en Firebase Auth
```bash
# En Firebase Console o con Admin SDK
email: hectorcobea03@gmail.com
password: (segura)
```

### 2. (Opcional) Agregar Claim Personalizado
```javascript
// Cloud Function o scripts
const admin = require('firebase-admin');

admin.auth().setCustomUserClaims('uid-del-superadmin', {
  admin: true
}).then(() => {
  console.log('Claim agregado');
});
```

### 3. Las Reglas se Aplican Automáticamente
```javascript
// Cualquier operación verificará isSuperAdmin()
// que lee request.auth.token.email o request.auth.token.admin
```

---

## Archivo Actualizado

**Ubicación:** `firestore.rules`

**Línea de Definición:** ~42-48

```javascript
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}
```

---

## Verificación

### Test 1: Acceso Completo
```
Usuario: hectorcobea03@gmail.com
✅ Puede leer: TODOS los datos
✅ Puede crear: Cualquier documento
✅ Puede actualizar: Cualquier documento
✅ Puede eliminar: Cualquier documento
```

### Test 2: Otro Usuario
```
Usuario: otro@email.com
❌ No tiene acceso de SUPER_ADMIN
✅ Acceso según su rol (ADMIN_COUNTRY, DISTRIBUTOR, etc)
```

---

## Cambios en firestore.rules

### Encabezado Actualizado
```javascript
// 📋 DEFINICIÓN DE SUPER_ADMIN:
// ✅ Definido directamente en las REGLAS (no en colección)
// ✅ Verificado por email: hectorcobea03@gmail.com
// ✅ O por claim personalizado: admin = true
```

### Función isSuperAdmin()
```javascript
// 🔐 SUPER_ADMIN - Definido directamente en las REGLAS
// NO depende de la colección /users
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}
```

### Colección /users
```javascript
// 📝 NOTA: SUPER_ADMIN NO está en esta colección
//    está definido en las REGLAS
//    
// Esta colección contiene:
// - ADMIN_COUNTRY
// - DISTRIBUTOR
// - STORE
```

---

## Resumen

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Ubicación SUPER_ADMIN** | Colección `/users` | Reglas (Rules) |
| **Verificación** | Lectura de doc | Email/Claim Auth |
| **Depende de** | Documento Firestore | Firebase Auth Token |
| **Configuración** | Manual en Firestore | Firebase Auth Console |
| **Flexibilidad** | Baja | Alta |

---

**Archivo Principal:** `firestore.rules`  
**Definición:** Línea ~42-48  
**Status:** ✅ Implementado y listo para usar
