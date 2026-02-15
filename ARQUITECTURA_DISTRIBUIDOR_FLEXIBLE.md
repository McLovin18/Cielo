# 🏗️ ARQUITECTURA: Distribuidor - Flexible y Escalable

## El Problema Anterior ❌

```javascript
tenderos_validos {
  ECU-TEN-0001: {
    pais: "Ecuador",
    ciudad: "Quito",
    distribuidorId: "DIST-ECU-01",  ← ❌ Fijo/Hardcodeado
    activo: true
  }
}
```

**Problemas:**
- ❌ El tendero NO puede elegir distribuidor
- ❌ El distribuidor está asignado por el código
- ❌ No hay flexibilidad
- ❌ No se puede cambiar de distribuidor sin editar el código

---

## La Solución Correcta ✅

```javascript
// 1. tenderos_validos = SOLO para validación
tenderos_validos {
  ECU-TEN-0001: {
    pais: "Ecuador",
    ciudad: "Quito",
    activo: true,
    utilizado: false
    // ✅ SIN distribuidorId aquí
  }
}

// 2. stores = Datos del negocio + distribuidor
stores {
  {storeId}: {
    userId: {userId},
    tenderoCode: "ECU-TEN-0001",
    distribuidorId: "DIST-ECU-02",  ← ✅ EL TENDERO ELIGE
    pais: "Ecuador",
    ciudad: "Quito"
  }
}
```

---

## 🎯 Flujo Correcto (Paso a Paso)

### Paso 1: Validación (sin distribuidor)
```
Tendero intenta registrarse: ECU-TEN-0001
↓
Sistema valida en tenderos_validos:
  ✓ Código existe
  ✓ activo: true
  ✓ utilizado: false
  ↓ (NO comprueba distribuidorId)
✓ Válido - pasar a Step 2
```

### Paso 2: Selección de Distribuidor
```
Sistema pregunta: "¿Qué distribuidor prefieres?"
↓
Opciones disponibles en tu zona:
  [DIST-ECU-01] Distribuidor Regional 1
  [DIST-ECU-02] Distribuidor Regional 2
  [DIST-ECU-03] Distribuidor Regional 3
↓
Tendero elige: DIST-ECU-02
↓ Pasar a Step 3
```

### Paso 3: Crear Registro
```
Se crea documento en stores:
{
  storeId: {userId},
  tenderoCode: "ECU-TEN-0001",
  distribuidorId: "DIST-ECU-02"  ← La elección del tendero
}
↓ Pasar a Step 4
```

### Paso 4: Marcar Como Utilizado
```
Se actualiza tenderos_validos:
{
  utilizado: true,
  registeredStoreId: {storeId}
}
↓ Completo ✅
```

---

## 🔄 Cambiar de Distribuidor (Después)

```
Tendero inicia sesión
↓
Va a Settings
↓
Click "Cambiar Distribuidor"
↓
Elige nuevo: DIST-ECU-03
↓
Se actualiza: stores/{storeId}
  distribuidorId: "DIST-ECU-03"
↓
Cambio aplicado inmediatamente ✅
```

---

## 📊 Comparativa

| Aspecto | Anterior ❌ | Ahora ✅ |
|--------|-----------|--------|
| **Distribuidor fijo** | Sí | No |
| **Tendero puede elegir** | No | Sí |
| **Cambiar distribuidor** | Imposible | Fácil |
| **Flexibilidad** | Baja | Alta |
| **Escalabilidad** | Media | Excelente |

---

## 💾 Estructura de Datos (Nueva)

### Collection: `tenderos_validos`
```json
{
  "ECU-TEN-0001": {
    "pais": "Ecuador",
    "ciudad": "Quito",
    "activo": true,
    "utilizado": false,
    "createdAt": timestamp
  }
}
```

**Campos SOLO:**
- ✅ pais
- ✅ ciudad
- ✅ activo
- ✅ utilizado
- ❌ distribuidorId (NO va aquí)

### Collection: `stores`
```json
{
  "{storeId}": {
    "userId": "{userId}",
    "tenderoCode": "ECU-TEN-0001",
    "pais": "Ecuador",
    "ciudad": "Quito",
    "distribuidorId": "DIST-ECU-02",  ← Aquí va
    "email": "tendero@ecu.com",
    "name": "Mi Tienda",
    "status": "active",
    "createdAt": timestamp
  }
}
```

---

## 🔐 Firestore Rules

```javascript
// tenderos_validos: Solo lectura para validar
match /tenderos_validos/{code} {
  allow read: if isAuthenticated();
  // ✅ NO comprueba distribuidorId
}

// stores: Tendero controla, distribuidor ve
match /stores/{storeId} {
  allow read, write: if request.auth.uid == resource.data.userId;
  allow read: if isDistributorOfThisStore(storeId);
}

function isDistributorOfThisStore(storeId) {
  let store = get(/databases/$(database)/documents/stores/$(storeId));
  return request.auth.uid == store.data.distribuidorId;
}
```

---

## 🚀 Ventajas de Esta Arquitectura

### 1. Flexibilidad
- ✅ Tendero elige distribuidor
- ✅ Puede cambiar cuando quiera
- ✅ Sin editar código

### 2. Escalabilidad
- ✅ Funciona con 50 o 50,000 tenderos
- ✅ Funciona con múltiples distribuidores
- ✅ Distribuidores pueden entrar/salir

### 3. Mantenibilidad
- ✅ Cambios en distribuidores sin afectar tenderos_validos
- ✅ Código simple y claro
- ✅ Fácil de debuggear

### 4. Negocio
- ✅ Tenderos pueden cambiar de distribuidor
- ✅ Competencia saludable entre distribuidores
- ✅ Mejor servicio (tenderos se van si mal servicio)

---

## 🔄 Flujo Técnico (Código)

### En el Frontend (Registro)

```typescript
// 1. Validar código
const tenderoRef = doc(db, 'tenderos_validos', code);
const tenderoSnap = await getDoc(tenderoRef);
// ✓ Valida: existe, activo, utilizado

// 2. Mostrar opciones de distribuidor
const distributors = await getDistributorsByCountry(pais);
// → [DIST-ECU-01, DIST-ECU-02, DIST-ECU-03]

// 3. Tendero elige
const selectedDistributor = "DIST-ECU-02";

// 4. Llamar a authService
authService.registerStore(
  email,
  password,
  code,
  phone,
  countryId,
  ownerName,
  selectedDistributor  ← Parámetro nuevo
);
```

### En el Backend (authService.ts)

```typescript
async registerStore(
  email,
  password,
  storeCode,
  phone,
  countryId,
  ownerName,
  distribuidorId?  ← Parámetro nuevo
) {
  // 1. Validar código (sin distribuidor)
  const tenderoSnap = await getDoc(tenderos_validos/{storeCode});
  
  // 2. Crear store CON distribuidor elegido
  const storeData = {
    ...
    distribuidorId: distribuidorId || null,  ← Aquí
  };
  
  // 3. Marcar como utilizado
  updateDoc(tenderoRef, { utilizado: true });
}
```

---

## ✨ Resumen

| Elemento | Ubicación | Propósito |
|----------|-----------|----------|
| **Code (ECU-TEN-0001)** | tenderos_validos | Validación |
| **País/Ciudad** | tenderos_validos | Información |
| **Activo/Utilizado** | tenderos_validos | Estado |
| **Distribuidor** | stores | Negocio (elegible) |

**Regla de Oro:** 
- `tenderos_validos` = SOLO acceso/validación
- `stores` = Datos del negocio (incluye distribuidor)

Así es **flexible, escalable y mantenible.** ✅
