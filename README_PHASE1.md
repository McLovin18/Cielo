🌊 CIELO PROMO - Phase 1 OCR Manual
====================================

## 📱 Descripción General

**Cielo Promo** es una plataforma de promociones para la marca de agua **Cielo** que permite a tenderos registrar sus compras mediante facturas, acumular puntos, y canjearlos por premios.

**Phase 1 (Actual):** Sistema manual de extracción de datos OCR
**Phase 2 (Próximo):** Integración con Google Vision para OCR automático
**Phase 3 (Futuro):** Advanced ML con validación automática

## 🎯 Objetivos de Phase 1

- ✅ Registro de tenderos
- ✅ Autenticación segura
- ✅ Upload de facturas con foto
- ✅ Extracción manual de datos (OCR manual)
- ✅ Almacenamiento de dataset para ML training
- ✅ Historial de facturas

## 🏗️ Arquitectura

```
┌─────────────────┐
│   Users (Web)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│    Next.js Frontend (TypeScript)    │
├─────────────────────────────────────┤
│ • Registro & Login (Firebase Auth)   │
│ • Upload de facturas (Dropzone)      │
│ • OCR Manual (Formulario)            │
│ • Historial de facturas              │
└────────┬────────────────────────────┘
         │
    ┌────┴────┬────────────────┐
    │          │                │
    ▼          ▼                ▼
┌────────┐ ┌──────────┐ ┌─────────────┐
│Firebase│ │Firestore │ │   Storage   │
│  Auth  │ │  (Data)  │ │ (Images)    │
└────────┘ └──────────┘ └─────────────┘
              │
    ┌─────────▼──────────┐
    │  Cloud Functions   │
    │ (Cálculo Puntos)   │
    └────────────────────┘
```

## 🛠️ Stack Técnico

- **Frontend:** Next.js 16, TypeScript 5, React 19, Tailwind CSS
- **Backend:** Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Drag & Drop:** react-dropzone
- **State Management:** React Context + Zustand (futuro)
- **Database:** Firestore (NoSQL)
- **Deployment:** Firebase Hosting + Cloud Functions

## 📦 Nuevos Componentes en Phase 1

### Services
```typescript
src/services/ocrService.ts
├─ createTrainingData()      // Guardar datos para ML
├─ getTrainingDataByCountry() // Obtener datos
├─ exportForMLTraining()     // Exportar JSONL
├─ saveSuggestions()         // Guardar sugerencias OCR
├─ validateOCRSuggestions()  // Validar datos
├─ getOCRStats()             // Estadísticas
└─ mockOCRSuggestions()      // Testing
```

### Pages
```typescript
src/app/store/uploads/page.tsx
├─ Step 1: Upload (Dropzone)
├─ Step 2: OCR Manual (Formulario)
└─ Step 3: Success (Confirmación)

src/app/store/invoices/page.tsx
├─ Historial de facturas
├─ Filtros por estado
└─ Modal de detalles
```

## 🚀 Guía de Inicio Rápido

### 1. Instalación

```bash
# Clonar repo
git clone https://github.com/user/cielo-promo.git
cd cielo-promo

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Firebase
```

### 2. Configurar Firebase

```bash
# Login en Firebase
firebase login

# Inicializar proyecto
firebase init

# Deploy de Firestore rules
firebase deploy --only firestore:rules

# Deploy de Cloud Functions
firebase deploy --only functions
```

### 3. Ejecutar en Desarrollo

```bash
# Iniciar servidor dev
npm run dev

# Abrir http://localhost:3000
# Acceder a http://localhost:3000/register para registrarse
```

### 4. Build para Producción

```bash
# Compilar
npm run build

# Deploy
firebase deploy
```

## 📋 Flujo de Usuario

### Tendero (Store)
```
1. Registro → Código de tendero + datos
   ↓
2. Login → Email + Password
   ↓
3. Dashboard → Ver puntos y opciones
   ↓
4. Cargar Factura → 
   a) Subir foto
   b) Extraer datos manualmente
   c) Confirmar
   ↓
5. Ver Historial → Facturas cargadas
   ↓
6. Canjear Premios → Con puntos acumulados (Fase 2)
```

## 🔐 Seguridad

- ✅ Firebase Authentication (Email/Password)
- ✅ Firestore Rules (Role-based access)
- ✅ Storage Rules (User-specific buckets)
- ✅ Cloud Functions (Server-side validation)
- ✅ TypeScript (Type safety)

## 📊 Base de Datos

### Collections

```
invoices/
├─ id
├─ storeId
├─ countryId
├─ imageUrl
├─ totalAmount
├─ totalPoints
├─ status: pending|approved|rejected
└─ timestamps

ocrTrainingData/  (NEW)
├─ id
├─ invoiceId
├─ storeId
├─ countryId
├─ imageUrl
├─ manualEntries[]
├─ ocrSuggestions{} (Fase 2)
├─ validated: boolean
├─ validator: manual|ocr|ml
└─ timestamps
```

## 📈 Métricas Key

- **Upload time:** < 5 segundos
- **OCR extraction:** 2-5 minutos (manual)
- **Database queries:** < 200ms
- **Page load:** < 3 segundos

## 🧪 Testing

### Testing Manual

```bash
# Registrar nuevo tendero
Email: test@tendero.com
Código: TEND001 (pre-cargado)
Teléfono: +573012345678
País: Colombia

# Login
Email: test@tendero.com
Password: [tu contraseña]

# Cargar factura
1. Ir a "Cargar Factura"
2. Subir foto
3. Llenar datos OCR
4. Submit

# Verificar en Firestore
invoices/ → documento creado
ocrTrainingData/ → datos de entrenamiento guardados
```

### Testing Automatizado

```bash
# En desarrollo
npm run test

# Con cobertura
npm run test:coverage
```

## 🐛 Debugging

### Logs
```bash
# Ver Cloud Function logs
firebase functions:log

# Ver errores en console
console.error("Mensaje", error)

# Debugger de VS Code
.vscode/launch.json configurado
```

### Problemas Comunes

**Q: Error "Código de tendero no válido"**
A: Asegurar que el código está en colección `tenderos_validos`

**Q: Error "Imagen no sube"**
A: Verificar Storage rules y que el usuario esté autenticado

**Q: Firestore rules error**
A: Ejecutar `firebase deploy --only firestore:rules`

## 📚 Documentación Completa

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Guía técnica
- [FIRESTORE_OCR_STRUCTURE.md](./FIRESTORE_OCR_STRUCTURE.md) - Estructura de datos
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Checklist de deployment
- [RESUMEN_FASE1.md](./RESUMEN_FASE1.md) - Resumen ejecutivo

## 🗺️ Roadmap

### Phase 1 (ACTUAL) ✅
- [x] Autenticación
- [x] Upload de facturas
- [x] OCR Manual
- [x] Historial
- [x] Compilación exitosa

### Phase 2 (4-5 semanas)
- [ ] Google Vision API
- [ ] ML Training
- [ ] Admin Dashboard
- [ ] Reward System

### Phase 3 (6+ semanas)
- [ ] Email Notifications
- [ ] WhatsApp Integration
- [ ] Analytics
- [ ] Advanced Reporting

## 👥 Equipo

- **Frontend:** Next.js TypeScript
- **Backend:** Firebase + Cloud Functions
- **DevOps:** GitHub + Firebase Hosting
- **QA:** Manual testing + Firebase Emulator

## 📞 Soporte

- **Documentación:** Ver carpeta raíz
- **Issues:** GitHub Issues
- **Email:** [contact-email]
- **Firebase Docs:** https://firebase.google.com/docs

## 📄 Licencia

Privado - Solo para uso interno de Cielo

## 🎉 Conclusión

Phase 1 está completamente funcional y deployable en producción.

El sistema está listo para:
- ✅ Registrar tenderos
- ✅ Cargar facturas
- ✅ Extraer datos manualmente
- ✅ Acumular dataset para ML

No hay bloqueos técnicos. Listo para ir a producción.

---

**Versión:** 1.0.0  
**Última actualización:** Febrero 3, 2026  
**Estado:** ✅ PRODUCTION READY  
**Build:** Exitoso (23.5s)

