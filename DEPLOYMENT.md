# 🚀 Guía de Deployment

## 📋 Pre-requisitos

- Node.js 20+
- npm o yarn
- Cuenta de Firebase
- Git (opcional)

## 🔧 Paso 1: Preparar Firebase

### 1.1 Crear Proyecto en Firebase Console

1. Ve a https://console.firebase.google.com
2. Click en "Agregar proyecto"
3. Nombre: `cielo-promo`
4. Habilitar Google Analytics (opcional)
5. Click "Crear proyecto"

### 1.2 Obtener Credenciales

Proyecto > Configuración (⚙️) > Tu aplicación

```
apiKey: (ver en Firebase)
authDomain: tu-proyecto.firebaseapp.com
projectId: tu-proyecto
storageBucket: tu-proyecto.appspot.com
messagingSenderId: xxx
appId: xxx
```

### 1.3 Habilitar Servicios

En Firebase Console, ve a "Compilación":

- **Autenticación**
  - Proveedor: Email/Password
  - Click "Habilitar"

- **Firestore Database**
  - Modo: Producción
  - Ubicación: us-central1
  - Click "Crear base de datos"

- **Cloud Storage**
  - Click "Comenzar"

- **Cloud Functions**
  - (Se habilita automáticamente)

### 1.4 Configurar Firestore Rules

Firestore > Rules

Reemplaza todo con el contenido de `firestore.rules`

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... (ver firestore.rules)
  }
}
```

Click "Publicar"

## 📝 Paso 2: Configurar Variables de Entorno

### 2.1 Crear archivo `.env.local`

```bash
cp .env.local.example .env.local
```

### 2.2 Llenar con tus credenciales

Edita `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

## 🔐 Paso 3: Desplegar Cloud Functions

### 3.1 Instalar Firebase CLI

```bash
npm install -g firebase-tools
```

### 3.2 Autenticar con Firebase

```bash
firebase login
```

Esto abrirá un navegador. Autoriza tu cuenta.

### 3.3 Inicializar Firebase en el Proyecto

```bash
firebase init
```

Cuando pregunte:

```
Are you ready to proceed? (Y/n) → Y
Select features → Functions, Firestore
Use an existing project? → Selecciona tu proyecto
What language? → TypeScript
ESLint? → N (o Y si quieres)
Install dependencies? → Y
```

### 3.4 Compilar y Desplegar Functions

```bash
cd functions
npm run build

cd ..
firebase deploy --only functions
```

Espera a que termine (1-2 minutos).

## ✅ Paso 4: Crear Usuarios de Prueba

En Firebase Console > Autenticación > Usuarios

Crear usuario:
- Email: `test@example.com`
- Contraseña: `Password123`

Este usuario será un tendero cuando se registre correctamente.

## 🏃 Paso 5: Ejecutar Aplicación Localmente

```bash
# En la raíz del proyecto
npm install

npm run dev
```

Abre http://localhost:3000

## 🧪 Paso 6: Probar Flujo Completo

### 6.1 Registrar Tendero

1. http://localhost:3000/register
2. Llena:
   - Código: `TEND001`
   - Teléfono: `3001234567`
   - País: `Colombia`
   - Email: `tienda@example.com`
   - Contraseña: `Password123`
3. Click "Registrarse"
4. Debería redirigir a dashboard

### 6.2 Acceder a Dashboard

http://localhost:3000/store/dashboard

Deberías ver:
- Meta del mes
- Puntos totales
- Puntos acumulados

### 6.3 Subir Factura

1. Click en "Subir Factura"
2. Sube una imagen (cualquier imagen)
3. Agrega producto:
   - SKU: `AGUA001`
   - Nombre: `Agua Cielo 500ml`
   - Cantidad: `5`
   - Precio: `2.50`
4. Total: $12.50
5. Click "Subir Factura"

Debería ver: "✓ Factura subida exitosamente"

### 6.4 Verificar en Firestore

Firebase Console > Firestore > invoices

Deberías ver un documento nuevo con:
- Status: `approved`
- pointsEarned: `12`
- status: `approved`

## 🌐 Paso 7: Deployment a Producción

### Con Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Sigue las instrucciones.

### Con Firebase Hosting

```bash
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting,functions
```

## 📊 Verificar Deployment

### 1. Acceso a la App

Vercel: URL proporcionada por Vercel
Firebase: `https://tu-proyecto.web.app`

### 2. Verificar Functions

```bash
firebase functions:list
```

Debería mostrar las 4 funciones:
- calculateInvoicePoints
- approveInvoiceAdmin
- rejectInvoiceAdmin
- claimReward

### 3. Logs

```bash
firebase functions:log
```

## 🆘 Troubleshooting

### Error: "Firebase credentials not found"

```bash
firebase login
firebase init
```

### Error: "Cloud Function not found"

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Error: "Firestore rules rejected"

Verifica que las rules en `firestore.rules` están en Firebase Console > Firestore > Rules

### Error: ".env.local not found"

```bash
cp .env.local.example .env.local
# Edita con tus credenciales
```

## 📈 Monitoreo

### Ver Logs en Vivo

```bash
firebase functions:log --lines 50
```

### Dashboard de Firebase

Firebase Console > Funciones > Funciones:
- Invocaciones
- Errores
- Duración

## 🔒 Checklist de Seguridad

- [ ] `.env.local` no está en Git
- [ ] Firestore Rules están publicadas
- [ ] Autenticación habilitada
- [ ] Cloud Functions desplegadas
- [ ] Storage bucket configurado
- [ ] No hay datos de prueba en producción

## 📞 Soporte

- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Console](https://console.firebase.google.com)

---

¡Listo! Tu aplicación está desplegada. 🚀
