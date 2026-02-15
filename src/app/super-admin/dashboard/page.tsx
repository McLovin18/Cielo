'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function SuperAdminDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Verificar que el usuario es SUPER_ADMIN
    if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No tienes permiso para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🔐 Panel de Super Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido, {currentUser.name}
          </p>
        </div>

        {/* ⚠️ Alert: Config Admin is critical */}
        <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
            ⚠️ Importante: Asigna admins de país primero. Sin ellos, no habrá tenderos en esos países.
          </p>
        </div>

        {/* Grid de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Config Admin - CORAZÓN DEL SISTEMA */}
          <Link href="/super-admin/config-admin">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer hover:scale-105">
              <div className="text-4xl mb-3">⚙️</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Config Admin
              </h3>
              <p className="text-emerald-50 text-sm font-semibold">
                💡 CORAZÓN DEL SISTEMA - Asigna admins de país
              </p>
            </div>
          </Link>

          {/* Productos */}
          <Link href="/super-admin/products">
            <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer hover:scale-105">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-xl font-bold text-white mb-2">
                Inventario Global
              </h3>
              <p className="text-orange-50 text-sm font-semibold">
                Crea productos globales y configura puntos
              </p>
            </div>
          </Link>

          {/* Usuarios */}
          <Link href="/super-admin/users">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Usuarios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Gestionar usuarios y roles
              </p>
            </div>
          </Link>

          {/* Países */}
          <Link href="/super-admin/countries">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">🌍</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Países
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Configurar países y regiones
              </p>
            </div>
          </Link>

          {/* Tenderos Válidos */}
          <Link href="/super-admin/valid-stores">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Tenderos Válidos
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ver y gestionar códigos de tendero
              </p>
            </div>
          </Link>

          {/* Reportes */}
          <Link href="/super-admin/reports">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Reportes
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ver analítica y reportes
              </p>
            </div>
          </Link>
        </div>

        {/* Información */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            📌 Información del Sistema
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.email}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Nombre</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.name}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Rol</p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Super Admin
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
