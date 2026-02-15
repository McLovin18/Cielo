# 🎯 Sistema de Puntos - Documentación Técnica

## 📋 Resumen Ejecutivo

**Estructura en 2 niveles:**

1. **GLOBAL (Super Admin):** Define productos y puntos universales
2. **POR PAÍS (Admin Country):** Personaliza por país (traducción, SKU local, puntos ajustados)

Cuando un tendero carga una factura mediante OCR, el sistema:

1. **Lee** el SKU de cada producto en la factura
2. **Busca** configuración por país (si existe)
3. **Usa** puntos locales si están configurados, sino puntos globales
4. **Suma** los puntos según: `puntos del producto × cantidad comprada`
5. **Acumula** en la cuenta del tendero

---

## 🏗️ Arquitectura de Datos

### GlobalProduct (Productos Globales)
**Gestión: SUPER_ADMIN en `/super-admin/products`**

Almacenados en la colección `/globalProducts` de Firestore

```typescript
interface GlobalProduct {
  id: string;              // UUID generado por Firestore
  sku: string;             // Código único (ej: "AGUA-500-PUR") - Se lee en OCR
  name: string;            // Nombre del producto
  brand: string;           // Marca (ej: "CIELO")
  category: string;        // Categoría (agua, bebidas, alimentos, otros)
  pointsValue: number;     // ⭐ PUNTOS asignados por unidad
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

**Ejemplo:**
```json
{
  "id": "prod_001",
  "sku": "AGUA-500-PUR",
  "name": "Agua Purificada 500ml",
  "brand": "CIELO",
  "category": "agua",
  "pointsValue": 5,
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### CountryProduct (Productos por País) - OPCIONAL
**Gestión: ADMIN_COUNTRY en `/admin/products`**

Almacenados en la colección `/countryProducts` de Firestore

Si necesitas valores diferentes por país, puedes configurar:

```typescript
interface CountryProduct {
  id: string;
  globalProductId: string;  // Referencia al producto global
  countryId: string;        // País específico
  localName: string;        // Nombre local traducido
  pointsValue: number;      // ⭐ PUNTOS SOBRESCRITOS para este país
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

**Ejemplo:**
```json
{
  "id": "cp_001",
  "globalProductId": "prod_001",
  "countryId": "mexico",
  "localName": "Agua Purificada Botella 500ml",
  "pointsValue": 3,  // Diferentes puntos en México
  "status": "active"
}
```

---

## 🔄 Flujo de Cálculo de Puntos

### Paso 1: Creación del Producto
En `/super-admin/products`:
- Super Admin crea un **GlobalProduct**
- Asigna **SKU** (código que leerá el OCR)
- Asigna **pointsValue** (puntos por unidad)

### Paso 2: Carga de Factura por Tendero
En `/store/uploads`:
- Tendero carga una factura (imagen PDF/JPG)
- OCR lee los SKU de los productos en la factura
- OCR identifica la cantidad de cada producto

### Paso 3: Cálculo Automático de Puntos
En el servicio de OCR (`ocrService.ts`):
```typescript
// Pseudocódigo del cálculo
totalPoints = 0;
for each (producto en factura) {
  globalProduct = buscar por SKU
  if (countryProductExiste) {
    pointValue = countryProduct.pointsValue
  } else {
    pointValue = globalProduct.pointsValue
  }
  totalPoints += pointValue × cantidad
}

// Acumular en el tendero
tendero.pointsMonth += totalPoints
tendero.pointsTotal += totalPoints
```

### Ejemplo Completo
Factura de tendero en México:
```
PRODUCTOS:
- Agua 500ml (SKU: AGUA-500-PUR) × 12 unidades
- Agua 1L (SKU: AGUA-1L-PUR) × 5 unidades
- Refresco (SKU: REFR-COLA-350) × 10 unidades
```

Cálculo de puntos:
```
Agua 500ml:     5 puntos × 12 = 60 puntos
Agua 1L:        8 puntos × 5  = 40 puntos
Refresco:      10 puntos × 10 = 100 puntos
─────────────────────────────────────────
TOTAL:                          200 puntos
```

---

## 💾 Operaciones CRUD de Productos

### Crear Producto Global
```typescript
await productService.createGlobalProduct({
  name: "Agua Purificada 500ml",
  sku: "AGUA-500-PUR",
  brand: "CIELO",
  category: "agua",
  pointsValue: 5,  // ⭐ Puntos por unidad
});
```

**Validaciones:**
- ✓ SKU debe ser único (no puede repetirse)
- ✓ SKU solo alpanuméricos y guiones
- ✓ pointsValue debe ser > 0
- ✓ Nombre y categoría requeridos

### Actualizar Producto
```typescript
await productService.updateGlobalProduct(productId, {
  pointsValue: 7,  // Cambiar puntos
  status: 'inactive',
});
```

### Eliminar Producto
```typescript
await productService.deleteGlobalProduct(productId);
// ⚠️ Esto TAMBIÉN elimina todas las CountryProducts asociadas
```

### Buscar por SKU (para OCR)
```typescript
const product = await productService.getProductBySku("AGUA-500-PUR");
console.log(product.pointsValue); // 5
```

---

## 📊 Vista en Super Admin

### Tab: Productos Globales
Muestra:
- ✓ Nombre del producto
- ✓ SKU (código para OCR)
- ✓ Marca
- ✓ Categoría
- ✓ **Puntos ⭐** (destacado en naranja)
- ✓ Estado (activo/inactivo)

### Formulario de Creación
Campos:
- `Nombre del Producto` *
- `Código SKU` * (validación de unicidad)
- `Marca` (opcional)
- `Categoría` * (dropdown: agua, bebidas, alimentos, otros)
- `Puntos por Unidad` * (número > 0)

---

## 🌍 Configuración por País (Fase 2)

Para casos donde los puntos varían por país:

```typescript
// México: 3 puntos por agua
await productService.createCountryProduct({
  globalProductId: "prod_001",
  countryId: "mexico",
  localName: "Agua Purificada Botella 500ml",
  pointsValue: 3,  // Diferente al global
  status: "active",
});

// España: 5 puntos (usa el valor global)
// No necesita CountryProduct si usa el valor global
```

**Prioridad de Cálculo:**
1. ¿Existe CountryProduct para este país? → Usar su pointsValue
2. Si no → Usar GlobalProduct.pointsValue

---

## 🔒 Validaciones de Seguridad

### En GlobalProduct:
```typescript
if (data.pointsValue <= 0) {
  throw new Error('Los puntos deben ser mayor a 0');
}

if (existingSKU) {
  throw new Error(`El SKU "${data.sku}" ya existe. Debe ser único.`);
}
```

### En CountryProduct:
```typescript
// Validación: no duplicar (globalProductId + countryId)
if (existingCountryProduct) {
  throw new Error('Este producto ya está configurado en este país');
}
```

---

## 📱 APIs Relacionadas

### ProductService Methods

```typescript
// GLOBAL PRODUCTS
createGlobalProduct(data)         // Crear producto global
getGlobalProducts()               // Obtener todos
updateGlobalProduct(id, data)     // Actualizar
deleteGlobalProduct(id)           // Eliminar (en cascada)
getProductBySku(sku)              // Búsqueda por SKU (OCR)

// COUNTRY PRODUCTS
createCountryProduct(data)        // Crear config por país
getCountryProducts(countryId)     // Obtener por país
updateCountryProduct(id, data)    // Actualizar config
deleteCountryProduct(id)          // Eliminar config
```

---

## 🧪 Ejemplo de Caso de Uso Real

### Escenario: Expandir a 3 países

**1. Super Admin crea productos globales:**
```
AGUA-500-PUR  → 5 puntos
AGUA-1L-PUR   → 8 puntos
REFR-COLA-350 → 10 puntos
```

**2. Admin de México configura precios locales:**
```
AGUA-500-PUR en México → 3 puntos (menos en Latino América)
Otros productos → usan valor global
```

**3. Admin de España configura normales:**
```
Todos los productos → usan valor global (5, 8, 10 respectivamente)
```

**4. Tendero en México carga factura:**
```
OCR lee: AGUA-500-PUR × 12
Sistema busca: ¿CountryProduct para (AGUA-500-PUR, mexico)?
Resultado: Sí → 3 puntos × 12 = 36 puntos ✓
```

**5. Tendero en España carga factura:**
```
OCR lee: AGUA-500-PUR × 12
Sistema busca: ¿CountryProduct para (AGUA-500-PUR, españa)?
Resultado: No → Usa GlobalProduct → 5 puntos × 12 = 60 puntos ✓
```

---

## 🎮 Pruebas Rápidas

Para probar el sistema:

```bash
# En la consola del navegador, en /super-admin/products:

// 1. Crear producto
const producto = await productService.createGlobalProduct({
  name: "Test Agua",
  sku: "TEST-AGUA-001",
  brand: "TEST",
  category: "agua",
  pointsValue: 99,
});

// 2. Obtener por SKU (simular OCR)
const found = await productService.getProductBySku("TEST-AGUA-001");
console.log(found.pointsValue); // 99

// 3. Verificar cálculo
const cantidad = 5;
const totalPoints = found.pointsValue * cantidad; // 495
```

---

## 📈 Próximas Mejoras

- [ ] Bonificaciones por volumen (ej: 2x puntos si compra > 100 unidades)
- [ ] Puntos estacionales (ej: +50% en Navidad)
- [ ] Categoría con múltiples puntos (ej: "Premium" = 2x puntos)
- [ ] Histórico de cambios de puntos
- [ ] Reportes de puntos por producto/tendero/mes
- [ ] Sincronización automática de precios desde ERP

---

**Última actualización:** 2026-02-04  
**Version:** 1.0 - Sistema Base  
**Estado:** ✅ Producción
