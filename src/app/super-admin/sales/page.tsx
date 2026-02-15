'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import statisticsService, { SalesStatistics } from '@/services/statisticsService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StoreWithSales {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
  totalSales: number;
  invoiceCount: number;
}

export default function SuperAdminSalesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [countryFilter, setCountryFilter] = useState('');
  const [statistics, setStatistics] = useState<SalesStatistics | null>(null);
  const [stores, setStores] = useState<StoreWithSales[]>([]);
  const [countries, setCountries] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Verificar que es SuperAdmin
  useEffect(() => {
    if (!loading && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  // Cargar países
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'countries'));
        const countriesList = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setCountries(countriesList);
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();
  }, []);

  // Cargar estadísticas
  useEffect(() => {
    const loadStatistics = async () => {
      try {
        setLoadingData(true);
        const stats = await statisticsService.getSalesStatisticsByPeriod(period, countryFilter);
        setStatistics(stats);

        // Cargar detalles de tiendas
        let q = query(collection(db, 'stores'));
        if (countryFilter) {
          q = query(collection(db, 'stores'), where('countryId', '==', countryFilter));
        }
        const snapshot = await getDocs(q);
        const storesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            countryId: data.countryId,
            countryName: countries.find(c => c.id === data.countryId)?.name || data.countryId,
            totalSales: data.pointsTotal || 0,
            invoiceCount: 0,
          };
        });
        setStores(storesData);
      } catch (error) {
        console.error('Error loading statistics:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadStatistics();
  }, [period, countryFilter, countries]);

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📊 Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">📊 Ventas</h1>
          <p className="text-gray-600 dark:text-gray-400">Análisis de ventas global y por país</p>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Período
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="week">📅 Esta Semana</option>
                <option value="month">📅 Este Mes</option>
                <option value="year">📅 Este Año</option>
              </select>
            </div>

            {/* País */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                País
              </label>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">🌍 Todos los países</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estadísticas resumen */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total de Ventas</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${statistics.totalSales.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 mt-2">{statistics.totalInvoices} facturas</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Venta Promedio</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${statistics.averageSale.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 mt-2">por factura</div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Top Tendero</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white truncate">
                {statistics.topStores[0]?.storeName || 'N/A'}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                ${statistics.topStores[0]?.sales.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        )}

        {/* Tabla de tenderos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">📋 Tenderos por País</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tendero</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">País</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Ventas</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {stores.length > 0 ? (
                  stores.map(store => (
                    <tr key={store.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{store.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{store.countryName}</td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900 dark:text-white">
                        ${store.totalSales.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600 dark:text-gray-400">
                        {store.invoiceCount}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      No hay datos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
