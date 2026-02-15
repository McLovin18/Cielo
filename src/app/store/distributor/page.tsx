'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db } from '@/lib/firebase';
import { User, Distributor } from '@/types';
import { authService } from '@/services/authService';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OtherDistributor {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export default function DistributorPage() {
  const { user: currentUser } = useAuth();
  useRequireAuth(['STORE']);

  const [distributor, setDistributor] = useState<User | null>(null);
  const [otherDistributors, setOtherDistributors] = useState<OtherDistributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changingTo, setChangingTo] = useState<string | null>(null);

  useEffect(() => {
    // Wait for currentUser to be fully initialized
    if (!currentUser) {
      return;
    }

    if (!currentUser?.distributorId) {
      setError('No tienes un distribuidor asignado');
      setLoading(false);
      return;
    }

    const loadDistributorData = async () => {
      try {
        // Clear error before attempting to load fresh data
        setError(null);
        
        const distributorId = currentUser.distributorId!;
        let distributorDoc = null;

        // Estrategia 1: Si parece un UID de Firebase, intentar buscar directo
        if (distributorId.length > 20 && /^[a-zA-Z0-9]+$/.test(distributorId)) {
          console.log(`📍 Intentando buscar como UID de Firebase`);
          try {
            distributorDoc = await getDoc(doc(db, 'users', distributorId));
            if (!distributorDoc.exists()) {
              distributorDoc = null;
            }
          } catch (e) {
            console.log(`⚠️  No encontrado como UID, intentando query...`);
            distributorDoc = null;
          }
        }

        // Estrategia 2: Buscar por campo distributorId (para IDs personalizados como "DIST-ECU-01")
        if (!distributorDoc || !distributorDoc.exists()) {
          console.log(`📍 Buscando por campo distributorId: ${distributorId}`);
          const distQuery = query(
            collection(db, 'users'),
            where('distributorId', '==', distributorId),
            where('role', '==', 'DISTRIBUTOR')
          );

          const snapshot = await getDocs(distQuery);
          if (!snapshot.empty) {
            distributorDoc = snapshot.docs[0];
          }
        }

        if (!distributorDoc || !distributorDoc.exists()) {
          // Only show error if this is not the initial load
          if (distributor) {
            setError('Distribuidor no encontrado');
          }
          setLoading(false);
          return;
        }

        const distributorData = distributorDoc.data() as User;
        setDistributor(distributorData);

        // Get other distributors in the same country that serve this store's city
        if (currentUser.countryId && currentUser.city) {
          const distributorsQuery = query(
            collection(db, 'distributors'),
            where('countryId', '==', currentUser.countryId),
            where('cities', 'array-contains', currentUser.city)
          );

          const distributorsSnapshot = await getDocs(distributorsQuery);
          const distributorsList: OtherDistributor[] = distributorsSnapshot.docs
            .map((doc) => {
              const data = doc.data() as Distributor;
              return {
                id: data.distributorId,
                name: data.name,
                email: data.email,
                phone: data.phone,
              };
            })
            // Filter out the current distributor
            .filter((dist) => dist.id !== currentUser.distributorId);
          setOtherDistributors(distributorsList);
        }

        setError(null);
      } catch (err) {
        console.error('Error loading distributor data:', err);
        // Only show error if NOT the initial load (when distributor is null)
        if (distributor) {
          setError('Error al actualizar los datos del distribuidor');
        }
      } finally {
        setLoading(false);
      }
    };

    loadDistributorData();
  }, [currentUser, distributor]);

  const handleChangeDistributor = async (newDistributorId: string, distributorName: string) => {
    if (!currentUser?.uid) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas cambiar a ${distributorName}?`
    );
    if (!confirmed) return;

    setChangingTo(newDistributorId);
    try {
      await authService.changeDistributor(currentUser.uid, newDistributorId);
      setError(null);
      // Reload page or update state
      window.location.reload();
    } catch (err) {
      console.error('Error changing distributor:', err);
      setError('Error al cambiar el distribuidor. Intenta de nuevo.');
      setChangingTo(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando información del distribuidor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/store/dashboard"
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            ← Volver al panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mi Distribuidor</h1>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {distributor && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{distributor.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white break-all">
                  {distributor.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Teléfono</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {distributor.phone || 'No especificado'}
                </p>
              </div>

              {distributor.city && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ciudad</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{distributor.city}</p>
                </div>
              )}

              {distributor.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{distributor.address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other Distributors in the same country that serve this city */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Otros Distribuidores en {currentUser?.city || 'tu ciudad'}
          </h2>

          {otherDistributors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherDistributors.map((dist) => (
                <div key={dist.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {dist.name}
                  </h3>

                  <div className="space-y-3 text-sm flex-grow">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white break-all font-medium">{dist.email}</p>
                    </div>

                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Teléfono</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {dist.phone || 'No especificado'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleChangeDistributor(dist.id, dist.name)}
                    disabled={changingTo === dist.id}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition"
                  >
                    {changingTo === dist.id ? 'Cambiando...' : 'Cambiar a este distribuidor'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                No hay otros distribuidores disponibles en {currentUser?.city} en este momento
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
