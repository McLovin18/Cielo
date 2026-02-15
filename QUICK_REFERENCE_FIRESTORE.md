# 🚀 REFERENCIA RÁPIDA - FIRESTORE RULES

## 3 Puntos Clave

### 1️⃣ SUPER_ADMIN está DEFINIDO en las REGLAS (no en colección)
```javascript
// ✅ Verificado por EMAIL o CLAIM PERSONALIZADO
function isSuperAdmin() {
  return request.auth != null && (
    request.auth.token.email == 'hectorcobea03@gmail.com' ||
    request.auth.token.admin == true
  );
}

// ✅ NO está en /users, está en Firebase Auth
// ✅ Se configura en Firebase Console
```

### 2️⃣ Distribuidores se crean desde Panel del ADMIN_COUNTRY
```javascript
// ✅ ADMIN_COUNTRY puede crear distribuidores
allow create: if (isSuperAdmin()) ||
              (isAdminCountry() && belongsToCountry(request.resource.data.countryId));

// ✅ NO manualmente - es desde panel con botón
// ✅ Cloud Function crea usuario DISTRIBUTOR automáticamente
```

### 3️⃣ Todas las Reglas Están en firestore.rules
```
✅ firestore.rules = DEFINITIVO
❌ NO repetir en markdown
📄 SUPER_ADMIN_EN_RULES.md = Cómo configurar
📄 FIRESTORE_RULES_COMPLETAS_NEW.md = SOLO referencia
```

---

## Roles y Permisos

```
SUPER_ADMIN (En Firebase Auth)
├── Lee: Todo
├── Crea: Todo
├── Actualiza: Todo
└── Elimina: Todo

ADMIN_COUNTRY
├── Lee: Su país + distribuidores
├── Crea: Distribuidores (panel)
├── Actualiza: Datos país
└── Elimina: No

DISTRIBUTOR
├── Lee: Sus tenderos
├── Crea: Entregas
├── Actualiza: Estado entregas
└── Elimina: No

STORE
├── Lee: Sus datos
├── Crea: Facturas
├── Actualiza: Sus datos
└── Elimina: No
```

---

## Colecciones Críticas

| Colección | Creación | Acceso | Regla |
|-----------|----------|--------|-------|
| `/users` | SUPER_ADMIN | Propio + SUPER_ADMIN | Línea ~89 |
| `/distributors` | ADMIN_COUNTRY panel | ADMIN_COUNTRY + SUPER_ADMIN | Línea ~313 |
| `/stores` | Tendero + SUPER_ADMIN | Tendero + ADMIN + SUPER_ADMIN | Línea ~104 |
| `/invoices` | STORE | Tendero + ADMIN + SUPER_ADMIN | Línea ~145 |
| `/tenderos_validos` | **BLOQUEADA** | Admin SDK solo | Línea ~355 |

---

## Funciones Auxiliares

```javascript
isAuth()                    // Autenticado
getUser()                   // Doc del usuario
isRole(role)                // Verificar rol
isSuperAdmin()              // Es SUPER_ADMIN
isAdminCountry()            // Es ADMIN_COUNTRY
isDistributor()             // Es DISTRIBUTOR
isStore()                   // Es STORE
belongsToCountry(countryId) // Pertenece a país
isDistributorId(distId)     // Es distribuidor
ownsStore(storeId)          // Propietario tienda
```

---

## Deployment

```bash
# 1. Deploy reglas
firebase deploy --only firestore:rules

# 2. Ejecutar script de usuarios
ts-node scripts/initializeFirestore.ts

# 3. Poner SUPER_ADMIN manualmente en Firestore

# 4. Implementar panel ADMIN_COUNTRY con botón

# 5. Pruebas de acceso
```

---

## Variables Principales en Reglas

```javascript
{database}      // ID de base de datos
{uid}           // Document ID en /users
{distributorId} // Document ID en /distributors
{storeId}       // Document ID en /stores
{invoiceId}     // Document ID en /invoices
{codigo}        // Document ID en /tenderos_validos
```

---

**Archivo Principal:** `firestore.rules`  
**Líneas:** 387 total  
**Funciones:** 10  
**Colecciones:** 12+
