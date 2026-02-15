# 📋 Guía: Obtener y Ejecutar el Script de Limpieza

## Paso 1: Descargar Credenciales de Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona el proyecto: **cielodb-78dae**
3. Ve a **⚙️ Project Settings** (esquina superior derecha)
4. Abre la pestaña **Service Accounts**
5. Haz clic en **Generate New Private Key**
6. Se descargará un archivo JSON con el nombre similar a: `cielodb-78dae-firebase-adminsdk-xxx.json`

## Paso 2: Guardar el Archivo

Coloca el archivo descargado en esta ubicación:

```
cielo-promo/
├── functions/
│   └── cielodb-78dae-firebase-adminsdk.json  ← Aquí
├── scripts/
│   └── cleanupDuplicateUsers.js
└── ...
```

⚠️ **IMPORTANTE:** Este archivo contiene credenciales. NUNCA lo subas a Git.

## Paso 3: Ejecutar el Script

Abre una terminal en la carpeta `cielo-promo` y ejecuta:

```bash
node scripts/cleanupDuplicateUsers.js
```

## Salida Esperada

Si hay duplicados, verás algo así:

```
🧹 Iniciando limpieza de usuarios duplicados...

📊 Total de documentos en /users: 25

⚠️  Email con 2 documentos: usuario@example.com
   1. ID: usuario@exa... | Rol: STORE | UID: abc123def...
   2. ID: abc123def... | Rol: STORE | UID: abc123def...
   ✅ Documentos a mantener: abc123def...
   🗑️  Eliminando: usuario@exa...

============================================================
📋 RESUMEN DE LIMPIEZA:
   Emails con duplicados: 1
   Documentos duplicados encontrados: 1
   Documentos eliminados: 1
   
📧 Emails afectados:
   - usuario@example.com
============================================================
✅ Limpieza completada
```

## Alternativa: Hacerlo Manualmente en Firebase Console

Si no quieres ejecutar el script, puedes:

1. Ve a [Firebase Console](https://console.firebase.google.com/) → cielodb-78dae
2. En Firestore Database → colección `users`
3. Busca emails duplicados manualmente
4. Elimina los documentos con email como ID, mantén solo los con UID

## Verificación

Para verificar que no hay duplicados después:

```javascript
// Ejecuta esto en la console de Firebase
const usersSnapshot = await firebase.firestore().collection('users').get();
const emailCounts = {};

usersSnapshot.forEach(doc => {
  const email = doc.data().email;
  emailCounts[email] = (emailCounts[email] || 0) + 1;
});

const duplicates = Object.entries(emailCounts).filter(([_, count]) => count > 1);
console.log('Emails con duplicados:', duplicates);
```

Debería mostrar: `[]` (vacío)

---

📚 **Documentación:** Ver [DUPLICATED_USERS_FIX.md](./DUPLICATED_USERS_FIX.md)
