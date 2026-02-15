'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import statisticsService from '@/services/statisticsService';

interface CountrySalesStats {
  totalSales: number;
  totalInvoices: number;
  averageSale: number;
  topStores: Array<{ storeId: string; storeName: string; sales: number; invoices: number }>;
}

export default function AdminCountrySalesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<CountrySalesStats | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && user?.role !== 'ADMIN_COUNTRY') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingData(true);
        const countryStats = await statisticsService.getCountrySalesStatistics(user?.countryId || '', period);
        setStats(countryStats);
      } catch (error) {
        console.error('Error loading sales stats:', error);
      } finally {
        setLoadingData(false);
      }
    };
    if (user?.countryId) {
      loadStats();
    }
  }, [user?.countryId, period]);

  if (loading || loadingData) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">🔄 Cargando...</div></div>;
  }

  if (!stats) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">❌ Error cargando estadísticas</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">💰 Ventas del País</h1>
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600'
                }`}
              >
                {p === 'week' ? '📅 Semana' : p === 'month' ? '📊 Mes' : '📈 Año'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total de Ventas</div>
            <div className="text-4xl font-bold text-green-600">${stats.totalSales.toFixed(2)}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Promedio por Venta</div>
            <div className="text-4xl font-bold text-blue-600">${stats.averageSale.toFixed(2)}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total de Facturas</div>
            <div className="text-4xl font-bold text-purple-600">{stats.totalInvoices}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🏪 Tiendas Principales</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Tienda</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Ventas</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Facturas</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {stats.topStores.map((store, idx) => (
                <tr key={store.storeId} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{store.storeName}</td>
                  <td className="px-6 py-4 text-green-600 font-bold">${store.sales.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{store.invoices}</td>
                  <td className="px-6 py-4 text-blue-600 font-bold">${(store.sales / store.invoices).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
