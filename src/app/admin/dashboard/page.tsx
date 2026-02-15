'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN_COUNTRY') {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'ADMIN_COUNTRY') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Acceso denegado</p>
      </div>
    );
  }

  const countryName = currentUser.countryId || 'País desconocido';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🌍 Panel de Administrador - {countryName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido, {currentUser.name}
          </p>
        </div>

        {/* Grid de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Productos */}
          <Link href="/admin/products">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Productos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Configurar productos del país
              </p>
            </div>
          </Link>

          {/* Premios */}
          <Link href="/admin/rewards">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Premios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Modificar puntos requeridos
              </p>
            </div>
          </Link>

          {/* Ventas */}
          <Link href="/admin/sales">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Ventas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Estadísticas y tendencias
              </p>
            </div>
          </Link>

          {/* Config Entregas */}
          <Link href="/admin/delivery-config">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">🚚</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Config Entregas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Asignar distribuidores
              </p>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            📌 Información
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400">País</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {countryName}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.email}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
