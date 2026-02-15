'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function ReportsPage() {
  const { currentUser } = useAuth();

  if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Acceso denegado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">📊 Reportes</h1>
          <Link href="/super-admin/dashboard" className="text-blue-600 hover:underline">
            ← Volver
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <p className="text-gray-600 dark:text-gray-400">
            Esta sección está en desarrollo. Aquí podrás ver analítica y reportes del sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
