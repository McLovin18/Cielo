'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { User } from '@/types';

// Helper para convertir Timestamp a Date
const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export default function DistributorsPage() {
  useRequireAuth(['ADMIN_COUNTRY']);
  const { currentUser } = useAuth();
  const [distributors, setDistributors] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistributor, setSelectedDistributor] = useState<(User & { uid: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadDistributors();
    }
  }, [currentUser]);

  const loadDistributors = async () => {
    try {
      setLoading(true);
      const distributorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'DISTRIBUTOR'),
        where('countryId', '==', currentUser?.countryId)
      );
      const snapshot = await getDocs(distributorsQuery);
      const distributorsList = snapshot.docs.map((doc) => ({
        ...doc.data() as User,
        uid: doc.id,
      }));
      setDistributors(distributorsList);
    } catch (error) {
      console.error('Error cargando distribuidores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Distribuidores</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona los distribuidores de tu país</p>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-lg font-semibold">
            Total: {distributors.length}
          </div>
        </div>

        {/* Distributors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Cargando distribuidores...</p>
            </div>
          ) : distributors.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No hay distribuidores asignados</p>
            </div>
          ) : (
            distributors.map((distributor) => (
              <div key={distributor.uid} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-2xl">
                    🚚
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDistributor(distributor);
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {distributor.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-3">
                  {distributor.email}
                </p>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Miembro desde {toDate(distributor.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedDistributor && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedDistributor.name}
            </h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedDistributor.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedDistributor.phone || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">País</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedDistributor.countryId}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
