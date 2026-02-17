'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
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
  const [distributorNames, setDistributorNames] = useState<Record<string, string>>({});
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

      // 1. Obtener stores
      const storesQuery = query(
        collection(db, 'users'),
        where('role', '==', 'STORE'),
        where('countryId', '==', currentUser?.countryId)
      );
      const snapshot = await getDocs(storesQuery);
      
      // Filtrar usuarios que tienen rol STORE pero NO tienen storeCode (posibles distribuidores mal registrados)
      const storesList = snapshot.docs
        .map((doc) => ({
          ...doc.data() as User,
          uid: doc.id,
        }))
        .filter((store) => store.storeCode); // Solo mostrar si tiene código de tienda

      setStores(storesList);

      // 2. Obtener nombres de distribuidores
      const distributorIds = [...new Set(storesList.map(s => s.distributorId).filter(Boolean))];
      
      if (distributorIds.length > 0) {
        // Opción segura: traer todos los distribuidores del país y mapear
        // (Evita límites de 'in' query y múltiples lecturas)
        const distQuery = query(
          collection(db, 'users'),
          where('role', '==', 'DISTRIBUTOR'),
          where('countryId', '==', currentUser?.countryId)
        );
        const distSnapshot = await getDocs(distQuery);
        
        const namesMap: Record<string, string> = {};
        distSnapshot.forEach(doc => {
          const data = doc.data();
          const displayName = data.distributorId 
            ? `${data.name} - ${data.distributorId}`
            : data.name;

          // Mapear por ID de documento (por si acaso)
          namesMap[doc.id] = displayName;
          // Mapear por campo custom 'distributorId' (ej: DIST-ECU-02) - ESTO ES LO CRÍTICO
          if (data.distributorId) {
            namesMap[data.distributorId] = displayName;
          }
        });
        setDistributorNames(namesMap);
      }

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
                
                {/* Distribuidor Asignado */}
                {store.distributorId && (
                  <div className="mb-3 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg inline-block">
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                      🚚 {distributorNames[store.distributorId] || 'Cargando...'}
                    </p>
                  </div>
                )}

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
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Distribuidor</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedStore.distributorId ? (distributorNames[selectedStore.distributorId] || 'Desconocido') : 'No asignado'}
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
