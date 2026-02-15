# 🔐 CONFIGURACIÓN DE AUTENTICACIÓN REAL

## Estado Actual ✅

El código ya está actualizado con:
- ✅ Validación de códigos de tendero en `authService.ts`
- ✅ Verificación de super admin por email en `AuthContext.tsx`
- ✅ Métodos para obtener rol y datos del usuario
- ✅ Estructura de Firestore lista
- ✅ Script automático para cargar tendederos

## Qué Falta: Cargar Datos en Firebase 🔥

**NO necesitas escribir manualmente 50 (o 20,000) documentos.**

Usa el **script automático:**
```bash
npx ts-node scripts/loadTenderos.ts
```

Ver guía completa: **[CARGAR_TENDEDEROS_AUTOMATICO.md](CARGAR_TENDEDEROS_AUTOMATICO.md)**

---

## PASO 1: Obtener Credenciales Firebase (1 minuto)

### Ubicación en Firebase:
```
Firestore Database → Crear Colección
Nombre: tenderos_validos
```

### Documentos (50 tendederos en 10 países)
Ver archivo: **[TENDEROS_VALIDOS_50.json](TENDEROS_VALIDOS_50.json)** ← Copiar de aquí

**10 Países × 5 Tendederos:**
- 🇪🇨 Ecuador: ECU-TEN-0001 a ECU-TEN-0005
- 🇵🇪 Perú: PER-TEN-0001 a PER-TEN-0005
- 🇲🇽 México: MEX-TEN-0001 a MEX-TEN-0005
- 🇨🇴 Colombia: COL-TEN-0001 a COL-TEN-0005
- 🇧🇷 Brasil: BRA-TEN-0001 a BRA-TEN-0005
- 🇬🇹 Guatemala: GTM-TEN-0001 a GTM-TEN-0005
- 🇧🇴 Bolivia: BOL-TEN-0001 a BOL-TEN-0005
- 🇵🇦 Panamá: PAN-TEN-0001 a PAN-TEN-0005
- 🇻🇪 Venezuela: VEN-TEN-0001 a VEN-TEN-0005

Cada documento tiene estructura:
```json
{
  "pais": "Ecuador",
  "ciudad": "Quito",
  "distribuidorId": "DIST-ECU-01",
  "activo": true,
  "utilizado": false
}
```

**Pasos en Firebase Console:**
1. Click en "Crear colección"
2. Nombre: `tenderos_validos`
3. Agregar 50 documentos (ID = código tendero)
4. Copiar campos del JSON arriba ↑

**IMPORTANTE:** Cada documento tiene como **ID** el código de tendero.

### Documento 1: TEND001
```json
{
  "code": "TEND001",
  "pais": "Colombia",
  "ciudad": "Bogotá",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

**Pasos:**
1. Click en "Agregar documento"
2. ID: `TEND001` (IMPORTANTE: Es el ID del documento)
3. Agregar campos:
   - `code`: TEND001
   - `pais`: Colombia
   - `ciudad`: Bogotá
   - `activo`: true (booleano)
   - `utilizado`: false (booleano)
   - `createdAt`: 2025-02-03 (timestamp)

### Documento 2: TEND002
```json
{
  "code": "TEND002",
  "pais": "Colombia",
  "ciudad": "Medellín",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 3: TEND003
```json
{
  "code": "TEND003",
  "pais": "México",
  "ciudad": "Ciudad de México",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 4: TEND004
```json
{
  "code": "TEND004",
  "pais": "México",
  "ciudad": "Guadalajara",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 5: TEND005
```json
{
  "code": "TEND005",
  "pais": "Argentina",
  "ciudad": "Buenos Aires",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 6: TEND006
```json
{
  "code": "TEND006",
  "pais": "Argentina",
  "ciudad": "Córdoba",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 7: TEND007
```json
{
  "code": "TEND007",
  "pais": "Perú",
  "ciudad": "Lima",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 8: TEND008
```json
{
  "code": "TEND008",
  "pais": "Perú",
  "ciudad": "Arequipa",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 9: TEND009
```json
{
  "code": "TEND009",
  "pais": "Chile",
  "ciudad": "Santiago",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

### Documento 10: TEND010
```json
{
  "code": "TEND010",
  "pais": "Chile",
  "ciudad": "Valparaíso",
  "activo": true,
  "utilizado": false,
  "createdAt": 2025-02-03
}
```

---

## PASO 3: Actualizar Firestore Rules

✅ **Reglas de Seguridad Completas:**
Ver archivo: **[FIRESTORE_RULES_COMPLETAS.md](FIRESTORE_RULES_COMPLETAS.md)** ← Copiar de aquí

En Firebase Console → Firestore Database → Rules:
1. Copiar todo el contenido de `FIRESTORE_RULES_COMPLETAS.md`
2. Pegar en Firebase Console
3. Click en "Publicar"

**Características de las Rules:**
- ✅ Super Admin (hectorcobea03@gmail.com) acceso total
- ✅ Tenderos ven solo sus datos
- ✅ Distribuidores ven datos de su región
- ✅ OCR Training Data compartido entre autenticados
- ✅ Acceso por rol basado en Firestore data

---

## PASO 4: Actualizar Storage Rules

En Firebase Console → Storage → Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Subir invoices: solo usuarios autenticados
    match /invoices/{storeId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == storeId;
    }

    // Leer documentos: usuarios autenticados
    match /documents/{allPaths=**} {
      allow read: if request.auth != null;
    }
  }
}
```

---

## PASO 5: Test Manualmente 🧪

### Test 1: Registrar con código VÁLIDO

1. Ir a http://localhost:3000/register
2. Email: `tendero1@ecu.com`
3. Contraseña: `Password123!`
4. Código de Tendero: **ECU-TEN-0001**
5. ✅ Debe registrarse exitosamente

**Resultado esperado:**
- ✅ Se crea documento en `users/` con role "STORE"
- ✅ Se crea documento en `stores/` con storeId
- ✅ El campo `utilizado` de ECU-TEN-0001 cambia a `true`
- ✅ Datos del distribuidor: DIST-ECU-01

### Test 2: Registrar con código INVÁLIDO

1. Ir a http://localhost:3000/register
2. Email: `tendero2@test.com`
3. Contraseña: `Password123!`
4. Código de Tendero: **INVALID123**
5. ❌ Debe mostrar error: "Código de tendero no válido"

**Resultado esperado:**
- ❌ Registro rechazado
- ❌ Mensaje de error claro

### Test 3: Registrar con código REPETIDO

1. Después de Test 1, intentar registrar otra vez con **ECU-TEN-0001**
2. ❌ Debe mostrar error: "Este código de tendero ya ha sido registrado"

**Resultado esperado:**
- ❌ Registro rechazado
- ❌ Mensaje de error claro

### Test 4: Super Admin

1. Registrar usuario: `hectorcobea03@gmail.com`
2. Iniciar sesión
3. En la consola del navegador (F12), ejecutar:

```javascript
// AuthContext debe mostrar: isSuperAdmin: true
// Puede acceder a cualquier store/invoice
```

---

## ARQUIVOS ACTUALIZADO ✅

Los siguientes archivos ya tienen el código actualizado:

### 1. `src/services/authService.ts`
- ✅ Validación de códigos en `validateTenderoCode()`
- ✅ Método `getCurrentUserRole()` agregado
- ✅ Método `getStoreData()` agregado
- ✅ Super admin verificado por email en las Rules

### 2. `src/context/AuthContext.tsx`
- ✅ Verificación de super admin por email al login
- ✅ Contexto expone `isSuperAdmin` para componentes

### 3. Firestore Rules (PENDIENTE)
- ⏳ Copiar/pegar las rules arriba en Firebase Console
- ℹ️ Super admin verificado por email: `hectorcobea03@gmail.com`

### 4. Storage Rules (PENDIENTE)
- ⏳ Copiar/pegar las rules arriba en Firebase Console

---

## Checklist de Configuración 📋

- [ ] Descargar firebase-service-account.json
- [ ] Guardar en raíz del proyecto
- [ ] Ejecutar: `npx ts-node scripts/loadTenderos.ts`
- [ ] Verificar en Firebase Console → Firestore Database
- [ ] Actualizar Firestore Rules
- [ ] Actualizar Storage Rules
- [ ] Test: Registrar con código válido (ECU-TEN-0001)
- [ ] Test: Registrar con código inválido
- [ ] Test: Registrar con código repetido
- [ ] Test: Verificar super admin (hectorcobea03@gmail.com)

---

## Resumen de Lógica de Autenticación 🔄

```
1. Usuario intenta registrarse con código
   ↓
2. authService.validateTenderoCode() verifica:
   ✓ El código existe en Firestore
   ✓ El código está activo (activo: true)
   ✓ El código no ha sido usado (utilizado: false)
   ↓
3. Si es válido:
   ✓ Se crea usuario en Firebase Auth
   ✓ Se crea documento en 'users/'
   ✓ Se crea documento en 'stores/'
   ✓ Se marca el código como utilizado (utilizado: true)
   ↓
4. AuthContext.tsx detecta login
   ✓ Verifica si es super admin
   ✓ Carga datos del usuario
   ✓ Expone isSuperAdmin al componente

5. Si es inválido:
   ✗ Se muestra error específico
   ✗ No se crea nada
```

---

## Notas Importantes 📝

- **ECU-TEN-0001 a VEN-TEN-0005**: 50 códigos pre-cargados en 10 países ✅
- **hectorcobea03@gmail.com**: Super admin (verificado por email en las Rules) ✅
- **No hay colección superAdmins**: El super admin se verifica directamente en las Firestore Rules
- **Firestore Rules**: Role-based access control con distribuidores (importante para seguridad)
- **Storage Rules**: Solo autorizado subir invoices a su carpeta
- **distribuidorId**: Campo importante para acceso regional de distribuidores (futuro)
- **Once you register with a code, you cannot register with the same code again** (utilizado: true)

---

## Archivos de Referencia 📄

- 📄 [FIRESTORE_RULES_COMPLETAS.md](FIRESTORE_RULES_COMPLETAS.md) - Reglas completas con roles
- 📄 [TENDEROS_VALIDOS_50.json](TENDEROS_VALIDOS_50.json) - 50 códigos de tenderos

---

## ¿Preguntas? 🤔

Si algo no funciona:
1. Verifica que los IDs de los documentos sean exactamente como se muestran
2. Verifica que los tipos de datos sean correctos (boolean para activo/utilizado)
3. Verifica las Firestore Rules en Firebase Console
4. Abre la consola del navegador (F12) para ver errores
