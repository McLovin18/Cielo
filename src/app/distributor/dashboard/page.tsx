'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DistributorDashboard() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== 'DISTRIBUTOR') {
      router.push('/');
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== 'DISTRIBUTOR') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Acceso denegado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🚚 Panel de Distribuidor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido, {currentUser.name}
          </p>
        </div>

        {/* Grid de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Revisión Facturas */}
          <Link href="/distributor/invoices">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer border-l-4 border-yellow-400">
              <div className="text-4xl mb-3">🧾</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Revisar Facturas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Aprobar o rechazar facturas pendientes
              </p>
            </div>
          </Link>

          {/* Entregas */}
          <Link href="/distributor/deliveries">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Entregas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Gestionar entregas de premios
              </p>
            </div>
          </Link>

          {/* Premios (Stock) */}
          <Link href="/distributor/rewards">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Premios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Controlar stock de premios
              </p>
            </div>
          </Link>

          {/* Estadística Tenderos */}
          <Link href="/distributor/statistics">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Estadísticas
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Análisis de tenderos
              </p>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            📌 Mi Información
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Nombre</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.name}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.email}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Teléfono</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentUser.phone}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
