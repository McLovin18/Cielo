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

export default function StoresPage() {
  useRequireAuth(['ADMIN_COUNTRY']);
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<(User & { uid: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadStores();
    }
  }, [currentUser]);

  const loadStores = async () => {
    try {
      setLoading(true);
      const storesQuery = query(
        collection(db, 'users'),
        where('role', '==', 'STORE'),
        where('countryId', '==', currentUser?.countryId)
      );
      const snapshot = await getDocs(storesQuery);
      const storesList = snapshot.docs.map((doc) => ({
        ...doc.data() as User,
        uid: doc.id,
      }));
      setStores(storesList);
    } catch (error) {
      console.error('Error cargando tenderos:', error);
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Tenderos</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona los tenderos de tu país</p>
          </div>
          <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 rounded-lg font-semibold">
            Total: {stores.length}
          </div>
        </div>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Cargando tenderos...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">No hay tenderos registrados</p>
            </div>
          ) : (
            stores.map((store) => (
              <div key={store.uid} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                    🏪
                  </div>
                  <button
                    onClick={() => {
                      setSelectedStore(store);
                      setIsModalOpen(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Ver
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {store.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-3">
                  {store.email}
                </p>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Registrado {toDate(store.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && selectedStore && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {selectedStore.name}
            </h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedStore.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedStore.phone || 'No especificado'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dirección</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedStore.address || 'No especificada'}
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
