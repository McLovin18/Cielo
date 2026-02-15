'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, QueryConstraint, updateDoc, doc } from 'firebase/firestore';
import { RewardClaim } from '@/types'; // Changed Delivery to RewardClaim
import Link from 'next/link';

export default function DistributorDeliveriesPage() {
  const { currentUser, loading } = useRequireAuth(['DISTRIBUTOR']);
  const [deliveries, setDeliveries] = useState<(RewardClaim & { id: string })[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeliveries = async () => {
      // Note: We check against distributorId or uid depending on how the distributor is saved
      // In the type definition, distributor has a specific 'distributorId' (e.g., DIST-001)
      if (currentUser?.distributorId || currentUser?.uid) {
        try {
          // Use the internal ID (uid) or the business ID (distributorId)
          // The rewardService saves the user.distributorId from the store profile.
          // Depending on consistency, we might need to check both or standardize.
          // For now, let's assume the Store's distributorId field matches the Distributor's distributorId or uid.
          
          const targetId = currentUser.distributorId || currentUser.uid;
          
          const constraints: QueryConstraint[] = [
            where('distributorId', '==', targetId),
          ];
          // Changed collection to 'rewardClaims' to read directly from the source of truth
          const q = query(collection(db, 'rewardClaims'), ...constraints);
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RewardClaim & { id: string }));
          setDeliveries(data);
        } catch (err) {
          console.error('Error fetching deliveries:', err);
        }
      }
      setDataLoading(false);
    };

    if (!loading) {
      fetchDeliveries();
    }
  }, [currentUser, loading]);

  const handleStatusUpdate = async (claimId: string, newStatus: string) => {
    try {
      setUpdatingId(claimId);
      // We update the claim directly.
      await updateDoc(doc(db, 'rewardClaims', claimId), {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'delivered' && { deliveredAt: new Date() }),
      });

      // Refresh deliveries
      const targetId = currentUser?.distributorId || currentUser?.uid;
      const constraints: QueryConstraint[] = [
        where('distributorId', '==', targetId),
      ];
      const q = query(collection(db, 'rewardClaims'), ...constraints);
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as RewardClaim & { id: string }));
      setDeliveries(data);
    } catch (err) {
      console.error('Error updating delivery:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter based on RewardClaim specific statuses
  // 'in_assignment' -> New/Pending for distributor
  // 'in_transit' -> On the truck
  // 'delivered' -> Done
  const assigned = deliveries.filter(d => d.status === 'in_assignment');
  const inTransit = deliveries.filter(d => d.status === 'in_transit');
  const delivered = deliveries.filter(d => d.status === 'delivered');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📦 Gestión de Entregas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Premios pendientes de entrega a tenderos
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Pendientes de Salida</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {assigned.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">En Ruta (Camión)</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {inTransit.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Entregados Hoy</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {delivered.length}
            </p>
          </div>
        </div>

        {/* SECTION: NEW ASSIGNMENTS (Ready to Load) */}
        {assigned.length > 0 && (
          <div className="mb-8">
             <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-l-4 border-yellow-500 pl-3">
               📥 Nuevas Ordenes (Bodega)
             </h2>
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
               {assigned.map((item) => (
                 <div key={item.id} className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-750">
                    <div className="mb-2 md:mb-0">
                      <h3 className="font-bold text-lg dark:text-white">{item.rewardName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📍 Tienda: <span className="font-semibold">{item.storeName}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        ID: {item.id.substring(0,8)}... • {item.claimedAt ? new Date((item.claimedAt as any).seconds * 1000).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'in_transit')}
                      disabled={!!updatingId}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors shadow-sm"
                    >
                      {updatingId === item.id ? 'Cargando...' : '🚛 Cargar al Camión'}
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* SECTION: IN TRANSIT (Ready to Deliver) */}
        {inTransit.length > 0 && (
          <div className="mb-8">
             <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-l-4 border-blue-500 pl-3">
               🚛 En Ruta de Reparto
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {inTransit.map((item) => (
                 <div key={item.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md border-2 border-blue-100 dark:border-blue-900">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase">En Ruta</span>
                        <h3 className="font-bold text-lg mt-1 dark:text-white">{item.storeName}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">Premio: {item.rewardName}</p>
                      </div>
                      <div className="text-4xl">📦</div>
                    </div>
                    
                    <button
                      onClick={() => handleStatusUpdate(item.id, 'delivered')}
                      disabled={!!updatingId}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold text-lg shadow-md transition-transform active:scale-95"
                    >
                      {updatingId === item.id ? 'Procesando...' : '✅ Confirmar Entrega'}
                    </button>
                 </div>
               ))}
             </div>
          </div>
        )}


        {/* Empty State */}
        {assigned.length === 0 && inTransit.length === 0 && delivered.length === 0 && (
           <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
             <p className="text-gray-400 text-xl">No tienes entregas pendientes por ahora.</p>
           </div>
        )}

        {/* Entregas Pendientes */}
        {assigned.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🔗 Asignadas
            </h2>
            <div className="space-y-4">
              {assigned.map(delivery => (
                <div
                  key={delivery.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {delivery.rewardName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📍 {delivery.storeName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        🏘️ {delivery.countryId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(delivery.id, 'in_transit')}
                      disabled={updatingId === delivery.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      {updatingId === delivery.id ? 'Actualizando...' : 'Recoger Pedido'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entregas en Tránsito */}
        {inTransit.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              🚚 En Tránsito
            </h2>
            <div className="space-y-4">
              {inTransit.map(delivery => (
                <div
                  key={delivery.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {delivery.rewardName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📍 {delivery.storeName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        🏘️ {delivery.countryId}
                      </p>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(delivery.id, 'delivered')}
                      disabled={updatingId === delivery.id}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      {updatingId === delivery.id ? 'Finalizando...' : 'Entregar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entregas Completadas */}
        {delivered.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              ✓ Entregadas
            </h2>
            <div className="space-y-4">
              {delivered.map(delivery => (
                <div
                  key={delivery.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 opacity-75"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {delivery.rewardName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        📍 {delivery.storeName}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Entregado el{' '}
                        {new Date(delivery.deliveredAt || new Date()).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm">
                      Completada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {deliveries.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No tienes entregas pendientes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
