📝 INSTRUCCIONES DE SETUP - AUTENTICACIÓN REAL
==============================================

## 🔧 Configuración Manual en Firebase Console

Como no tenemos las credenciales de firebase-admin.json, debemos configurar manualmente en Firebase Console.

### Paso 1: Crear Super Admin

1. Abre: https://console.firebase.google.com
2. Selecciona tu proyecto (cielo-promo)
3. Ir a **Firestore Database** → **Data** → **Create Collection**
4. Crea una collection llamada: `superAdmins`

5. En la collection `superAdmins`, crea un documento con:
   - **Document ID:** `hectorcobea03@gmail.com`
   - **Campos:**
     ```
     email: hectorcobea03@gmail.com
     role: SUPER_ADMIN
     createdAt: [Hoy]
     active: true
     ```

### Paso 2: Crear Códigos de Tenderos

En la collection `tenderos_validos` (crear si no existe), agrega estos documentos:

**TEND001** (Colombia - Bogotá)
```
code: TEND001
countryId: CO
city: Bogotá
district: Chapinero
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND002** (Colombia - Medellín)
```
code: TEND002
countryId: CO
city: Medellín
district: Sabaneta
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND003** (Colombia - Cali)
```
code: TEND003
countryId: CO
city: Cali
district: Cristo Rey
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND004** (Colombia - Barranquilla)
```
code: TEND004
countryId: CO
city: Barranquilla
district: Riomar
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND005** (Colombia - Bucaramanga)
```
code: TEND005
countryId: CO
city: Bucaramanga
district: Cabecera
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND006** (México - CDMX)
```
code: TEND006
countryId: MX
city: CDMX
district: Polanco
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND007** (México - Guadalajara)
```
code: TEND007
countryId: MX
city: Guadalajara
district: Chapultepec
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND008** (Argentina - Buenos Aires)
```
code: TEND008
countryId: AR
city: Buenos Aires
district: Palermo
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND009** (Argentina - Córdoba)
```
code: TEND009
countryId: AR
city: Córdoba
district: Centro
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

**TEND010** (Perú - Lima)
```
code: TEND010
countryId: PE
city: Lima
district: Miraflores
activo: true
utilizado: false
registeredStoreId: null
createdAt: [Hoy]
```

### Paso 3: Actualizar Firestore Rules

Ve a **Firestore Database** → **Rules** y reemplaza con:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ===== HELPERS =====
    function isAuth() {
      return request.auth != null;
    }
    
    function isSuperAdmin() {
      return isAuth() && exists(/databases/$(database)/documents/superAdmins/$(request.auth.token.email));
    }
    
    function isAdminCountry(countryId) {
      return isAuth() && 
        exists(/databases/$(database)/documents/adminCountries/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/adminCountries/$(request.auth.uid)).data.countryId == countryId;
    }
    
    function isDistributor(countryId) {
      return isAuth() && 
        exists(/databases/$(database)/documents/distributors/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/distributors/$(request.auth.uid)).data.countryId == countryId;
    }
    
    function isStore(storeId) {
      return isAuth() && request.auth.uid == storeId;
    }
    
    // ===== SUPER_ADMIN =====
    match /superAdmins/{email} {
      allow read: if isSuperAdmin();
      allow write: if isSuperAdmin();
    }
    
    // ===== TENDEROS_VALIDOS =====
    match /tenderos_validos/{code} {
      allow read: if isAuth();
      allow create: if false; // Solo admin
      allow update: if isSuperAdmin() || isAdminCountry(resource.data.countryId);
      allow delete: if isSuperAdmin();
    }
    
    // ===== USERS =====
    match /users/{userId} {
      allow create: if isAuth() && request.auth.uid == userId;
      allow read: if isAuth() && (request.auth.uid == userId || isSuperAdmin());
      allow update: if isAuth() && request.auth.uid == userId;
      allow delete: if isSuperAdmin();
    }
    
    // ===== STORES =====
    match /stores/{storeId} {
      allow create: if isAuth() && request.auth.uid == storeId;
      allow read: if isAuth() && (isStore(storeId) || isSuperAdmin() || isAdminCountry(resource.data.countryId));
      allow update: if isAuth() && isStore(storeId);
      allow delete: if isSuperAdmin();
    }
    
    // ===== INVOICES =====
    match /invoices/{invoiceId} {
      allow create: if isAuth() && request.auth.uid == request.resource.data.storeId;
      allow read: if isAuth() && (
        request.auth.uid == resource.data.storeId ||
        isSuperAdmin() ||
        isAdminCountry(resource.data.countryId) ||
        isDistributor(resource.data.countryId)
      );
      allow update: if isSuperAdmin() || isAdminCountry(resource.data.countryId);
      allow delete: if isSuperAdmin();
    }
    
    // ===== OCR_TRAINING_DATA =====
    match /ocrTrainingData/{docId} {
      allow create: if isAuth() && request.auth.uid == request.resource.data.storeId;
      allow read: if isAuth() && (
        request.auth.uid == resource.data.storeId ||
        isSuperAdmin() ||
        isAdminCountry(resource.data.countryId)
      );
      allow update: if isAuth() && isAdminCountry(resource.data.countryId);
      allow delete: if isSuperAdmin();
    }
    
    // ===== DEFAULT =====
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Luego click en **Publish**

### Paso 4: Actualizar Storage Rules

Ve a **Storage** → **Rules** y reemplaza con:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // ===== HELPERS =====
    function isAuth() {
      return request.auth != null;
    }
    
    function isSuperAdmin() {
      return isAuth() && request.auth.token.email == 'hectorcobea03@gmail.com';
    }
    
    // ===== INVOICES =====
    // Ruta: invoices/{storeId}/{filename}
    match /invoices/{storeId}/{allPaths=**} {
      allow create: if isAuth() && request.auth.uid == storeId;
      allow read: if isAuth();
      allow delete: if isAuth() && (request.auth.uid == storeId || isSuperAdmin());
    }
    
    // ===== DEFAULT =====
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Luego click en **Publish**

### Paso 5: Verificar Autenticación

El authService.ts ya está configurado para:

1. **Validar código de tendero** antes de permitir registro
2. **Crear usuario en Firestore** con rol STORE
3. **Crear tienda** asociada
4. **Marcar código como utilizado** para evitar duplicados

### Paso 6: Probar Registro

1. Abre: http://localhost:3000/register
2. Completa el formulario:
   - **Email:** tendero1@example.com
   - **Código:** TEND001
   - **Teléfono:** 3012345678
   - **País:** Colombia
   - **Contraseña:** Test123456
3. Click en **Registrarse**

✅ Debería funcionar

❌ Si falla con "Código no válido", asegúrate de que:
   - La collection `tenderos_validos` existe
   - El documento `TEND001` existe
   - El campo `activo` es `true`

### Paso 7: Crear Admin Country (Opcional)

Para crear un admin por país, crea un documento en collection `adminCountries`:

```
Document ID: [usuario-id-de-firebase]

Campos:
email: admin@co.com
role: ADMIN_COUNTRY
countryId: CO
createdAt: [Hoy]
active: true
```

### Paso 8: Roles Disponibles

```
SUPER_ADMIN:
- hectorcobea03@gmail.com
- Acceso a todo
- Crear/Editar tenderos

ADMIN_COUNTRY:
- Admin por país
- Ver/Editar tiendas y facturas del país
- Verificar facturas

DISTRIBUTOR:
- Distribuidor por país
- Ver tiendas y facturas del país

STORE:
- Tendero
- Upload de facturas
- Ver su historial
- Canjear premios
```

## 📋 Checklist de Setup

```
✅ Collection "superAdmins" creada
✅ Documento hectorcobea03@gmail.com creado
✅ Collection "tenderos_validos" creada
✅ 10 códigos de tendero agregados
✅ Firestore Rules actualizadas
✅ Storage Rules actualizadas
✅ Autenticación Firebase configurada
✅ Email/Password habilitado en Authentication
```

## 🧪 Testing

### Registrar Tendero:
```
Email: tendero1@company.com
Código: TEND001
Teléfono: +573012345678
País: Colombia
Password: Test123456
→ ✅ Debe funcionar
```

### Intentar Registrar con Código Inválido:
```
Email: user@company.com
Código: INVALID123
→ ❌ Debe mostrar error "Código no válido"
```

### Intentar Registrar Mismo Código Dos Veces:
```
1. Registrar tendero1 con TEND001 → ✅ Funciona
2. Registrar tendero2 con TEND001 → ❌ Error "Código ya registrado"
```

---

Una vez completados estos pasos, la autenticación estará 100% funcional y real.
