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
  useRequireAuth(['DISTRIBUTOR']);
  const { currentUser } = useAuth();
  const [stores, setStores] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadStores();
    }
  }, [currentUser]);

  const loadStores = async () => {
    try {
      setLoading(true);
      // Los tenderos asignados a un distribuidor se cargan desde la colección de stores
      const storesQuery = query(
        collection(db, 'stores'),
        where('distributorId', '==', currentUser?.uid)
      );
      const snapshot = await getDocs(storesQuery);
      
      // Obtener los datos de usuario asociados
      const storesData = await Promise.all(
        snapshot.docs.map(async (storeDoc) => {
          const userData = await getDocs(
            query(collection(db, 'users'), where('uid', '==', storeDoc.data().userId))
          );
          return {
            ...storeDoc.data(),
            uid: storeDoc.id,
            userData: userData.docs[0]?.data(),
          };
        })
      );
      
      setStores(storesData as any);
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
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Tenderos Asignados</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona los tenderos bajo tu distribución</p>
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
            <div className="col-span-full text-center py-8 bg-white dark:bg-gray-900 rounded-xl">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-lg">No tienes tenderos asignados aún</p>
            </div>
          ) : (
            stores.map((store) => (
              <div key={store.uid} className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-2xl">
                    🏪
                  </div>
                  <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Activo
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  {store.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-all mb-3">
                  {store.email}
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Teléfono:</span> {store.phone || 'N/A'}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-semibold">Dirección:</span> {store.address?.substring(0, 30) || 'N/A'}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Registrado {toDate(store.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
