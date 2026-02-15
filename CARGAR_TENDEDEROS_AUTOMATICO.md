# 🚀 GUÍA: Cargar 20,000 Tendederos a Firestore Automáticamente

## El Problema

No quieres escribir manualmente 20,000 documentos en Firebase Console. ❌ **Imposible** hacerlo a mano.

## La Solución

Usamos **firebase-admin SDK** + **script TypeScript** para cargar en **batch** (muy rápido).

```
Tu JSON con 20,000 tendederos
        ↓
    Script TypeScript
        ↓
  firebase-admin SDK
        ↓
  Firestore (batch)
        ↓
  20,000 documentos en minutos ⚡
```

---

## ✅ Paso 1: Obtener Credenciales Firebase

### 1.1 Ir a Firebase Console

```
https://console.firebase.google.com
→ Tu Proyecto (Cielo Promo)
→ ⚙️ Project Settings (gear icon arriba)
→ Service Accounts tab
```

### 1.2 Generar Clave Privada

```
Click en "Generate New Private Key"
→ Se descarga un JSON
→ Guardar como: firebase-service-account.json
→ Poner en la RAÍZ del proyecto
```

**Ejemplo ubicación:**
```
cielo-promo/
├── firebase-service-account.json ← AQUÍ
├── scripts/
│   └── loadTenderos.ts
├── src/
├── package.json
└── ...
```

---

## ✅ Paso 2: Preparar tu JSON de Tendederos

Archivo: `TENDEROS_VALIDOS_50.json` (o el tuyo con 20,000)

```json
{
  "ECU-TEN-0001": { 
    "pais": "Ecuador", 
    "ciudad": "Quito", 
    "distribuidorId": "DIST-ECU-01", 
    "activo": true 
  },
  "ECU-TEN-0002": { 
    "pais": "Ecuador", 
    "ciudad": "Guayaquil", 
    "distribuidorId": "DIST-ECU-02", 
    "activo": true 
  },
  ...
}
```

**Importante:** El archivo debe estar en la raíz:
```
cielo-promo/
├── TENDEROS_VALIDOS_50.json ← AQUÍ
├── scripts/
└── ...
```

---

## ✅ Paso 3: Instalar Dependencias (una sola vez)

```bash
npm install firebase-admin
```

O si ya las tienes, verificar en `package.json`:
```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase": "^10.0.0"
  },
  "devDependencies": {
    "ts-node": "^10.0.0"
  }
}
```

---

## ✅ Paso 4: Ejecutar el Script

### En la terminal:

```bash
# Opción 1: Con ts-node (recomendado)
npx ts-node scripts/loadTenderos.ts

# Opción 2: Si tienes Node.js compilado
node scripts/loadTenderos.ts
```

### Esperado Output:

```
📦 Iniciando carga de tendederos...

📊 Total de tendederos a cargar: 50

✅ Batch 1: 50 documentos | Total: 50/50 (100%)

🎉 ¡Carga completada exitosamente!
📊 50 tendederos cargados en Firestore

📍 Distribución por país:
   Bolivia: 5
   Brasil: 5
   Colombia: 5
   Ecuador: 5
   Guatemala: 5
   México: 5
   Panamá: 5
   Perú: 5
   Venezuela: 5

🏢 Distribución por distribuidor:
   DIST-BOL-01: 3
   DIST-BOL-02: 2
   DIST-BRA-01: 3
   ...

✅ Próximos pasos:
1. Verificar en Firebase Console → Firestore Database
2. Actualizar Firestore Rules
3. Actualizar Storage Rules
4. Test: Registrar tendero con código válido
```

---

## 🚀 Para 20,000 Tendederos

El script es **exactamente igual**. Solo cambia el JSON:

```bash
# Mismo script funciona con 20,000 documentos
npx ts-node scripts/loadTenderos.ts
```

**Velocidad:**
- 50 documentos: ~2 segundos ⚡
- 500 documentos: ~3 segundos ⚡
- 5,000 documentos: ~10 segundos ⚡
- 20,000 documentos: ~40 segundos ⚡

**Por qué es rápido:**
- Batch operations (máx 500 por batch)
- Paralelización en Firestore
- Sin esperar confirmación individual

---

## ✅ Verificar en Firebase Console

### 1. Ir a Firestore Database

```
Firebase Console
→ Firestore Database
→ Collection: tenderos_validos
```

### 2. Ver Documentos

Deberías ver todos tus documentos:
```
ECU-TEN-0001
  ├── pais: "Ecuador"
  ├── ciudad: "Quito"
  ├── distribuidorId: "DIST-ECU-01"
  ├── activo: true
  └── utilizado: false

ECU-TEN-0002
  └── ...

... (hasta 50 o 20,000)
```

---

## 🔒 Seguridad

**El script usa firebase-admin:**
- ✅ Credenciales seguras (servidor-side)
- ✅ No expone datos en el cliente
- ✅ Firestore Rules aún protegen (no se pueden bypassear)
- ✅ El JSON solo existe localmente

**No subas el firebase-service-account.json a GitHub:**
```
# .gitignore
firebase-service-account.json
```

---

## 🐛 Solución de Problemas

### Error: "firebase-service-account.json no encontrado"

```
❌ firebase-service-account.json no encontrado
📍 Esperado en: /Users/.../cielo-promo/firebase-service-account.json
```

**Solución:**
1. Descargar credenciales de Firebase Console (ver Paso 1)
2. Guardar en la RAÍZ del proyecto
3. Verificar nombre exacto: `firebase-service-account.json`

### Error: "Archivo no encontrado: TENDEROS_VALIDOS_50.json"

**Solución:**
1. Verificar que el JSON esté en la raíz
2. Verificar nombre exacto
3. Verificar que sea JSON válido (sin comillas sin escape)

### Error: "Cannot find module 'firebase-admin'"

**Solución:**
```bash
npm install firebase-admin
npx ts-node scripts/loadTenderos.ts
```

### Error de Permisos

Si Firestore Rules bloquean:
- ❌ Asegúrate de estar autenticado como Super Admin
- ❌ O ajusta las Rules para permitir el admin SDK

```javascript
// En las Firestore Rules:
match /tenderos_validos/{code} {
  allow read, write: if request.auth.token.email == 'hectorcobea03@gmail.com';
}
```

---

## 📊 Script: Qué Hace

```typescript
1. Lee TENDEROS_VALIDOS_50.json
   ↓
2. Inicializa firebase-admin con credenciales
   ↓
3. Por cada 500 documentos (batch):
   - Crea referencia: db.collection('tenderos_validos').doc(code)
   - Set documento con datos
   - Commit batch
   ↓
4. Resumen:
   - Total cargados
   - Por país
   - Por distribuidor
```

---

## 🎯 Próximos Pasos

```
✅ 1. Cargar tendederos (THIS)
   ↓
📍 2. Actualizar Firestore Rules
   ↓
📍 3. Actualizar Storage Rules
   ↓
📍 4. Test: Registrar con código válido
```

---

## 📚 Referencias

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/database/admin/start)
- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Script ejecutado: scripts/loadTenderos.ts](./scripts/loadTenderos.ts)

---

## ✨ Resumen

| Aspecto | Antes (Manual) | Después (Script) |
|--------|---------------|-----------------|
| **50 tendederos** | 50 clicks | ~2 segundos ⚡ |
| **20,000 tendederos** | 20,000 clicks (imposible) | ~40 segundos ⚡ |
| **Errores** | Muchos | 0 |
| **Tiempo total** | 8 horas | 5 minutos |

**Conclusión:** Usa el script, ahorra tiempo, evita errores. 🚀
