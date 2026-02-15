'use client';

import React, { useEffect, useState } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Store } from '@/types';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import Link from 'next/link';

export default function StoreDashboard() {
  const { currentUser, loading } = useRequireAuth(['STORE']);
  const [storeData, setStoreData] = useState<Store | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (currentUser?.uid) {
        try {
          const storeRef = doc(db, 'stores', currentUser.uid);
          const storeSnap = await getDoc(storeRef);
          if (storeSnap.exists()) {
            setStoreData(storeSnap.data() as Store);
          }
        } catch (err) {
          console.error('Error fetching store data:', err);
        }
      }
      setDataLoading(false);
    };

    if (!loading) {
      fetchStoreData();
    }
  }, [currentUser, loading]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏪 Mi Tienda - Panel de Control
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bienvenido, {currentUser?.name}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Meta del Mes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              📊 Meta del Mes
            </h3>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progreso:</span>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {storeData?.pointsMonth || 0} / 1000 puntos
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((storeData?.pointsMonth || 0) / 1000 * 100, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Puntos para ganar premios</p>
          </div>

          {/* Puntos Totales */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              ⭐ Puntos Totales
            </h3>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {storeData?.pointsTotal || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Puntos acumulados</p>
          </div>

          {/* Nivel */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              🏆 Tu Nivel
            </h3>
            <div className="text-3xl font-bold mb-2">
              {storeData?.level === 'bronze' && '🥉 Bronce'}
              {storeData?.level === 'silver' && '🥈 Plata'}
              {storeData?.level === 'gold' && '🥇 Oro'}
              {storeData?.level === 'platinum' && '💎 Platino'}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Nivel actual de tu tienda</p>
          </div>
        </div>

        {/* Opciones Principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Agregar Factura */}
          <Link href="/store/uploads">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📸</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Agregar Factura
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Sube una foto de factura y gana puntos
              </p>
            </div>
          </Link>

          {/* Mis Compras */}
          <Link href="/store/sales">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Mis Compras
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Ver todas tus compras registradas
              </p>
            </div>
          </Link>

          {/* Mis Premios */}
          <Link href="/store/rewards">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition cursor-pointer">
              <div className="text-4xl mb-3">🎁</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Mis Premios
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Reclama y gestiona tus premios
              </p>
            </div>
          </Link>
        </div>

        {/* Info de Tienda */}
        {storeData && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              📌 Información de tu Tienda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Código de Tendero</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storeData.storeCode}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {currentUser?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teléfono</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storeData.phone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">País</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {storeData.countryId}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
