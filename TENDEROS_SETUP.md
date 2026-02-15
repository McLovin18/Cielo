# 🏪 Setup de Tenderos Válidos - Cielo Promo

## Resumen

Los **tenderos válidos** son códigos pre-registrados que los shopkeepers (tenderos) deben usar para crear sus cuentas en el sistema. Esta guía explica cómo configurar todo.

---

## 🔐 Estructura de Datos

### Colección: `tenderos_validos`

```typescript
{
  codigo: "ECU-TEN-0001",          // ID del documento
  pais: "Ecuador",                 // País
  ciudad: "Quito",                 // Ciudad/Región
  distribuidorId: "DIST-ECU-001",  // ID del distribuidor
  activo: true,                    // Estado
  utilizado: false,                // ¿Ya fue registrado?
  registeredStoreId: null,         // ID de tienda que lo usó
  registeredAt: Timestamp(...)     // Cuándo se registró
}
```

### Características de Seguridad

✅ **Protegida totalmente**: No se puede leer ni escribir desde el cliente  
✅ **Solo Admin SDK**: Acceso mediante `firebase-admin` SDK  
✅ **Validación pre-registro**: Tendero debe existir antes de registrarse  
✅ **Uso único**: Cada código se marca como `utilizado` después del registro  

---

## 🚀 Pasos de Setup

### 1️⃣ Crear Service Account Key

```bash
# 1. Ir a Firebase Console
#    → Configuración del Proyecto
#    → Pestaña "Cuentas de Servicio"
#    → Generar nueva clave privada
#    → Descargar JSON

# 2. Guardar como serviceAccountKey.json en raíz del proyecto
# ⚠️ NUNCA commitear a Git (agregar a .gitignore)
```

**Archivo `.gitignore`:**
```
serviceAccountKey.json
```

---

### 2️⃣ Instalar Dependencies del Script

```bash
npm install --save-dev ts-node @types/node
```

---

### 3️⃣ Ejecutar Script de Carga

```bash
# Ejecutar desde raíz del proyecto
npx ts-node scripts/loadTenderos.ts
```

**Salida esperada:**
```
📦 Iniciando carga de tenderos válidos...
Total: 40 registros
✅ Cargados 40 registros...

✅ ¡Carga completada! 40 tenderos registrados en Firestore.

📝 Notas importantes:
- Los códigos están protegidos en Firestore Security Rules
- Solo el Cloud Function de registro puede leerlos
- El campo "utilizado" controla si se puede reutilizar un código
- El campo "registeredStoreId" guarda la tienda que usó este código

🎉 Proceso finalizado exitosamente
```

---

### 4️⃣ Desplegar Firestore Security Rules

```bash
# Desde raíz del proyecto
firebase deploy --only firestore:rules
```

**Salida esperada:**
```
=== Deploying to 'tu-proyecto'...

i  deploying firestore
✓  firestore: checking firestore.rules for compilation errors... Compiling Rules...
✓  firestore: rules have been successfully published.

Deploy complete!
```

---

## 📝 Códigos Disponibles por País

Total: **40 códigos pre-registrados**

### 🇪🇨 Ecuador (5)
```
ECU-TEN-0001  → Quito, DIST-ECU-001
ECU-TEN-0002  → Guayaquil, DIST-ECU-002
ECU-TEN-0003  → Cuenca, DIST-ECU-001
ECU-TEN-0004  → Santo Domingo, DIST-ECU-002
ECU-TEN-0005  → Quito, DIST-ECU-001
```

### 🇵🇪 Perú (5)
```
PER-TEN-0001  → Lima, DIST-PER-001
PER-TEN-0002  → Callao, DIST-PER-001
PER-TEN-0003  → Arequipa, DIST-PER-002
PER-TEN-0004  → Trujillo, DIST-PER-002
PER-TEN-0005  → Cusco, DIST-PER-001
```

### 🇲🇽 México (5)
```
MEX-TEN-0001  → Ciudad de México, DIST-MEX-001
MEX-TEN-0002  → Guadalajara, DIST-MEX-002
MEX-TEN-0003  → Monterrey, DIST-MEX-001
MEX-TEN-0004  → Cancún, DIST-MEX-002
MEX-TEN-0005  → Puebla, DIST-MEX-001
```

### 🇨🇴 Colombia (5)
```
COL-TEN-0001  → Bogotá, DIST-COL-001
COL-TEN-0002  → Medellín, DIST-COL-002
COL-TEN-0003  → Cali, DIST-COL-001
COL-TEN-0004  → Barranquilla, DIST-COL-002
COL-TEN-0005  → Cartagena, DIST-COL-001
```

### 🇧🇷 Brasil (5)
```
BRA-TEN-0001  → São Paulo, DIST-BRA-001
BRA-TEN-0002  → Rio de Janeiro, DIST-BRA-002
BRA-TEN-0003  → Brasília, DIST-BRA-001
BRA-TEN-0004  → Salvador, DIST-BRA-002
BRA-TEN-0005  → Belo Horizonte, DIST-BRA-001
```

### 🇬🇹 Guatemala (5)
```
GUA-TEN-0001  → Guatemala City, DIST-GUA-001
GUA-TEN-0002  → Quetzaltenango, DIST-GUA-002
GUA-TEN-0003  → Escuintla, DIST-GUA-001
GUA-TEN-0004  → Antigua, DIST-GUA-002
GUA-TEN-0005  → Chimaltenango, DIST-GUA-001
```

### 🇧🇴 Bolivia (5)
```
BOL-TEN-0001  → La Paz, DIST-BOL-001
BOL-TEN-0002  → Santa Cruz, DIST-BOL-002
BOL-TEN-0003  → Cochabamba, DIST-BOL-001
BOL-TEN-0004  → Oruro, DIST-BOL-002
BOL-TEN-0005  → Sucre, DIST-BOL-001
```

### 🇵🇦 Panamá (5)
```
PAN-TEN-0001  → Panama City, DIST-PAN-001
PAN-TEN-0002  → Colón, DIST-PAN-002
PAN-TEN-0003  → David, DIST-PAN-001
PAN-TEN-0004  → La Chorrera, DIST-PAN-002
PAN-TEN-0005  → San Miguelito, DIST-PAN-001
```

### 🇻🇪 Venezuela (5)
```
VEN-TEN-0001  → Caracas, DIST-VEN-001
VEN-TEN-0002  → Valencia, DIST-VEN-002
VEN-TEN-0003  → Maracaibo, DIST-VEN-001
VEN-TEN-0004  → Barquisimeto, DIST-VEN-002
VEN-TEN-0005  → Mérida, DIST-VEN-001
```

---

## 🔍 Validación en Registro

### Flujo Actual (sin validación)
```
Usuario escribe código → ❌ Se crea tienda directamente
```

### Flujo Nuevo (con validación)
```
Usuario escribe código
    ↓
  ✅ Frontend valida contra tenderos_validos
    ↓
  ✅ Backend valida en Cloud Function
    ↓
  ✅ Código se marca como "utilizado"
    ↓
  ✅ Se crea tienda con distributorId
```

---

## 🧪 Testing

### Prueba 1: Código Válido
```javascript
// Frontend
const result = await authService.validateStoreCode('ECU-TEN-0001');
// Resultado: { valid: true, country: 'Ecuador', city: 'Quito' }

// Registro
const { userId } = await authService.registerStore(
  'tendero@email.com',
  'password123',
  'ECU-TEN-0001',
  '+593987654321',
  'ecuador',
  'Juan Pérez'
);
// ✅ Éxito
```

### Prueba 2: Código Inválido
```javascript
const result = await authService.validateStoreCode('INVALID-CODE');
// Resultado: { valid: false, message: 'Código no válido' }
```

### Prueba 3: Código Ya Usado
```javascript
// Primero se registra
await authService.registerStore(..., 'ECU-TEN-0001', ...);

// Segundo intento
const result = await authService.validateStoreCode('ECU-TEN-0001');
// Resultado: { valid: false, message: 'Código ya registrado' }
```

---

## 🔐 Seguridad: Firestore Rules

La colección `tenderos_validos` está **completamente protegida**:

```javascript
match /tenderos_validos/{codigo} {
  allow read: if false;     // ❌ No se puede leer
  allow write: if false;    // ❌ No se puede escribir
}
```

### ¿Cómo accede el Cloud Function?

```typescript
// Cloud Functions tiene credenciales admin
import * as admin from 'firebase-admin';

const db = admin.firestore();
const docRef = db.collection('tenderos_validos').doc(storeCode);
const doc = await docRef.get();

// ✅ Puede acceder aunque las rules lo denieguen
```

---

## 📊 Monitoreo

### Verificar Carga en Firestore Console
```
1. Firebase Console
2. → Firestore Database
3. → Colección: tenderos_validos
4. → Ver 40 documentos
5. → Verificar campo "utilizado": false para todos
```

### Verificar Después de Registros
```
1. Filtrar por "utilizado": true
2. Deberías ver solo los códigos que se usaron
3. Campo "registeredStoreId" muestra la tienda que lo usó
```

---

## 🐛 Troubleshooting

### ❌ Error: "serviceAccountKey.json no encontrado"
```bash
# Solución: Asegurar que el archivo está en raíz
ls serviceAccountKey.json
# O especificar ruta
export FIREBASE_SERVICE_ACCOUNT="/ruta/completa/serviceAccountKey.json"
npx ts-node scripts/loadTenderos.ts
```

### ❌ Error: "Permission denied"
```bash
# El script necesita permisos de editor en Firebase
# Ir a: Project Settings → Service Accounts → Verificar permisos
# El JSON debe tener acceso a Firestore
```

### ❌ Error: "Código no válido" al registrar
```
1. Verificar que el código en tenderos_validos existe
2. Verificar que el código está en MAYÚSCULAS
3. Verificar campo "activo": true
4. Verificar campo "utilizado": false
```

### ❌ Cloud Function no puede acceder a tenderos_validos
```
1. Actualizar firebase-admin a v12.0.0+
2. Verificar que Cloud Function tiene serviceAccountKey
3. Re-desplegar: firebase deploy --only functions
```

---

## 📚 Próximos Pasos

1. **✅ Validación en Frontend** → Ya implementada en `authService.validateStoreCode()`
2. **✅ Validación en Backend** → Ya en `authService.registerStore()`
3. **✅ Firestore Security Rules** → Completadas en `firestore.rules`
4. **⏳ UI de Registro Mejorada** → Mostrar país/ciudad detectados
5. **⏳ Admin Panel** → Gestionar códigos (crear, activar, desactivar)

---

## 🎯 Resumen de Seguridad

| Componente | Protección | Nivel |
|-----------|-----------|-------|
| tenderos_validos | No lectura desde cliente | 🔴 Máxima |
| Validación | Duplicado (frontend + backend) | 🟢 Alta |
| Código único | Una tienda por código | 🟢 Alta |
| Auditoría | Log de quién usó cada código | 🟢 Media |

---

**Última actualización:** 2024-01-15  
**Versión:** 1.0  
**Estado:** ✅ Producción
