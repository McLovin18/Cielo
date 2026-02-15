'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import statisticsService from '@/services/statisticsService';

interface DeliveryStats {
  totalDeliveries: number;
  pending: number;
  inTransit: number;
  delivered: number;
  averageDeliveryTime: number;
  deliveryRate: number;
}

export default function DeliveryStatsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoadingData(true);
        const deliveryStats = await statisticsService.getDeliveryStatistics();
        setStats(deliveryStats);
      } catch (error) {
        console.error('Error loading delivery stats:', error);
      } finally {
        setLoadingData(false);
      }
    };
    loadStats();
  }, []);

  if (loading || loadingData) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">🔄 Cargando...</div></div>;
  }

  if (!stats) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">❌ Error cargando estadísticas</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">📦 Estadísticas de Entregas</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Total de Entregas</div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">{stats.totalDeliveries}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Pendientes</div>
            <div className="text-4xl font-bold text-yellow-600">{stats.pending}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">En Tránsito</div>
            <div className="text-4xl font-bold text-blue-600">{stats.inTransit}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Entregadas</div>
            <div className="text-4xl font-bold text-green-600">{stats.delivered}</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tasa de Éxito</div>
            <div className="text-4xl font-bold text-green-600">{stats.deliveryRate.toFixed(1)}%</div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tiempo Promedio (días)</div>
            <div className="text-4xl font-bold text-purple-600">{stats.averageDeliveryTime.toFixed(1)}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">📊 Resumen</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Total entregas registradas</span>
              <span className="font-bold">{stats.totalDeliveries}</span>
            </div>
            <div className="flex justify-between py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Completadas con éxito</span>
              <span className="font-bold text-green-600">{stats.delivered} ({stats.deliveryRate.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Pendientes de procesarse</span>
              <span className="font-bold text-yellow-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">En proceso de entrega</span>
              <span className="font-bold text-blue-600">{stats.inTransit}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
