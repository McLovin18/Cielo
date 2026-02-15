# 📋 Script para Actualizar Tenderos Válidos con DistribuidorId

Este script actualiza todos los documentos en la colección `tenderos_validos` con el campo `distribuidorId`.

## 🚀 Cómo Usar

### Opción 1: Con Firebase CLI (Recomendado)

Si estás logueado en Firebase CLI, ejecuta:

```bash
node scripts/updateTenderosValidos.js
```

### Opción 2: Con Credenciales Explícitas

1. Descarga la clave JSON de tu proyecto Firebase:
   - Ve a Firebase Console → Settings → Service Accounts
   - Haz clic en "Generate New Private Key"
   - Guarda el archivo como `firebaseServiceAccountKey.json` en la raíz del proyecto

2. Ejecuta el script:

```bash
# Windows (PowerShell)
$env:GOOGLE_APPLICATION_CREDENTIALS="./firebaseServiceAccountKey.json"
node scripts/updateTenderosValidos.js

# macOS/Linux
export GOOGLE_APPLICATION_CREDENTIALS="./firebaseServiceAccountKey.json"
node scripts/updateTenderosValidos.js
```

### Opción 3: Usando firebase emulator (para pruebas locales)

```bash
firebase emulators:start --only firestore
# En otra terminal:
FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/updateTenderosValidos.js
```

## 📊 Qué hace el script

- ✅ Busca cada documento en `tenderos_validos` por su código (ECU-TEN-0001, etc.)
- 📝 **Si existe**: Actualiza los campos `distribuidorId`, `ciudad`, `pais`, `activo`
- 🆕 **Si no existe**: Crea el documento con todos los campos incluidos
- 📋 Muestra un resumen al final con cantidad de actualizados/creados/errores

## 📦 Datos que se Sincronizarán

El script contiene información de 45 tenderos en 9 países:

- 🇪🇨 Ecuador: 5 tenderos (3 distribuidores)
- 🇵🇪 Perú: 5 tenderos (3 distribuidores)
- 🇲🇽 México: 5 tenderos (3 distribuidores)
- 🇨🇴 Colombia: 5 tenderos (3 distribuidores)
- 🇧🇷 Brasil: 5 tenderos (3 distribuidores)
- 🇬🇹 Guatemala: 5 tenderos (3 distribuidores)
- 🇧🇴 Bolivia: 5 tenderos (3 distribuidores)
- 🇵🇦 Panamá: 5 tenderos (3 distribuidores)
- 🇻🇪 Venezuela: 5 tenderos (3 distribuidores)

## ❌ Si el Script Falla

### "Cannot find module 'firebase-admin'"
```bash
npm install
```

### "GOOGLE_APPLICATION_CREDENTIALS is not set"
Necesitas proporcionar credenciales. Intenta la Opción 1 (Firebase CLI logueado) o la Opción 2 (archivo JSON).

### "Permission denied" en Firestore
Verifica que tus Firestore Rules permitan escritura en `tenderos_validos`:
```
match /tenderos_validos/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == "admin-uid" || request.auth.token.admin == true;
}
```

## ✨ Después de Ejecutar

1. El script saldrá automáticamente con exit code 0 si es exitoso
2. Ve a Firestore Console y verifica que `tenderos_validos` tenga el campo `distribuidorId`
3. Los usuarios ahora verán automáticamente su distribuidor asignado

## 🔄 Integración con AuthContext

Después de ejecutar este script, puedes comentar o remover la siguiente línea en `AuthContext.tsx` 
para usar los datos de Firestore en lugar del mapa hardcodeado:

```typescript
// const distributorId = STORE_DISTRIBUTOR_MAP[storeCode]; // ← Remover después de sincronizar
```
