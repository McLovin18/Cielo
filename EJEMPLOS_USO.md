# 📖 Ejemplos de Uso - Cielo Promo v1.0

**Documento:** Ejemplos prácticos de todas las funcionalidades principales  
**Versión:** 1.0  
**Última actualización:** 2024-01-15

---

## 1️⃣ Validación de Código de Tendero

### Frontend - Validación en Tiempo Real

```typescript
// En src/app/register/page.tsx

import { authService } from '@/services/authService';
import { useState } from 'react';

export default function RegisterPage() {
  const [storeCode, setStoreCode] = useState('');
  const [codeValidation, setCodeValidation] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckCode = async (code: string) => {
    setIsChecking(true);
    try {
      const result = await authService.validateStoreCode(code);
      setCodeValidation(result);
    } catch (error) {
      setCodeValidation({
        valid: false,
        message: 'Error al validar código'
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div>
      <input
        value={storeCode}
        onChange={(e) => {
          const code = e.target.value.toUpperCase();
          setStoreCode(code);
          if (code.length >= 11) handleCheckCode(code);
        }}
        placeholder="ECU-TEN-0001"
        maxLength={20}
      />

      {isChecking && <p>🔍 Validando...</p>}
      
      {codeValidation && (
        <div>
          {codeValidation.valid ? (
            <div className="text-green-600">
              ✅ Código válido
              <p>País: {codeValidation.country}</p>
              <p>Ciudad: {codeValidation.city}</p>
            </div>
          ) : (
            <div className="text-red-600">
              ❌ {codeValidation.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 2️⃣ Registro de Tendero

### Backend - Flujo Completo

```typescript
// En src/app/register/page.tsx - handleSubmit

const handleRegisterStore = async (formData: StoreRegisterForm) => {
  try {
    // 1. Validar código (opcional, ya se hizo en tiempo real)
    const validation = await authService.validateStoreCode(formData.storeCode);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // 2. Registrar tendero
    const { userId, storeId } = await authService.registerStore(
      formData.email,
      formData.password,
      formData.storeCode,
      formData.phone,
      formData.countryId,
      formData.ownerName
    );

    console.log('✅ Tendero registrado:', { userId, storeId });
    
    // 3. Redirigir al login o dashboard
    router.push('/login');
    
  } catch (error) {
    console.error('❌ Error al registrar:', error);
    setError(error.message || 'Error al registrar');
  }
};
```

---

## 3️⃣ Login de Usuario

### Frontend - Login Universal

```typescript
// En src/app/login/page.tsx

import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);
  const router = useRouter();

  // Si ya está logueado, redirigir
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { userId } = await authService.login(email, password);
      console.log('✅ Login exitoso:', userId);
      router.push('/dashboard');
    } catch (err) {
      setError('Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-red-600">{error}</p>}
      <button disabled={loading} type="submit">
        {loading ? 'Iniciando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

---

## 4️⃣ Subir Factura

### Frontend - Invoice Upload

```typescript
// En src/app/store/uploads/page.tsx

import { invoiceService } from '@/services/invoiceService';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

interface Product {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export default function InvoiceUploadPage() {
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    sku: '',
    name: '',
    quantity: 0,
    price: 0
  });

  // 1. Subir imagen
  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('Archivo muy grande (máximo 5MB)');
      return;
    }

    try {
      const url = await invoiceService.uploadInvoiceImage(
        user!.storeId!,
        file
      );
      setImageUrl(url);
    } catch (error) {
      alert('Error al subir imagen');
    }
  };

  // 2. Agregar producto
  const handleAddProduct = () => {
    if (!newProduct.sku || !newProduct.name) {
      alert('Completa SKU y nombre');
      return;
    }
    setProducts([...products, newProduct]);
    setNewProduct({ sku: '', name: '', quantity: 0, price: 0 });
  };

  // 3. Enviar factura
  const handleSubmitInvoice = async () => {
    if (!imageUrl || products.length === 0) {
      alert('Carga imagen y agrega productos');
      return;
    }

    setIsUploading(true);
    try {
      const total = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
      
      const invoiceId = await invoiceService.createInvoice({
        storeId: user!.storeId!,
        storeName: user!.name!,
        countryId: user!.countryId!,
        imageUrl,
        products,
        totalAmount: total,
        status: 'pending'
      });

      console.log('✅ Factura creada:', invoiceId);
      alert('Factura subida exitosamente');
      // Reset
      setImageUrl('');
      setProducts([]);
    } catch (error) {
      console.error('❌ Error al subir factura:', error);
      alert('Error al subir factura');
    } finally {
      setIsUploading(false);
    }
  };

  const total = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

  return (
    <div>
      <h1>📸 Subir Factura</h1>

      {/* Input de imagen */}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
      />
      {imageUrl && <img src={imageUrl} alt="Factura" style={{ maxWidth: '200px' }} />}

      {/* Agregar productos */}
      <div>
        <h2>Productos</h2>
        <input
          placeholder="SKU"
          value={newProduct.sku}
          onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
        />
        <input
          placeholder="Nombre"
          value={newProduct.name}
          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Cantidad"
          value={newProduct.quantity}
          onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) })}
        />
        <input
          type="number"
          placeholder="Precio"
          value={newProduct.price}
          onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) })}
        />
        <button onClick={handleAddProduct}>+ Agregar</button>
      </div>

      {/* Tabla de productos */}
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => (
            <tr key={idx}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.quantity}</td>
              <td>${p.price.toFixed(2)}</td>
              <td>${(p.quantity * p.price).toFixed(2)}</td>
              <td>
                <button onClick={() => setProducts(products.filter((_, i) => i !== idx))}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <h3>Total: ${total.toFixed(2)}</h3>

      {/* Submit */}
      <button 
        onClick={handleSubmitInvoice} 
        disabled={isUploading}
      >
        {isUploading ? 'Enviando...' : 'Enviar Factura'}
      </button>
    </div>
  );
}
```

---

## 5️⃣ Ver Dashboard de Tendero

### Frontend - Store Dashboard

```typescript
// En src/app/store/dashboard/page.tsx

import { useAuth } from '@/context/AuthContext';
import { invoiceService } from '@/services/invoiceService';
import { useEffect, useState } from 'react';

export default function StoreDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.storeId) return;

    const loadData = async () => {
      try {
        // 1. Obtener estadísticas
        const storeStats = await invoiceService.getInvoiceStats(user.storeId);
        setStats(storeStats);

        // 2. Obtener facturas del tendero
        const storeInvoices = await invoiceService.getStoreInvoices(user.storeId);
        setInvoices(storeInvoices);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.storeId]);

  if (loading) return <p>⏳ Cargando...</p>;

  return (
    <div>
      <h1>📊 Dashboard - {user?.name}</h1>

      {/* Estadísticas */}
      <div className="stats">
        <div className="stat-card">
          <h3>Puntos Totales</h3>
          <p className="number">{stats?.totalPoints || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Puntos Este Mes</h3>
          <p className="number">{user?.pointsMonth || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Facturas</h3>
          <p className="number">{stats?.totalInvoices || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Nivel</h3>
          <p className="number">{user?.level || 'bronze'}</p>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="actions">
        <button onClick={() => router.push('/store/uploads')}>
          📤 Subir Factura
        </button>
        <button onClick={() => router.push('/store/rewards')}>
          🎁 Ver Premios
        </button>
        <button onClick={() => router.push('/store/invoices')}>
          📋 Mis Facturas
        </button>
      </div>

      {/* Últimas Facturas */}
      <h2>Últimas Facturas</h2>
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Monto</th>
            <th>Puntos</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {invoices.slice(0, 5).map((inv) => (
            <tr key={inv.id}>
              <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
              <td>${inv.totalAmount.toFixed(2)}</td>
              <td>{inv.totalPoints}</td>
              <td>
                <span className={`status ${inv.status}`}>
                  {inv.status === 'approved' && '✅ Aprobada'}
                  {inv.status === 'pending' && '⏳ Pendiente'}
                  {inv.status === 'rejected' && '❌ Rechazada'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 6️⃣ Crear Admin de País (SUPER_ADMIN)

### Backend - Registro de Admin

```typescript
// Llamado por SUPER_ADMIN

const handleCreateCountryAdmin = async (adminData: {
  email: string;
  password: string;
  name: string;
  phone: string;
  countryId: string;
}) => {
  try {
    const { userId } = await authService.registerCountryAdmin(
      adminData.email,
      adminData.password,
      adminData.name,
      adminData.phone,
      adminData.countryId
    );

    console.log('✅ Admin de país creado:', {
      userId,
      country: adminData.countryId
    });

    // Enviar email de bienvenida (implementar después)
    // await sendWelcomeEmail(adminData.email);

    alert('Admin de país creado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    alert(error.message);
  }
};
```

---

## 7️⃣ Crear Distribuidor (ADMIN_COUNTRY)

### Backend - Registro de Distribuidor

```typescript
// Llamado por ADMIN_COUNTRY

const handleCreateDistributor = async (distData: {
  email: string;
  password: string;
  name: string;
  phone: string;
  regions: string[]; // Array de ciudades
}) => {
  try {
    const { userId } = await authService.registerDistributor(
      distData.email,
      distData.password,
      distData.name,
      distData.phone,
      user!.countryId!, // Usa el país del ADMIN_COUNTRY
      distData.regions
    );

    console.log('✅ Distribuidor creado:', {
      userId,
      regions: distData.regions
    });

    alert('Distribuidor creado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
    alert(error.message);
  }
};
```

---

## 8️⃣ Cargar Tenderos Válidos (Setup)

### Terminal

```bash
# 1. Verificar que serviceAccountKey.json existe
ls serviceAccountKey.json
# serviceAccountKey.json

# 2. Ejecutar script de carga
npm run load-tenderos

# 3. Salida esperada:
# 📦 Iniciando carga de tenderos válidos...
# Total: 40 registros
# ✅ Cargados 40 registros...
# ✅ ¡Carga completada! 40 tenderos registrados en Firestore.
```

---

## 9️⃣ Desplegar a Producción

### Terminal - Deployment Completo

```bash
# 1. Compilar frontend
npm run build

# 2. Desplegar Firestore Rules
firebase deploy --only firestore:rules
# ✓ firestore: rules have been successfully published.

# 3. Desplegar Cloud Functions
firebase deploy --only functions
# ✓ functions: Finished running predeploy tasks.
# ✓ functions[calculateInvoicePoints]: Successful.
# ✓ functions[approveInvoiceAdmin]: Successful.
# ✓ functions[rejectInvoiceAdmin]: Successful.
# ✓ functions[claimReward]: Successful.

# 4. Desplegar frontend (Vercel)
vercel deploy --prod
# ✓ Production: Ready! [URL]
```

---

## 🔟 Testing Manual

### Paso 1: Validar Código
```
1. Ir a /register
2. Escribir: ECU-TEN-0001
3. Ver: "✅ Código válido - Ecuador - Quito"
```

### Paso 2: Registrar Tendero
```
1. Email: tendero@example.com
2. Contraseña: Test123456
3. Código: ECU-TEN-0001
4. Teléfono: +593987654321
5. Propietario: Juan Pérez
6. Click: "Registrar"
7. Ver: Redirige a login
```

### Paso 3: Login
```
1. Email: tendero@example.com
2. Contraseña: Test123456
3. Click: "Iniciar Sesión"
4. Ver: Dashboard del tendero
```

### Paso 4: Subir Factura
```
1. Click: "📤 Subir Factura"
2. Subir imagen (< 5MB)
3. Agregar producto: SKU=AGUA-20L, Cant=10, Precio=2.50
4. Click: "Enviar Factura"
5. Ver: Factura en Firestore
```

---

## 📞 Referencia Rápida

### URLs Locales
```
Frontend:    http://localhost:3000
Firestore:   https://console.firebase.google.com
```

### Endpoints Clave
```
POST   /api/auth/register      → authService.registerStore()
POST   /api/auth/login         → authService.login()
POST   /api/invoices           → invoiceService.createInvoice()
GET    /api/invoices/{id}      → invoiceService.getInvoice()
POST   /api/rewards/claim      → Cloud Function: claimReward
```

### Variables de Entorno
```env
NEXT_PUBLIC_FIREBASE_API_KEY=[tu-api-key]
NEXT_PUBLIC_FIREBASE_PROJECT_ID=[tu-project-id]
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=[tu-auth-domain]
```

---

**Última actualización:** 2024-01-15  
**Versión:** 1.0  
**Estado:** ✅ Completo
