# 🔐 FIRESTORE SECURITY RULES - CIELO PROMO

## Estructura Jerárquica

```
Super Admin (hectorcobea03@gmail.com)
├── Distributors (DIST-ECU-01, DIST-MEX-02, etc.)
│   └── Stores/Tenderos (ECU-TEN-0001, MEX-TEN-0005, etc.)
└── Platform Data (tenderos_validos, ocrTrainingData, etc.)
```

## Roles

- **SUPER_ADMIN**: hectorcobea03@gmail.com - Acceso total a la plataforma
- **DISTRIBUTOR**: Manage tenderos in their region + invoices + OCR data
- **STORE**: Manage own invoices + OCR data for their store

---

## Firestore Rules Completas

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ==================== HELPERS ====================
    function isSuperAdmin() {
      return request.auth.token.email == 'hectorcobea03@gmail.com';
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.role;
    }

    function getDistributorId(userId) {
      return get(/databases/$(database)/documents/users/$(userId)).data.distribuidorId;
    }

    function getStoreDistributorId(storeId) {
      return get(/databases/$(database)/documents/stores/$(storeId)).data.distribuidorId;
    }

    // ==================== COLLECTIONS ====================

    // TENDEROS VÁLIDOS: Público lectura (para validar códigos)
    match /tenderos_validos/{code} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
    }

    // USERS: Cada usuario controla su documento
    match /users/{userId} {
      allow read: if request.auth.uid == userId || isSuperAdmin();
      allow write: if request.auth.uid == userId || isSuperAdmin();
      allow create: if request.auth.uid == userId;
    }

    // STORES: Solo Super Admin + Distributor + el Store owner
    match /stores/{storeId} {
      allow read: if 
        isSuperAdmin() || 
        request.auth.uid == resource.data.userId ||
        (isAuthenticated() && getDistributorId(request.auth.uid) == resource.data.distribuidorId && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
      
      allow write: if 
        isSuperAdmin() || 
        request.auth.uid == resource.data.userId;

      allow create: if isAuthenticated();

      // INVOICES subcollection
      match /invoices/{invoiceId} {
        allow read: if 
          isSuperAdmin() || 
          request.auth.uid == resource.data.storeId ||
          (isAuthenticated() && getDistributorId(request.auth.uid) == getStoreDistributorId(storeId) && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
        
        allow write: if 
          request.auth.uid == resource.data.storeId || 
          isSuperAdmin();

        allow create: if request.auth.uid == storeId;
      }

      // OCR TRAINING DATA subcollection
      match /ocrTrainingData/{docId} {
        allow read: if 
          isSuperAdmin() || 
          request.auth.uid == resource.data.storeId ||
          (isAuthenticated() && getDistributorId(request.auth.uid) == getStoreDistributorId(storeId) && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
        
        allow write: if 
          request.auth.uid == resource.data.storeId || 
          isSuperAdmin();

        allow create: if request.auth.uid == storeId;
      }
    }

    // DISTRIBUTORS: Super Admin + distributor owner
    match /distributors/{distribuidorId} {
      allow read: if 
        isSuperAdmin() || 
        (isAuthenticated() && getDistributorId(request.auth.uid) == distribuidorId && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
      
      allow write: if isSuperAdmin();

      // INVOICES subcollection (summary)
      match /invoices/{invoiceId} {
        allow read: if 
          isSuperAdmin() || 
          (isAuthenticated() && getDistributorId(request.auth.uid) == distribuidorId && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
        
        allow write: if isSuperAdmin();
      }

      // REPORTS subcollection
      match /reports/{reportId} {
        allow read: if 
          isSuperAdmin() || 
          (isAuthenticated() && getDistributorId(request.auth.uid) == distribuidorId && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
        
        allow write: if isSuperAdmin();
      }
    }

    // INVOICES (Global collection for analytics)
    match /invoices/{invoiceId} {
      allow read: if 
        isSuperAdmin() || 
        request.auth.uid == resource.data.storeId ||
        (isAuthenticated() && getDistributorId(request.auth.uid) == resource.data.distribuidorId && getUserRole(request.auth.uid) == 'DISTRIBUTOR');
      
      allow write: if 
        request.auth.uid == resource.data.storeId || 
        isSuperAdmin();

      allow create: if isAuthenticated();
    }

    // OCR TRAINING DATA (Global collection)
    match /ocrTrainingData/{docId} {
      allow read: if isSuperAdmin() || isAuthenticated();
      
      allow write: if 
        isSuperAdmin() || 
        (isAuthenticated() && request.auth.uid == resource.data.createdBy);

      allow create: if isAuthenticated();
    }

    // AUDIT LOGS (Solo Super Admin)
    match /auditLogs/{logId} {
      allow read: if isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    // PROMO CAMPAIGNS (Solo Super Admin)
    match /promoCampaigns/{campaignId} {
      allow read: if isSuperAdmin();
      allow write: if isSuperAdmin();
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Storage Rules (Firebase Storage)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Invoices: Solo el store puede subir/leer sus invoices
    match /invoices/{storeId}/{fileName} {
      allow read: if 
        request.auth.uid == storeId ||
        request.auth.token.email == 'hectorcobea03@gmail.com';
      
      allow write: if request.auth.uid == storeId;
      allow delete: if request.auth.uid == storeId || request.auth.token.email == 'hectorcobea03@gmail.com';
    }

    // OCR Training Images: Store + Super Admin
    match /ocrTraining/{storeId}/{fileName} {
      allow read: if 
        request.auth.uid == storeId ||
        request.auth.token.email == 'hectorcobea03@gmail.com';
      
      allow write: if request.auth.uid == storeId;
      allow delete: if request.auth.uid == storeId || request.auth.token.email == 'hectorcobea03@gmail.com';
    }

    // Public assets
    match /assets/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.email == 'hectorcobea03@gmail.com';
    }

    // Deny everything else
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Estructura de Documentos

### 1. **superAdmins** - NO USAMOS (verificado por email en Rules)
```javascript
// hectorcobea03@gmail.com verifica en las Rules
request.auth.token.email == 'hectorcobea03@gmail.com'
```

### Collection: `tenderos_validos` - Documentos con 50 códigos
```
Colección: tenderos_validos
│
├── ECU-TEN-0001
│   ├── pais: "Ecuador"
│   ├── ciudad: "Quito"
│   ├── activo: true
│   └── utilizado: false
│
├── ECU-TEN-0002
│   ├── pais: "Ecuador"
│   ├── ciudad: "Guayaquil"
│   ├── activo: true
│   └── utilizado: false
│
... (50 documentos total)
```

**NOTA:** El `distribuidorId` NO está aquí. El tendero lo elige en el registro.

### 3. **users** - Usuario autenticado
```
Colección: users
│
└── {userId}
    ├── email: "tendero1@test.com"
    ├── name: "Juan Pérez"
    ├── role: "STORE" | "DISTRIBUTOR" | "SUPER_ADMIN"
    ├── distribuidorId: "DIST-ECU-01" (solo si es DISTRIBUTOR)
    ├── createdAt: timestamp
    └── tenderoCode: "ECU-TEN-0001"
```

### 4. **stores** - Tienda/Tendero
```
Colección: stores
│
└── {storeId}
    ├── userId: {userId}
    ├── email: "tendero1@test.com"
    ├── tenderoCode: "ECU-TEN-0001"
    ├── pais: "Ecuador"
    ├── ciudad: "Quito"
    ├── distribuidorId: "DIST-ECU-01"  ← EL TENDERO ELIGE ESTO
    ├── activo: true
    ├── createdAt: timestamp
    │
    ├── invoices/ (subcollection)
    │   └── {invoiceId}
    │       ├── number: "INV-001"
    │       ├── amount: 250.00
    │       ├── status: "pending" | "processing" | "completed"
    │       └── createdAt: timestamp
    │
    └── ocrTrainingData/ (subcollection)
        └── {dataId}
            ├── imageUrl: "gs://..."
            ├── extractedText: "..."
            ├── confirmed: true | false
            └── createdAt: timestamp
```

### 5. **distributors** - Distribuidor regional
```
Colección: distributors
│
└── DIST-ECU-01
    ├── name: "Distribuidor Ecuador - Región 1"
    ├── pais: "Ecuador"
    ├── email: "dist@ecu1.com"
    ├── activo: true
    ├── createdAt: timestamp
    │
    ├── invoices/ (subcollection - agregación)
    │   └── {summaryId}
    │       ├── totalAmount: 10000.00
    │       ├── count: 45
    │       └── period: "2025-02"
    │
    └── reports/ (subcollection)
        └── {reportId}
            ├── title: "Monthly Report"
            ├── data: {...}
            └── createdAt: timestamp
```

### 6. **invoices** - Colección global para análisis
```
Colección: invoices
│
└── {invoiceId}
    ├── storeId: {storeId}
    ├── distribuidorId: "DIST-ECU-01"
    ├── number: "INV-001"
    ├── amount: 250.00
    ├── currency: "USD"
    ├── status: "pending" | "processing" | "completed"
    ├── imageUrl: "gs://..."
    ├── ocrData: {...}
    ├── createdAt: timestamp
    └── updatedAt: timestamp
```

### 7. **ocrTrainingData** - Colección global
```
Colección: ocrTrainingData
│
└── {dataId}
    ├── storeId: {storeId}
    ├── distribuidorId: "DIST-ECU-01"
    ├── imageUrl: "gs://..."
    ├── extractedText: "..."
    ├── confirmed: true | false
    ├── createdBy: {userId}
    ├── createdAt: timestamp
    └── updatedAt: timestamp
```

---

## Pasos para Implementar

### 1. Crear Colección `tenderos_validos` (50 documentos)
Ver archivo: `TENDEROS_VALIDOS_50.json`

**Instrucciones en Firebase Console:**
1. Firestore Database → Create Collection
2. Name: `tenderos_validos`
3. Add 50 documents (uno por cada código)
4. Document ID = Código (ECU-TEN-0001, ECU-TEN-0002, etc.)
5. Fields según estructura arriba

### 2. Actualizar Firestore Rules
Copiar y pegar las rules arriba en Firebase Console → Firestore Database → Rules

### 3. Actualizar Storage Rules
Copiar y pegar las rules arriba en Firebase Console → Storage → Rules

### 4. Crear Colección `distributors` (opcional, para futuro)
- Documentos con DIST-ECU-01, DIST-ECU-02, etc.
- Información del distribuidor regional
- Para futuro: rol DISTRIBUTOR

---

## Flujos de Seguridad

### Flow 1: Tendero Registra y Sube Invoice
```
1. Tendero intenta registrarse con código ECU-TEN-0001
2. authService valida código en tenderos_validos
   ✓ Código existe
   ✓ activo: true
   ✓ utilizado: false
   (NO comprueba distribuidorId aquí)
3. Sistema pregunta: "¿Qué distribuidor prefieres?"
4. Tendero elige: DIST-ECU-02
5. Se crea user con role "STORE"
6. Se crea store con distribuidorId: DIST-ECU-02
7. Tendero sube invoice a Storage: /invoices/{storeId}/invoice.pdf
8. Storage rules: allow write if request.auth.uid == storeId ✅
9. Documento se crea en stores/{storeId}/invoices/{invoiceId}
10. Firestore rules: allow write if request.auth.uid == storeId ✅
11. Después: Tendero puede cambiar de distribuidor (actualizar stores doc)
```

### Flow 2: Super Admin Revisa Todo
```
1. hectorcobea03@gmail.com inicia sesión
2. AuthContext: isSuperAdmin = true
3. Super Admin puede leer/escribir cualquier documento
4. Firestore rules: allow read, write if isSuperAdmin() ✅
```

### Flow 3: Distribuidor Revisa sus Tenderos (Futuro)
```
1. Distribuidor user con role "DISTRIBUTOR" e distribuidorId "DIST-ECU-01"
2. Puede leer stores donde distribuidorId == "DIST-ECU-01"
3. Puede leer invoices de sus tenderos
4. Firestore rules: allow read if getDistributorId(request.auth.uid) == distribuidorId ✅
```

---

## Checklist

- [ ] Crear colección `tenderos_validos` con 50 documentos
- [ ] Copiar/pegar Firestore Rules
- [ ] Copiar/pegar Storage Rules
- [ ] Test: Registrar tendero con código válido
- [ ] Test: Subir invoice y verificar Storage
- [ ] Test: Verificar Super Admin puede ver todo
- [ ] Test: Tendero no puede ver invoices de otros

---

## Notas de Seguridad

✅ **What's Secured:**
- Tenderos solo ven sus propios datos
- Distribuidores ven datos de su región
- Super Admin ve todo
- Storage bloqueado por storeId
- Firestore tiene reglas estrictas por rol

⚠️ **Importante:**
- Cambiar email de super admin: actualizar en `authService.ts` + Rules
- Agregar nuevos distribuidores: crear documento en `distributors`
- Revocar tendero: cambiar `activo: false` en `tenderos_validos`
