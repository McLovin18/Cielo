# 📘 Guía Rápida de Setup - Cielo Promo

## ✅ Estado: Base Implementada

He configurado una base sólida para tu aplicación. Aquí está todo lo que necesitas hacer ahora:

## 🔧 Pasos de Configuración Inicial

### 1️⃣ Configurar Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto (si no lo has hecho)
3. Obtén tus credenciales:
   - Proyecto > Configuración > Tu app > Config

### 2️⃣ Llenar Variables de Entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales de Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 3️⃣ Habilitar Servicios en Firebase

En Firebase Console > Compilación:

- ✅ **Autenticación** (Email/Password)
- ✅ **Firestore Database** (Modo producción)
- ✅ **Cloud Storage**
- ✅ **Cloud Functions**

### 4️⃣ Configurar Firestore Security Rules

En Firebase Console > Firestore > Rules, reemplaza con el contenido de `firestore.rules`

### 5️⃣ Desplegar Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 6️⃣ Ejecutar Aplicación

```bash
npm run dev
```

La aplicación estará en `http://localhost:3000`

## 🧪 Pruebas Iniciales

### Crear Usuario de Prueba

1. Ir a http://localhost:3000/register
2. Llenar formulario:
   - Código: TENDERO001
   - Teléfono: +573001234567
   - País: Colombia
   - Email: test@example.com
   - Contraseña: Password123

### Login

http://localhost:3000/login

## 📁 Estructura del Proyecto

```
cielo-promo/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── login/
│   │   ├── register/
│   │   ├── store/        # Página del tendero
│   │   ├── admin/        # Panel admin país
│   │   ├── super-admin/  # Panel super admin
│   │   └── distributor/  # Panel distribuidor
│   ├── components/       # Componentes reutilizables
│   ├── context/          # Context API (Auth)
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Firebase config
│   ├── services/         # Servicios Firebase
│   │   ├── authService.ts
│   │   └── invoiceService.ts
│   └── types/            # TypeScript types
├── functions/            # Cloud Functions
│   ├── src/
│   │   └── index.ts      # Funciones principales
│   └── package.json
├── firestore.rules       # Reglas de seguridad
├── .env.local           # Variables de entorno
└── README.md
```

## 🔐 Funcionalidades Implementadas

### ✅ Autenticación
- [x] Login
- [x] Registro de Tendero
- [x] Protección de rutas

### ✅ Servicios
- [x] `authService` - Gestión de usuarios
- [x] `invoiceService` - CRUD de facturas

### ✅ Cloud Functions
- [x] `calculateInvoicePoints` - Cálculo automático de puntos
- [x] `approveInvoiceAdmin` - Aprobación manual
- [x] `rejectInvoiceAdmin` - Rechazo de factura
- [x] `claimReward` - Reclamo de premio

### ✅ Interfaces
- [x] Página de Registro (2 pasos)
- [x] Dashboard Tendero
- [x] Página de Subida de Facturas

## 🚀 Próximos Pasos Recomendados

### Fase 1: Validación Básica
1. [ ] Probar registro e login
2. [ ] Probar subida de facturas
3. [ ] Verificar cálculo de puntos en Firestore

### Fase 2: Dashboards Adicionales
1. [ ] Dashboard SuperAdmin (Ventas, Estadísticas)
2. [ ] Dashboard Admin País (Gestión productos, premios)
3. [ ] Dashboard Distribuidor (Entregas)

### Fase 3: Características Avanzadas
1. [ ] OCR/IA para análisis de facturas
2. [ ] Email marketing automático
3. [ ] Notificaciones WhatsApp
4. [ ] Gráficos y reportes

## 📞 Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor (3000)

# Funciones
cd functions
npm run build           # Compilar TypeScript
npm run serve           # Emuladores locales
npm run deploy          # Deploy a Firebase
npm run logs            # Ver logs

# Firebase
firebase init           # Inicializar proyecto
firebase deploy         # Deploy todo
firebase emulators:start # Emuladores
```

## 🔗 Links Útiles

- [Firebase Console](https://console.firebase.google.com)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

## 💡 Tips

- Siempre valida datos en el frontend Y en las Cloud Functions
- Usa Firestore Rules para proteger colecciones
- Registra todas las acciones en `pointTransactions` para auditoría
- Prueba localmente con emuladores antes de desplegar

## ❓ Preguntas Frecuentes

**P: ¿Dónde pongo mi database de Firebase?**
R: En `.env.local` con la variable `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

**P: ¿Cómo agrego un nuevo admin?**
R: A través de Firebase Console > Authentication > Add User, luego en Firestore crear documento en `users/{uid}` con role `ADMIN_COUNTRY`

**P: ¿Cómo despliego a producción?**
R: Ejecuta `firebase deploy` cuando todo esté listo

---

**¡Listo para empezar!** 🚀

Si necesitas ayuda, revisa los archivos:
- `IMPLEMENTATION_GUIDE.md` - Guía técnica completa
- `CLOUD_FUNCTIONS.md` - Detalles de Cloud Functions
