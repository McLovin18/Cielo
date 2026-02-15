'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, QueryConstraint } from 'firebase/firestore';
import { Invoice, Store } from '@/types';
import Link from 'next/link';

export default function DistributorStatisticsPage() {
  const { currentUser, loading } = useRequireAuth(['DISTRIBUTOR']);
  const [stores, setStores] = useState<(Store & { id: string; totalSales: number })[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [filterOrder, setFilterOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser?.distributorId) {
        try {
          // Fetch stores assigned to this distributor
          const storeConstraints: QueryConstraint[] = [
            where('distributorId', '==', currentUser.distributorId),
          ];
          const storesQuery = query(collection(db, 'stores'), ...storeConstraints);
          const storesSnapshot = await getDocs(storesQuery);
          const storesData = storesSnapshot.docs.map(d => ({
            ...d.data(),
            id: d.id,
            totalSales: 0,
          } as Store & { id: string; totalSales: number }));

          // Fetch invoices for these stores
          const invoiceConstraints: QueryConstraint[] = [
            where('distributorId', '==', currentUser.distributorId),
          ];
          const invoicesQuery = query(collection(db, 'invoices'), ...invoiceConstraints);
          const invoicesSnapshot = await getDocs(invoicesQuery);
          const invoicesData = invoicesSnapshot.docs.map(d => ({ ...d.data(), id: d.id } as Invoice));

          // Calculate total sales per store
          const storesWithSales = storesData.map(store => ({
            ...store,
            totalSales: invoicesData
              .filter(inv => inv.storeId === store.id)
              .reduce((sum, inv) => sum + inv.totalAmount, 0),
          }));

          setStores(storesWithSales);
          setInvoices(invoicesData);
        } catch (err) {
          console.error('Error fetching statistics:', err);
        }
      }
      setDataLoading(false);
    };

    if (!loading) {
      fetchData();
    }
  }, [currentUser, loading]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const sortedStores = [...stores].sort((a, b) =>
    filterOrder === 'desc' ? b.totalSales - a.totalSales : a.totalSales - b.totalSales
  );

  const totalRevenue = stores.reduce((sum, s) => sum + s.totalSales, 0);
  const totalInvoices = invoices.length;
  const avgSalesPerStore = stores.length > 0 ? totalRevenue / stores.length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📊 Estadísticas de Tenderos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Análisis de ventas de tus tenderos
              </p>
            </div>
            <Link
              href="/distributor/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total de Tenderos</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stores.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Ventas Totales</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              ${totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Promedio por Tendero</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              ${avgSalesPerStore.toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total de Facturas</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalInvoices}
            </p>
          </div>
        </div>

        {/* Tabla de Tenderos con Filtro */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Rendimiento de Tenderos
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterOrder('desc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterOrder === 'desc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                Mayor a Menor
              </button>
              <button
                onClick={() => setFilterOrder('asc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterOrder === 'asc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                Menor a Mayor
              </button>
            </div>
          </div>

          {sortedStores.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No tienes tenderos asignados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Tendero
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Teléfono
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Total Ventas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Nivel
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedStores.map(store => (
                    <tr
                      key={store.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {store.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {store.storeCode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {store.phone}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        ${store.totalSales.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-medium capitalize">
                          {store.level}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
