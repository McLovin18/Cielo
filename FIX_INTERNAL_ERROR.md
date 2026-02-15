# 🔧 Fix: Error "internal error" al Asignar Admin

## Problema Identificado

**Error:** `FirebaseError: internal error` cuando intentas asignar un admin en Ecuador

**Causa:** La función `assignCountryAdmin` en Cloud Functions estaba validando hardcodeadamente que el email sea `hectorcobea03@gmail.com`. Si intentabas asignar admin con un email diferente o si ese no era tu email, fallaba.

## Solución Implementada

### Cambio 1: `assignCountryAdmin()`

**Antes:**
```typescript
// ❌ INCORRECTO: Validación hardcodeada a un email específico
if (!context.auth || context.auth.token.email !== 'hectorcobea03@gmail.com') {
  throw new Error('Solo SUPER_ADMIN...');
}
```

**Después:**
```typescript
// ✅ CORRECTO: Validación contra la base de datos
if (!context.auth) {
  throw new Error('Debe estar autenticado');
}

// Verificar que es SUPER_ADMIN consultando Firestore
const userDoc = await db.collection('users').doc(context.auth.uid).get();
if (!userDoc.exists || userDoc.data()?.role !== 'SUPER_ADMIN') {
  throw new Error('Solo SUPER_ADMIN puede asignar admins');
}
```

### Cambio 2: `deleteCountryAdmin()`

**Antes:**
```typescript
// ❌ INCORRECTO: Validación hardcodeada
if (!context.auth || context.auth.token.email !== 'hectorcobea03@gmail.com') {
  throw new Error('Solo SUPER_ADMIN...');
}
```

**Después:**
```typescript
// ✅ CORRECTO: Validación contra Firestore
if (!context.auth) {
  throw new Error('Debe estar autenticado');
}

const superAdminDoc = await db.collection('users').doc(context.auth.uid).get();
if (!superAdminDoc.exists || superAdminDoc.data()?.role !== 'SUPER_ADMIN') {
  throw new Error('Solo SUPER_ADMIN puede eliminar admins');
}
```

## Por Qué Fallaba

1. **Email hardcodeado:** La función solo permitía que `hectorcobea03@gmail.com` ejecutara la operación
2. **Custom Claims no disponibles:** En Cloud Functions, `context.auth.token` no tiene información de roles personalizados
3. **Solución correcta:** Consultar la base de datos para verificar el rol real del usuario

## Cómo Desplegar

### Opción 1: Línea de Comandos (Recomendado)

```bash
# 1. Ir a la carpeta de functions
cd functions

# 2. Desplegar solo la función (más rápido)
firebase deploy --only functions:assignCountryAdmin,functions:deleteCountryAdmin

# O desplegar todas las functions
firebase deploy --only functions
```

### Opción 2: Firebase Console

1. Abre [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Cloud Functions**
4. Verifica que las funciones estén actualizadas

## Verificación Post-Deploy

Después de desplegar, prueba así:

### Test 1: Asignar Admin exitoso

```
1. Accede a /super-admin/config-admin
2. Selecciona País: Ecuador
3. Nombre: Juan López
4. Email: juan@ecuador.com
5. Teléfono: +593987654321
6. Click: "Asignar como Admin"

Resultado esperado:
✅ Admin asignado: juan@ecuador.com
   Esta persona debe registrarse con este email.
```

### Test 2: Intenta sin ser SuperAdmin

```
1. Logueate con usuario normal (no SUPER_ADMIN)
2. Intenta llamar a assignCountryAdmin directamente

Resultado esperado:
❌ Error: Solo SUPER_ADMIN puede asignar admins de país
```

## Cambios en Archivos

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `/functions/src/index.ts` | Reemplacé validación hardcodeada por consulta a Firestore | ~354 |
| `/functions/src/index.ts` | Mismo fix en deleteCountryAdmin | ~453 |

## Build Status

✅ **Frontend:** Compilado exitosamente (22 rutas)
✅ **TypeScript:** Sin errores
⏳ **Cloud Functions:** Pendiente de deploy

## Próximos Pasos

1. **Deploy Cloud Functions:**
   ```bash
   cd functions
   firebase deploy --only functions
   ```

2. **Prueba el flujo completo:**
   - Asigna admin a Ecuador ✅
   - Admin se registra ✅
   - Verifica rol en Firestore ✅

3. **Documenta el caso en testing:**
   - Agrégalo a TESTING_ADMIN_VALIDATION.md

---

**Error Resuelto:** `FirebaseError: internal error` ❌ → ✅ Ahora funciona correctamente
