'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ReportsPage() {
  useRequireAuth(['DISTRIBUTOR']);

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400">Análisis de tus entregas y desempeño</p>
        </div>

        {/* Coming Soon */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reportes en Desarrollo</h2>
          <p className="text-gray-600 dark:text-gray-400">Los reportes estarán disponibles pronto. Aquí podrás ver:</p>
          <ul className="mt-6 space-y-2 text-left max-w-md mx-auto text-gray-600 dark:text-gray-400">
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Entregas realizadas
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Desempeño mensual
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Tenderos más activos
            </li>
            <li className="flex items-center gap-2">
              <span className="text-blue-600">✓</span>
              Ingresos y comisiones
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
