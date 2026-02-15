'use client';

import React, { useState } from 'react';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();

  // Si ya está autenticado, redirigir al dashboard
  React.useEffect(() => {
    if (!authLoading && currentUser) {
      // Redirigir según el rol
      const roleRoutes: Record<string, string> = {
        'SUPER_ADMIN': '/super-admin/dashboard',
        'ADMIN_COUNTRY': '/admin/dashboard',
        'DISTRIBUTOR': '/distributor/dashboard',
        'STORE': '/store/dashboard',
      };
      const targetRoute = roleRoutes[currentUser.role] || '/';
      console.log(`🔄 Usuario autenticado: ${currentUser.email} (${currentUser.role}) → ${targetRoute}`);
      router.push(targetRoute);
    }
  }, [currentUser, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { userId } = await authService.login(email, password);
      // El AuthContext se actualizará automáticamente
      console.log('Logged in:', userId);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Cielo Promo</h1>
          <p className="text-gray-600">Agua Cielo - Programa de Promoción</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-gray-200 pt-4">
          <p className="text-gray-600 text-sm mb-4">
            ¿No tienes cuenta? <Link href="/register" className="text-blue-600 hover:underline font-medium">Regístrate aquí</Link>
          </p>
          <p className="text-gray-500 text-xs">
            Para pruebas: admin@test.com / password123
          </p>
        </div>
      </div>
    </div>
  );
}
