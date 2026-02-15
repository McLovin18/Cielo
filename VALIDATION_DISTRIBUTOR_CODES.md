# Validación de Códigos de Distribuidor

## Problema Identificado
Un distribuidor fue creado con código `DIST-ECU-08` que no existe en `tenderos_validos`. Esto indica que el formulario permitía cualquier código sin validación.

## Solución Implementada

### 1. Extracción de Códigos Válidos
En la función `loadData()` de `delivery-config/page.tsx`:
- Se cargan todos los documentos de `tenderos_validos` del país
- Se extrae el campo `distribuidorId` de cada documento
- Se almacena un conjunto único de códigos válidos en el estado `validDistributorIds`
- Se registra en consola: `📊 Códigos de distribuidor válidos: DIST-ECU-01, DIST-ECU-02, DIST-ECU-03`

### 2. Selector de Código (Dropdown)
Reemplazo del input de texto por un select:
```tsx
// ANTES: Input de texto (sin validación)
<input
  type="text"
  value={formData.distributorId}
  placeholder="Ej: DIST-ECU-01"
/>

// DESPUÉS: Select dropdown (solo códigos válidos)
<select value={formData.distributorId}>
  <option value="">Seleccionar código de distribuidor</option>
  {validDistributorIds.map((id) => (
    <option key={id} value={id}>{id}</option>
  ))}
</select>
```

### 3. Validación Mejorada
En la función `validateForm()`:
- Verifica que se haya seleccionado un código
- Valida que el código esté en la lista `validDistributorIds`
- Mensaje de error claro si falla: `El código "DIST-ECU-08" no es válido. Los códigos válidos son: DIST-ECU-01, DIST-ECU-02, DIST-ECU-03`

### 4. Manejo de Sin Códigos
Si no hay códigos válidos disponibles:
- Muestra un mensaje de advertencia
- Desactiva el formulario para que no se pueda crear distribuidores
- Mensaje: "No hay códigos de distribuidor disponibles en tenderos válidos"

## Cambios Realizados

### Archivo: `src/app/admin/delivery-config/page.tsx`

**1. Estado agregado:**
```typescript
const [validDistributorIds, setValidDistributorIds] = useState<string[]>([]);
```

**2. En `loadData()`:**
```typescript
// Extrae códigos únicos de tenderos_validos
const distributorIds = new Set<string>();
tenderosSnapshot.docs.forEach((doc) => {
  const data = doc.data() as any;
  if (data.distribuidorId) {
    distributorIds.add(data.distribuidorId);
  }
});
setValidDistributorIds(Array.from(distributorIds).sort());
```

**3. En `validateForm()`:**
```typescript
else if (!validDistributorIds.includes(formData.distributorId)) {
  errors.distributorId = `El código "${formData.distributorId}" no es válido...`;
}
```

**4. En formulario (UI):**
```tsx
{validDistributorIds.length === 0 ? (
  <div>No hay códigos disponibles</div>
) : (
  <select>
    {validDistributorIds.map((id) => (
      <option value={id}>{id}</option>
    ))}
  </select>
)}
```

## Resultado

✅ **Antes**: Podía crearse `DIST-ECU-08` sin validar
✅ **Después**: Solo pueden crearse distribuidores con códigos válidos de `tenderos_validos`

## Build Status
✅ Compilado exitosamente (40/40 rutas, 0 errores)

## Próximos Pasos (Opcional)
- [ ] Limpiar registros de distribuidores con códigos inválidos
- [ ] Agregar auditoría de cambios
- [ ] Validar que al actualizar distribuidor no se pueda cambiar a código inválido
