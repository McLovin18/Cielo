# 🚀 ACTUALIZAR TENDEROS VÁLIDOS CON DISTRIBUIDORID

## Ejecución Rápida (Opción Recomendada)

Si estás autenticado con Firebase CLI:

```bash
npm run update-tenderos
```

## Alternativas

### Con Archivo de Credenciales JSON

1. Descarga el archivo `serviceAccountKey.json` desde Firebase Console:
   - https://console.firebase.google.com
   - Tu proyecto → ⚙️ Settings → Service Accounts
   - Botón "Generate New Private Key"

2. Guarda el archivo en la raíz del proyecto

3. Ejecuta:
   ```bash
   npm run update-tenderos
   ```

### Manual (Windows PowerShell)

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
node scripts/updateTenderosValidos.js
```

### Manual (macOS/Linux)

```bash
export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
node scripts/updateTenderosValidos.js
```

## Qué Hace

- ✅ Actualiza 45 documentos en colección `tenderos_validos`
- 📝 Añade/actualiza campo `distribuidorId` en cada tendero
- 📊 Muestra resumen detallado al final

## Resultado Esperado

```
✅ ACTUALIZADO: ECU-TEN-0001 → DIST-ECU-01 (Quito)
✅ ACTUALIZADO: ECU-TEN-0002 → DIST-ECU-02 (Guayaquil)
...
📊 RESUMEN:
   ✅ Actualizados: 45
   🆕 Creados: 0
   ❌ Errores: 0
   📝 Total procesados: 45

✨ ¡Actualización completada exitosamente!
```

## ✨ Después de Ejecutar

Los usuarios de tipo STORE verán automáticamente su distribuidor asignado sin necesidad del workaround.

Para remover el workaround hardcodeado en AuthContext.tsx:

```typescript
// const distributorId = STORE_DISTRIBUTOR_MAP[storeCode]; // ← Comentar/remover
const distributorId = storeData?.distribuidorId; // ← Usar dato de Firestore
```

## 🐛 Troubleshooting

| Error | Solución |
|-------|----------|
| "Cannot find module 'firebase-admin'" | `npm install` |
| "Permission denied" | Verifica Firestore Rules |
| "Project not found" | Verifica `GOOGLE_APPLICATION_CREDENTIALS` |
| "Quota exceeded" | Espera unos minutos y reintenta |

Ver `scripts/UPDATE_TENDEROS_README.md` para más detalles.
