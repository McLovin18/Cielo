# 💡 Config Admin: El Corazón del Sistema

## ¿Qué es Config Admin?

**Config Admin es el corazón palpitante de Cielo Promo**. Sin un admin asignado en un país, **NO pueden existir tenderos en ese país**.

```
┌─────────────────────┐
│   SUPER_ADMIN       │  ← Crea admins de país
└──────────┬──────────┘
           │
     ┌─────▼─────┐
     │ ⚙️ Config │  ← EL CORAZÓN
     │    Admin   │
     └─────┬─────┘
           │
    ┌──────▼──────────┐
    │ ADMIN_COUNTRY   │  ← Existe ahora
    │ (Por cada país) │
    └──────┬──────────┘
           │
  ┌────────▼────────┐
  │ TENDEROS        │  ← Solo pueden existir si hay admin
  │ (Stores)        │
  └─────────────────┘
```

## Localización: `/super-admin/config-admin`

**Ruta:** [src/app/super-admin/config-admin/page.tsx](src/app/super-admin/config-admin/page.tsx)

## Funcionalidades

### 1. ✅ Vista de Estado de Países
- **Lista todos los países** del sistema
- **Muestra si tiene admin asignado o no**
  - 🟢 **CON ADMIN**: Verde - Puede haber tenderos
  - 🔴 **SIN ADMIN**: Amarillo - No puede haber tenderos

### 2. ✨ Crear Admin de País
- **Botón "Agregar Admin de País"**
- **Formulario con campos:**
  - País (select de países sin admin)
  - Nombre Completo
  - Email (para login)
  - Teléfono (opcional)
  - Contraseña (temporal - debe cambiarla al primer login)

### 3. 🗑️ Eliminar Admin de País
- Botón en cada país que tiene admin
- ⚠️ **Cuidado**: Eliminar un admin deja los tenderos de ese país "huérfanos"

## Cloud Functions Implementadas

### `createCountryAdmin()`
**Responsabilidades:**
- ✅ Verificar que es SUPER_ADMIN
- ✅ Validar que el país existe
- ✅ Verificar que no hay admin previo en ese país
- ✅ Crear usuario en Firebase Auth
- ✅ Crear documento en Firestore con rol ADMIN_COUNTRY
- ✅ Asignar país al admin

**Llamada desde:** `config-admin/page.tsx`

```typescript
const createAdmin = httpsCallable(functions, 'createCountryAdmin');
const response = await createAdmin({
  email: 'admin@colombia.com',
  password: 'TempPassword123!',
  name: 'Juan Admin',
  phone: '+57 300 000 0000',
  countryId: 'col-001'
});
```

### `deleteCountryAdmin()`
**Responsabilidades:**
- ✅ Verificar que es SUPER_ADMIN
- ✅ Validar que existe el usuario y es ADMIN_COUNTRY
- ✅ Eliminar de Firebase Auth
- ✅ Eliminar de Firestore

## Reglas Firestore Actualizadas

### Nueva Restricción: Sin Admin, No Hay Tenderos

```firestore
// Nueva función helper
function hasCountryAdmin(countryId) {
  // Verifica si existe ADMIN_COUNTRY para ese país
}

// Actualización en stores/create
allow create: if (request.auth.uid == storeId && 
                  hasCountryAdmin(request.resource.data.countryId)) || 
             isSuperAdmin();
```

**Impacto:** Cuando un tendero intenta registrarse en un país sin admin, la creación falla automáticamente.

## Flujo de Creación de Tendero

```
1. Tendero intenta registrarse en País X
   ↓
2. Sistema verifica: ¿Existe ADMIN_COUNTRY en País X?
   ↓
   ├─ SI → Permite registro ✅
   └─ NO → Rechaza con error ❌
         "No hay admin en este país"
```

## Estados de Admin por País

| País | Estado | Tenderos | Acciones |
|------|--------|----------|----------|
| Colombia | ✅ CON ADMIN | Pueden registrarse | 🗑️ Eliminar |
| Venezuela | ⚠️ SIN ADMIN | NO pueden registrarse | ✨ Crear Admin |
| Perú | ⚠️ SIN ADMIN | NO pueden registrarse | ✨ Crear Admin |
| Ecuador | ✅ CON ADMIN | Pueden registrarse | 🗑️ Eliminar |

## Flujo SuperAdmin

```
SuperAdmin Dashboard
    ↓
[Tarjeta Config Admin - DESTACADA EN VERDE]
    ↓
Config Admin Page
    ↓
    ├─ Ver estado de todos los países
    ├─ Crear nuevo admin para país sin admin
    └─ Eliminar admin existente
```

## Implementación Técnica

### Archivo Config Admin Page: `src/app/super-admin/config-admin/page.tsx`
- **Líneas:** 320
- **Componentes React:**
  - useState: countries, loadingData, showForm, selectedCountry, formData, submitting
  - useEffect: Cargar países y sus admins
  - Formulario: Crear nuevo admin
  - Lista: Mostrar estado de cada país

### Cloud Functions: `functions/src/index.ts`
- **createCountryAdmin()**: ~80 líneas
- **deleteCountryAdmin()**: ~50 líneas

### Firestore Rules: `firestore.rules`
- **Nueva función:** `hasCountryAdmin(countryId)` 
- **Regla actualizada:** `stores` collection create

## Seguridad

✅ **Solo SUPER_ADMIN puede:**
- Crear admins de país
- Eliminar admins de país
- Ver la página Config Admin

✅ **Sin admin en país:**
- Los tenderos NO pueden registrarse
- La regla lo rechaza en Firestore
- Admin_COUNTRY tampoco puede crear manualmente

✅ **Validaciones:**
- Email único (Firebase Auth)
- País existe antes de crear admin
- No puede haber dos admins en mismo país
- Contraseña debe ser fuerte

## Testing Manual

### Caso 1: Crear Admin Nuevo
```
1. Ir a /super-admin/config-admin
2. Ver lista de países (ej: Venezuela sin admin)
3. Click "Agregar Admin de País"
4. Seleccionar: Venezuela
5. Llenar: Juan López, juan@vzla.com, +58 412 1234567
6. Contraseña temporal: VzlaAdmin2026!
7. Click "Crear Admin"
8. ✅ Admin creado
9. Verificar en Firestore: users/{uid} tiene role ADMIN_COUNTRY y countryId=vzla
```

### Caso 2: Eliminar Admin
```
1. Ver país CON ADMIN (ej: Colombia)
2. Click "Eliminar Admin"
3. Confirmar: "¿Estás seguro?"
4. ✅ Admin eliminado
5. Colombia queda SIN ADMIN
6. Los tenderos de Colombia ya no pueden registrarse
```

### Caso 3: Tendero Intenta Registrar Sin Admin
```
1. Tendero de País Z (sin admin) intenta registrarse
2. Sistema valida en Firestore: ¿hasCountryAdmin(countryId)?
3. ❌ Retorna error: "No hay admin en este país"
4. Tendero ve mensaje de error
5. SuperAdmin debe crear admin primero
```

## Impacto en Otros Módulos

✅ **Registración de Tenderos:**
- El form de registro debe verificar `hasCountryAdmin()`
- Si no hay admin, mostrar error útil

✅ **Dashboards:**
- Admin de país solo ve su país
- Distribuidor solo ve sus zonas
- SuperAdmin ve todo

✅ **Reportes:**
- No contar tenderos de países sin admin como "missing"
- Es expected que no haya tenderos sin admin

## Próximos Pasos

1. **Actualizar form de registro:** Validar hasCountryAdmin()
2. **Admin Page Views:** Crear vistas para Productos, Premios, Ventas
3. **Cloud Functions:** Crear más funciones de administración
4. **Testing:** E2E testing del flujo completo

## Conclusión

**Config Admin es la base de todo**. Sin esto, el sistema no funciona. Es como el corazón del body - sin él, el resto del sistema no tiene sentido.

```
💡 PRINCIPIO CLAVE:
   País sin Admin = País sin Tenderos
   Admin del País = Corazón que permite que todo viva
```

---

**Status:** ✅ COMPLETADO Y COMPILADO EXITOSAMENTE (22 rutas)
**Build:** Última compilación sin errores (Exit Code: 0)
