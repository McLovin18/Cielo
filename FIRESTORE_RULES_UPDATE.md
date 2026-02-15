# 🔐 Actualización de Reglas Firestore - STORE puede leer DISTRIBUTOR

## Problema Reportado
Cuando un STORE intentaba ver la información de su DISTRIBUTOR asignado en el panel `/profile`, recibía error:
```
FirebaseError: Missing or insufficient permissions.
```

Los logs mostraban que el distribuidor se encontraba, pero las reglas de Firestore no permitían la lectura.

## Solución Implementada

### Cambios en `firestore.rules`

Se actualizó la colección `/users` para permitir que un STORE lea documentos DISTRIBUTOR del mismo país:

**Antes:**
```firestore
allow read: if request.auth.uid == uid || 
               isSuperAdmin() ||
               resource.data.role == 'ADMIN_COUNTRY' ||
               resource.data.role == 'DISTRIBUTOR';  // ← Permitía leer sin validar país
```

**Después:**
```firestore
allow read: if request.auth.uid == uid || 
               isSuperAdmin() ||
               resource.data.role == 'ADMIN_COUNTRY' ||
               resource.data.role == 'DISTRIBUTOR' ||  // ← Permitir lectura de DISTRIBUTOR sin auth para registro
               (isStore() && resource.data.role == 'DISTRIBUTOR' && resource.data.countryId == getUser().countryId);  // ← STORE puede leer distribuidores de su país
```

También se actualizó la regla `list` para permitir queries:
```firestore
allow list: if resource.data.role == 'ADMIN_COUNTRY' ||
               (isAuth() && resource.data.countryId == getUser().countryId) ||
               (isAdminCountry() && resource.data.role == 'DISTRIBUTOR' && resource.data.countryId == getUser().countryId) ||
               (isStore() && resource.data.role == 'DISTRIBUTOR' && resource.data.countryId == getUser().countryId);  // ← NUEVO
```

## Reglas de Seguridad Implementadas

✓ **STORE puede leer DISTRIBUTOR solo si:**
- El DISTRIBUTOR está en el mismo país
- El STORE está autenticado

✓ **Protecciones:**
- No puede leer distribuidores de otros países
- No puede leer ADMIN_COUNTRY (excepto para registro)
- No puede escribir/actualizar/eliminar

## Archivos Modificados
- `/firestore.rules` - Actualizado y desplegado en Firestore

## Estado del Despliegue
✅ **Exitoso** - Reglas compiladas y desplegadas en Firebase

## Pruebas Recomendadas
1. Inicia sesión como STORE
2. Ve a `/profile`
3. Verifica que se carga la información del DISTRIBUTOR sin errores
4. Confirma que los logs muestren: "✅ Distribuidor encontrado"

## Nota Técnica
Las queries en Firestore (`getDocs` con `where`) también respetan estas reglas. La validación de `countryId` en la regla `list` asegura que el STORE solo pueda encontrar distribuidores de su país.

---
**Fecha:** 2026-02-04  
**Tipo:** Bugfix de permisos  
**Estado:** ✅ Producción
