# 🧪 Testing: Validación del Sistema Admin

## Quick Summary de Cambios

| Archivo | Cambio | Línea |
|---------|--------|-------|
| `src/services/authService.ts` | Código error: `NO_ADMIN_IN_COUNTRY` en registerStore() | ~52 |
| `src/services/authService.ts` | Código error: `NO_ADMIN_IN_COUNTRY` en registerUserWithoutCode() | ~210 |
| `src/app/register/page.tsx` | Detección de error especial en handleSubmit() | ~138 |
| `src/app/register/page.tsx` | UI condicional con estilo amarillo para admin error | ~368 |

## Cómo Probar

### 1. Iniciar el servidor dev
```bash
npm run dev
```

### 2. Escenario A: Tendero sin admin en país

**Setup:**
- Asegúrate de que en Firestore NO exista un documento en `users` con `role='ADMIN_COUNTRY'` y `countryId='VEN'`

**Pasos:**
1. Abre http://localhost:3000/register
2. Click en "🏪 Soy Tendero"
3. Click en "Siguiente"
4. Rellena:
   - Email: `tendero@venezuela.com`
   - Contraseña: `Password123`
   - Confirmar: `Password123`
5. Click en "Siguiente"
6. Rellena:
   - País: **Venezuela**
   - Código de tendero: `VEN-TEN-0001` (cualquier código válido)
   - Teléfono: `5804123456`
   - Nombre: `Carlos Pérez`
7. Click en "Registrarse"

**Resultado Esperado:**
```
⚠️ Admin del País Requerido

No hay admin asignado en este país. Solicita al SuperAdmin 
que designe un administrador.

💡 El admin de país es el corazón del sistema. Sin admin, 
   nadie puede registrarse.
```

**Colores:**
- Fondo: Amarillo claro (bg-yellow-50)
- Texto: Amarillo oscuro (text-yellow-700)
- Borde izquierdo: Amarillo (border-yellow-400)
- Icono: ⚠️

---

### 3. Escenario B: Distribuidor sin admin en país

**Setup:**
- Asegúrate de que en Firestore NO exista un admin para Ecuador

**Pasos:**
1. Abre http://localhost:3000/register
2. Click en "🌐 Soy Distribuidor o Admin"
3. Click en "Siguiente"
4. Rellena:
   - Email: `distribuidor@ecuador.com`
   - Contraseña: `Password456`
   - Confirmar: `Password456`
5. Click en "Siguiente"
6. Rellena:
   - País: **Ecuador**
   - Teléfono: `593987654321`
   - Nombre: `Ana González`
7. Click en "Registrarse"

**Resultado Esperado:**
[Mismo mensaje amarillo que Escenario A]

---

### 4. Escenario C: Registrar EXITOSO con admin asignado

**Setup:**
1. Abre Firebase Console
2. Ve a Firestore → users collection
3. Crea un documento manualmente:
   ```json
   {
     "role": "ADMIN_COUNTRY",
     "countryId": "COL",
     "email": "admin@colombia.com",
     "name": "Admin Colombia",
     "status": "active"
   }
   ```

**Pasos:**
1. Abre http://localhost:3000/register
2. Click en "🏪 Soy Tendero"
3. Siguiente
4. Rellena con país **Colombia**:
   - Email: `tendero@colombia.com`
   - Contraseña: `Password789`
   - Confirmar: `Password789`
5. Siguiente
6. Rellena:
   - País: **Colombia** (mismo que arriba)
   - Código: `COL-TEN-0001`
   - Teléfono: `573001234567`
   - Nombre: `Pedro Martínez`
7. Click en "Registrarse"

**Resultado Esperado:**
```
✅ ¡Registro exitoso! Redirigiendo...
   (después de 2 segundos redirige a /store/dashboard)
```

---

### 5. Escenario D: Admin Pendiente se Registra

**Setup:**
1. Ve a Firestore Console
2. En `/super-admin/config-admin` UI:
   - Selecciona País: Perú
   - Nombre: `Juan López`
   - Email: `juan.lopez@peru.com`
   - Teléfono: `51987654321`
   - Click: "Asignar como Admin"
3. Verifica en Firestore que se cree doc con `status: 'pending_registration'`

**Pasos:**
1. Abre http://localhost:3000/register
2. Click en "🌐 Soy Distribuidor o Admin"
3. Siguiente
4. Rellena:
   - Email: `juan.lopez@peru.com` ← **MISMO del admin**
   - Contraseña: `PajaroVolador123`
   - Confirmar: `PajaroVolador123`
5. Siguiente
6. Rellena:
   - País: **Perú** (el mismo del admin)
   - Teléfono: `51987654321`
   - Nombre: `Juan López`
7. Click en "Registrarse"

**Resultado Esperado:**
```
✅ ¡Registro exitoso! Redirigiendo...
   (después de 2 segundos redirige a /admin/dashboard)
```

**Verificación:**
- En Firestore, el documento del usuario debe tener:
  - `role: 'ADMIN_COUNTRY'`
  - `countryId: 'PER'`
  - `status: 'active'`

---

## Casos Especiales

### ❌ Error: Email ya registrado
```
Entrada: Ya existe usuario con ese email
Salida:
  🔴 Este email ya está registrado
  (fondo rojo)
```

### ❌ Error: Contraseña débil
```
Entrada: Contraseña < 6 caracteres
Salida:
  🔴 La contraseña debe tener al menos 6 caracteres
  (fondo rojo)
```

### ❌ Error: Email inválido
```
Entrada: Email mal formado
Salida:
  🔴 El email no es válido
  (fondo rojo)
```

---

## Logs en Consola

### Si el registro FALLA por admin faltante:
```javascript
❤️  Verificando si existe admin en el país: VEN
// (query returns empty)
❌ Error al registrar tendero: 
   No hay admin asignado en este país. Solicita al SuperAdmin 
   que designe un administrador.
```

### Si el registro EXITOSO:
```javascript
❤️  Verificando si existe admin en el país: COL
✅ Admin verificado para el país: COL
✅ Tendero registrado exitosamente: COL-TEN-0001
```

### Si es ADMIN pendiente que se registra:
```javascript
🔍 Verificando si el email es admin de país...
✅ Email asignado como admin para país: PER
✅ Usuario será admin de país: PER
✅ ¡Usuario registrado exitosamente!
```

---

## Checklist de Validación

- [ ] ⚠️ Error amarillo aparece cuando no hay admin
- [ ] 📝 El mensaje dice "Admin del País Requerido"
- [ ] 💡 Aparece el tip: "El admin de país es el corazón..."
- [ ] ✅ Registro exitoso cuando existe admin
- [ ] 🔑 Admin pendiente puede registrarse
- [ ] 🎯 Redirección correcta por rol
- [ ] 🔴 Otros errores aparecen en rojo (no amarillo)
- [ ] 📱 Responsive: UI funciona en móvil
- [ ] 🌙 Dark mode: Colores funcionan bien

---

## Build Verification

```
npm run build
  ✓ Compiled successfully in 9.7s
  ✓ Running TypeScript
  ✓ Collecting page data using 7 workers
  ✓ Generating static pages (22/22) in 1908.3ms
  ✓ Finalizing page optimization

Exit Code: 0 ✅
```

---

## Notas Importantes

1. **Admin es Requerido:**
   - NO es opcional
   - Tiene que existir ANTES de cualquier otro registro

2. **Error Code:**
   - `NO_ADMIN_IN_COUNTRY` solo se usa para este caso específico
   - Se diferencia de otros errores de Firebase

3. **Excepción:**
   - El único que puede registrarse sin admin es el ADMIN mismo (si está asignado)
   - Todos los demás (tenderos, distribuidores) requieren admin

4. **Colores:**
   - Amarillo (⚠️) = Admin missing (no es un error del usuario, es del sistema)
   - Rojo (🔴) = Error de validación/entrada del usuario

---

**Status:** ✅ Ready for Testing
**Build:** ✅ Successful (Exit Code 0)
**Coverage:** ✅ Backend + Frontend + UI Presentation
