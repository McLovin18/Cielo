'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

interface RewardStock {
  id: string;
  rewardId: string;
  rewardName: string;
  quantity: number;
  available: number;
  reserved: number;
}

interface RewardClaim {
  id: string;
  storeId: string;
  storeName: string;
  rewardId: string;
  rewardName: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered';
  claimedAt: Date;
}

export default function DistributorRewardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stocks, setStocks] = useState<RewardStock[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tab, setTab] = useState<'stock' | 'claims'>('stock');

  useEffect(() => {
    if (!loading && user?.role !== 'DISTRIBUTOR') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const countryId = user?.countryId || '';

        // Cargar stock de premios
        const stockSnap = await getDocs(query(
          collection(db, 'distributorRewardStock'),
          where('countryId', '==', countryId),
          where('distributorId', '==', user?.uid || '')
        ));
        const stockData: RewardStock[] = stockSnap.docs.map(d => ({
          id: d.id,
          rewardId: d.data().rewardId,
          rewardName: d.data().rewardName,
          quantity: d.data().quantity || 0,
          available: d.data().available || 0,
          reserved: d.data().reserved || 0,
        }));
        setStocks(stockData);

        // Cargar reclamos asignados
        const claimsSnap = await getDocs(query(
          collection(db, 'rewardClaims'),
          where('countryId', '==', countryId),
          where('status', 'in', ['assigned', 'in_transit', 'delivered'])
        ));
        const claimsData: RewardClaim[] = claimsSnap.docs.map(d => ({
          id: d.id,
          storeId: d.data().storeId,
          storeName: d.data().storeName,
          rewardId: d.data().rewardId,
          rewardName: d.data().rewardName,
          status: d.data().status,
          claimedAt: d.data().claimedAt?.toDate?.() || new Date(),
        }));
        setClaims(claimsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (user?.countryId && user?.uid) {
      loadData();
    }
  }, [user?.countryId, user?.uid]);

  const handleUpdateStatus = async (claimId: string, newStatus: 'in_transit' | 'delivered') => {
    try {
      await updateDoc(doc(db, 'rewardClaims', claimId), {
        status: newStatus,
        updatedAt: new Date(),
      });

      setClaims(claims.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error('Error updating claim:', error);
    }
  };

  if (loading || loadingData) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">🔄 Cargando...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">🎁 Gestión de Premios</h1>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setTab('stock')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              tab === 'stock'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600'
            }`}
          >
            📦 Stock de Premios
          </button>
          <button
            onClick={() => setTab('claims')}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              tab === 'claims'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600'
            }`}
          >
            📋 Reclamos Asignados
          </button>
        </div>

        {tab === 'stock' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Premio</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Total</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Disponible</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Reservado</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((stock, idx) => (
                  <tr key={stock.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{stock.rewardName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{stock.quantity}</td>
                    <td className="px-6 py-4 text-green-600 font-bold">{stock.available}</td>
                    <td className="px-6 py-4 text-yellow-600 font-bold">{stock.reserved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stocks.length === 0 && (
              <div className="p-6 text-center text-gray-600 dark:text-gray-400">
                No hay stock de premios asignado
              </div>
            )}
          </div>
        )}

        {tab === 'claims' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Tienda</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Premio</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Estado</th>
                  <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim, idx) => (
                  <tr key={claim.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{claim.storeName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{claim.rewardName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        claim.status === 'assigned' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                        claim.status === 'in_transit' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                        'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      }`}>
                        {claim.status === 'assigned' ? '📦 Asignado' :
                         claim.status === 'in_transit' ? '🚚 En Tránsito' :
                         '✅ Entregado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {claim.status === 'assigned' && (
                        <button
                          onClick={() => handleUpdateStatus(claim.id, 'in_transit')}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm font-bold"
                        >
                          🚚 Entregar
                        </button>
                      )}
                      {claim.status === 'in_transit' && (
                        <button
                          onClick={() => handleUpdateStatus(claim.id, 'delivered')}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 text-sm font-bold"
                        >
                          ✅ Completar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claims.length === 0 && (
              <div className="p-6 text-center text-gray-600 dark:text-gray-400">
                No hay reclamos asignados
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
