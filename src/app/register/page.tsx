'use client';

import React, { useState } from 'react';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

type UserType = 'tendero' | 'other' | null;
type Step = 1 | 2 | 3;

export default function RegisterPage() {
  const [userType, setUserType] = useState<UserType>(null);
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({
    storeCode: '',
    email: '',
    phone: '',
    countryId: '',
    password: '',
    confirmPassword: '',
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();

  // Si ya está autenticado, redirigir según rol
  React.useEffect(() => {
    if (!authLoading && currentUser) {
      const roleRoutes: Record<string, string> = {
        'SUPER_ADMIN': '/super-admin/dashboard',
        'ADMIN_COUNTRY': '/admin/dashboard',
        'DISTRIBUTOR': '/distributor/dashboard',
        'STORE': '/store/dashboard',
      };
      const targetRoute = roleRoutes[currentUser.role] || '/store/dashboard';
      console.log(`🔄 Usuario autenticado en registro: ${currentUser.email} (${currentUser.role}) → ${targetRoute}`);
      router.push(targetRoute);
    }
  }, [currentUser, authLoading, router]);

  // PASO 1: Seleccionar tipo de usuario
  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    setStep(2);
    setErrors({});
  };

  // PASO 2: Validar datos básicos
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (userType === 'tendero' && !formData.storeCode.trim()) {
      newErrors.storeCode = 'El código de tendero es requerido';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\d{7,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'El teléfono debe tener al menos 7 dígitos';
    }

    if (!formData.countryId) {
      newErrors.countryId = 'Debes seleccionar un país';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // PASO 3: Validar email y contraseña
  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }
    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep2 = () => {
    if (validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);
    try {
      if (userType === 'tendero') {
        // Registrar como tendero con código
        await authService.registerStore(
          formData.email,
          formData.password,
          formData.storeCode,
          formData.phone,
          formData.countryId,
          formData.name
        );
      } else {
        // Registrar como admin/distribuidor (sin código)
        await authService.registerUserWithoutCode(
          formData.email,
          formData.password,
          formData.phone,
          formData.countryId,
          formData.name
        );
      }

      setSuccessMessage('¡Registro exitoso! Redirigiendo...');
      setTimeout(() => {
        router.push(userType === 'tendero' ? '/store/dashboard' : '/admin/dashboard');
      }, 2000);
    } catch (error: any) {
      let errorMessage = error.message || 'Error al registrarse';
      let isAdminError = false;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El email no es válido';
      } else if (error.code === 'NO_ADMIN_IN_COUNTRY') {
        isAdminError = true;
        errorMessage = error.message;
      }
      
      setErrors({ submit: isAdminError ? `[ADMIN_ERROR]${errorMessage}` : errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Limpiar error al escribir
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const countries = [
    { id: 'CO', name: 'Colombia', code: 'COL' },
    { id: 'PE', name: 'Perú', code: 'PER' },
    { id: 'EC', name: 'Ecuador', code: 'ECU' },
    { id: 'VE', name: 'Venezuela', code: 'VEN' },
    { id: 'CL', name: 'Chile', code: 'CHL' },
    { id: 'AR', name: 'Argentina', code: 'ARG' },
    { id: 'BR', name: 'Brasil', code: 'BRA' },
    { id: 'MX', name: 'México', code: 'MEX' },
    { id: 'GT', name: 'Guatemala', code: 'GTM' },
    { id: 'PA', name: 'Panamá', code: 'PAN' },
    { id: 'BO', name: 'Bolivia', code: 'BOL' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* PASO 1: Seleccionar tipo */}
        {step === 1 && !userType && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                ☁️ Cielo
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                ¿Cómo te registrarás?
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleSelectUserType('tendero')}
                className="w-full p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-600 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition text-left"
              >
                <div className="text-2xl mb-2">🏪</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Soy Tendero</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tengo un código válido de tendero
                </p>
              </button>

              <button
                onClick={() => handleSelectUserType('other')}
                className="w-full p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-green-600 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition text-left"
              >
                <div className="text-2xl mb-2">👔</div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">No soy Tendero</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Soy distribuidor o administrador
                </p>
              </button>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* PASO 2: Datos básicos */}
        {step === 2 && userType && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="mb-8">
              <button
                onClick={() => {
                  setUserType(null);
                  setStep(1);
                  setErrors({});
                }}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                ← Atrás
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Información básica
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Paso 2 de 3
              </p>
            </div>

            <form className="space-y-4">
              {/* Código de tendero - solo para tenderos */}
              {userType === 'tendero' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏪 Código de Tendero
                  </label>
                  <input
                    type="text"
                    name="storeCode"
                    value={formData.storeCode}
                    onChange={handleChange}
                    placeholder="Ej: ECU-TEN-0001"
                    className={`w-full px-4 py-2 border rounded-lg font-mono uppercase ${
                      errors.storeCode
                        ? 'border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                  />
                  {errors.storeCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.storeCode}</p>
                  )}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Ej: +57 3001234567"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* País */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  País
                </label>
                <select
                  name="countryId"
                  value={formData.countryId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.countryId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                >
                  <option value="">Selecciona un país</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.code.toLowerCase()}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {errors.countryId && <p className="text-red-500 text-sm mt-1">{errors.countryId}</p>}
              </div>

              <button
                type="button"
                onClick={handleNextStep2}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                Siguiente →
              </button>
            </form>
          </div>
        )}

        {/* PASO 3: Email y Contraseña */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
            <div className="mb-8">
              <button
                onClick={() => setStep(2)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
              >
                ← Atrás
              </button>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Credenciales
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Paso 3 de 3 - ¡Casi listo!
              </p>
            </div>

            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
                {successMessage}
              </div>
            )}

            {errors.submit && (
              <div className={`mb-4 p-4 rounded-lg border-l-4 ${
                errors.submit.startsWith('[ADMIN_ERROR]')
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-400'
              }`}>
                {errors.submit.startsWith('[ADMIN_ERROR]') ? (
                  <div className="space-y-2">
                    <div className="font-semibold flex items-center gap-2">
                      <span>⚠️ Admin del País Requerido</span>
                    </div>
                    <p className="text-sm">
                      {errors.submit.replace('[ADMIN_ERROR]', '')}
                    </p>
                    <p className="text-xs opacity-75 mt-2">
                      💡 El admin de país es el corazón del sistema. Sin admin, nadie puede registrarse.
                    </p>
                  </div>
                ) : (
                  errors.submit
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  className={`w-full px-4 py-2 border rounded-lg ${
                    errors.confirmPassword
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {loading ? 'Registrando...' : '✓ Registrarse'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
