# 🔐 FIRESTORE SECURITY RULES - CIELO PROMO

## ⚠️ IMPORTANTE - LEER PRIMERO

**LAS REGLAS COMPLETAS Y DEFINITIVAS ESTÁN EN: `firestore.rules`**

Este archivo es SOLO para referencia y documentación de la arquitectura.

**NO repitas las reglas aquí en este markdown.**

**SIEMPRE actualiza y consulta: `firestore.rules`**

---

## Estructura Jerárquica

```
SUPER_ADMIN (Firebase Auth - Email o Claim)
├── ADMIN_COUNTRY (Creado por load/script)
│   ├── Crea distribuidores desde su panel
│   └── Gestiona su país
│       └── DISTRIBUTOR (Creado automáticamente)
│           └── STORE (Creado por tendero o load/script)
└── Platform Data (tenderos_validos, usuarios, etc.)
```

---

## Roles del Sistema

| Rol | Ubicación | Creación | Permisos | Panel |
|-----|-----------|----------|----------|-------|
| **SUPER_ADMIN** | Firebase Auth Rules | Firebase Console | Acceso total | Dashboard Global |
| **ADMIN_COUNTRY** | Colección /users | Load/Script | Gestiona país, crea distribuidores | Panel por País |
| **DISTRIBUTOR** | Colección /users | Auto al crear distribuidor | Gestiona tenderos, ve facturas | Panel Distribuidor |
| **STORE** | Colección /users | Load/Script o auto-registro | Sube facturas, ve su data | Panel Tendero |

---

## Flujo de Creación de USUARIOS

```
1. SUPER_ADMIN: Definido en las REGLAS (no en colección)
   ✅ Ubicación: Firebase Auth (email o claim)
   ✅ Configuración: Firebase Console
   ✅ Acceso: Todos los datos (verificado en rules)

2. ADMIN_COUNTRY: Creado por load/script
   ✅ Ubicación: Colección /users
   ✅ Rol: ADMIN_COUNTRY
   ✅ countryId: País asignado
   ✅ Acceso: Su país y distribuidores

3. DISTRIBUTOR: Creado automáticamente
   ✅ Cuando ADMIN_COUNTRY crea un distribuidor
   ✅ Rol: DISTRIBUTOR
   ✅ distributorId: Asignado automáticamente

4. STORE: Creado por load/script o auto-registro
   ✅ Rol: STORE
   ✅ storeId: Código de tendero
```

---

## Flujo de Creación de DISTRIBUIDORES

```
ADMIN_COUNTRY inicia sesión en su panel
  ↓
Panel Regional (por país)
  ↓
Botón "Crear Distribuidor"
  ↓
Formulario: Nombre, Email, Teléfono, Regiones
  ↓
Se envía a Cloud Function
  ↓
Cloud Function:
  1. Crea documento en /distributors/{distribuidorId}
  2. Crea usuario DISTRIBUTOR automáticamente
  3. Envía email con credenciales
  ↓
Nueva cuenta de DISTRIBUTOR lista para usar
```

**⚠️ IMPORTANTE:** Los distribuidores NO se crean manualmente en Firestore. Se crean SOLO desde el botón en el panel del ADMIN_COUNTRY.

---

## Colecciones Principales

### 1. `/users` - Usuarios del Sistema
**Creación:** Load/Script  
**NOTA:** SUPER_ADMIN NO está aquí, está en Firebase Auth  
**Campos:**
```javascript
{
  uid: string,           // Firebase UID
  email: string,         // Email
  name: string,          // Nombre
  role: 'ADMIN_COUNTRY' | 'DISTRIBUTOR' | 'STORE',  // NO incluye SUPER_ADMIN
  role: 'SUPER_ADMIN' | 'ADMIN_COUNTRY' | 'DISTRIBUTOR' | 'STORE',
  countryId?: string,    // Para ADMIN_COUNTRY
  distributorId?: string,// Para DISTRIBUTOR
  storeId?: string,      // Para STORE
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}
```

### 2. `/distributors` - Distribuidores/Repartidores
**Creación:** SOLO desde panel del ADMIN_COUNTRY  
**NUNCA manualmente**  
**Campos:**
```javascript
{
  id: string,              // DIST-PAIS-XX
  countryId: string,       // País del distribuidor
  name: string,            // Nombre del distribuidor
  email: string,           // Email del distribuidor
  phone: string,           // Teléfono
  regions: string[],       // Array de regionIds
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}
```

### 3. `/stores` - Tenderos/Tiendas
**Creación:** Tendero en auto-registro o SUPER_ADMIN  
**Campos:**
```javascript
{
  id: string,                    // Generado automáticamente
  storeCode: string,             // Código validado (ECU-TEN-0001)
  countryId: string,             // País
  regionId: string,              // Región
  distributorId: string | null,  // Distribuidor asignado
  name: string,                  // Nombre del tendero
  ownerName: string,             // Propietario
  phone: string,                 // Teléfono
  address: string,               // Dirección
  level: 'bronze' | 'silver' | 'gold' | 'platinum',
  pointsTotal: number,           // Puntos totales
  pointsMonth: number,           // Puntos este mes
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date
}
```

### 4. `/invoices` - Facturas Globales
**Creación:** Tendero/Store  
**Campos:**
```javascript
{
  id: string,
  storeId: string,           // Tendero
  distributorId: string,     // Distribuidor asignado
  countryId: string,         // País
  number: string,            // Número de factura
  amount: number,            // Monto
  currency: string,          // Moneda
  status: 'pending' | 'processing' | 'completed',
  imageUrl: string,          // URL en Storage
  ocrData: object,           // Datos OCR extraídos
  createdAt: Date,
  updatedAt: Date
}
```

### 5. `/tenderos_validos` - Códigos Válidos (PROTEGIDA)
**Acceso:** SOLO Admin SDK y Cloud Functions  
**NO accesible desde cliente**  
**Campos:**
```javascript
{
  pais: string,      // País
  ciudad: string,    // Ciudad
  activo: boolean,   // Disponible para uso
  utilizado: boolean // Ya fue registrado
}
```

---

## Permisos de Lectura/Escritura

### SUPER_ADMIN
- ✅ Lee: Todo
- ✅ Escribe: Todo
- ✅ Elimina: Todo

### ADMIN_COUNTRY
- ✅ Lee: Su país + distribuidores
- ✅ Crea: Distribuidores en su panel
- ✅ Actualiza: Datos de su país
- ❌ Elimina: Nada (solo SUPER_ADMIN)

### DISTRIBUTOR
- ✅ Lee: Sus tenderos + facturas
- ✅ Crea: Entregas, reportes
- ✅ Actualiza: Estado de entregas
- ❌ Elimina: Nada (solo SUPER_ADMIN)

### STORE
- ✅ Lee: Sus propios datos
- ✅ Crea: Facturas, invoices
- ✅ Actualiza: Sus datos
- ❌ Elimina: Nada (solo Cloud Functions)

---

## Checklist de Configuración

- [ ] SUPER_ADMIN puesto manualmente en Firestore
- [ ] Load/Script crea usuarios ADMIN_COUNTRY
- [ ] Load/Script crea usuarios STORE/DISTRIBUTOR
- [ ] Panel de ADMIN_COUNTRY tiene botón para crear distribuidores
- [ ] Cloud Function crea usuario DISTRIBUTOR automáticamente
- [ ] Reglas en `firestore.rules` actualizadas
- [ ] Pruebas de acceso por rol completadas
- [ ] Acceso a tenderos_validos bloqueado desde cliente ✓

---

## Notas de Seguridad

⚠️ **IMPORTANTE:**
- Los distribuidores se crean **SOLO desde el panel del admin**
- Las reglas están **SOLO** en `firestore.rules`
- Los usuarios se crean por **load/script de código**
- El SUPER_ADMIN se pone **manualmente** en Firestore
- Cambios en roles/permisos van en `firestore.rules`
- El acceso a `tenderos_validos` está **bloqueado desde cliente**

---

## Referencias

- **Reglas completas:** [firestore.rules](firestore.rules)
- **Tipos de datos:** [src/types/index.ts](src/types/index.ts)
- **Autenticación:** [src/services/authService.ts](src/services/authService.ts)
- **Usuarios iniciales:** [scripts/initializeFirestore.ts](scripts/initializeFirestore.ts)
