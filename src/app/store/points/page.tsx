'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface PointsData {
  current: number;
  monthly: number;
  total: number;
}

interface PointTransaction {
  id: string;
  description: string;
  points: number;
  date: any;
  type: 'credit' | 'debit';
}

export default function PointsPage() {
  useRequireAuth(['STORE']);
  const { currentUser } = useAuth();
  const [points, setPoints] = useState<PointsData>({
    current: 0,
    monthly: 0,
    total: 0,
  });
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadPoints();
    }
  }, [currentUser]);

  const loadPoints = async () => {
    try {
      setLoading(true);
      
      // Cargar documento de puntos del usuario
      const pointsRef = collection(db, 'stores', currentUser!.uid, 'points');
      const snapshot = await getDocs(pointsRef);
      
      if (!snapshot.empty) {
        const pointsData = snapshot.docs[0].data();
        setPoints({
          current: pointsData.current || 0,
          monthly: pointsData.monthly || 0,
          total: pointsData.total || 0,
        });
      }

      // Cargar transacciones
      const transactionsRef = collection(db, 'stores', currentUser!.uid, 'pointTransactions');
      const transSnapshot = await getDocs(query(transactionsRef));
      
      const transactionsList = transSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as PointTransaction)).sort((a, b) => {
        const dateA = a.date?.toDate?.() || new Date(a.date);
        const dateB = b.date?.toDate?.() || new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error cargando puntos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Mis Puntos</h1>
          <p className="text-gray-600 dark:text-gray-400">Visualiza y gestiona tus puntos acumulados</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando tus puntos...</p>
          </div>
        ) : (
          <>
        {/* Points Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Current Points */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Puntos Actuales</h3>
              <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-4xl font-bold mb-2">{points.current.toLocaleString('es-ES')}</p>
            <p className="text-blue-100">Disponibles para canjear</p>
          </div>

          {/* Monthly Points */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Puntos Este Mes</h3>
              <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-4xl font-bold mb-2">{points.monthly.toLocaleString('es-ES')}</p>
            <p className="text-green-100">Ganados este mes</p>
          </div>

          {/* Total Points */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Puntos Totales</h3>
              <svg className="w-8 h-8 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v2h16V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h12a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-4xl font-bold mb-2">{points.total.toLocaleString('es-ES')}</p>
            <p className="text-purple-100">Acumulados en total</p>
          </div>
        </div>

        {/* Points History */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Historial de Puntos</h2>
          
          {loading ? (
            <p className="text-gray-600 dark:text-gray-400">Cargando historial...</p>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400">Aún no tienes transacciones de puntos</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Sube facturas de tus compras para comenzar a acumular puntos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        transaction.type === 'credit'
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    >
                      {transaction.type === 'credit' ? '+' : '-'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {(() => {
                          const date = transaction.date?.toDate?.() || new Date(transaction.date);
                          return date.toLocaleDateString('es-ES');
                        })()}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      transaction.type === 'credit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {Math.abs(transaction.points)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversion Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zm-11-1a1 1 0 11-2 0 1 1 0 012 0zM8 7a1 1 0 000 2h6a1 1 0 000-2H8zm0 3a1 1 0 000 2h3a1 1 0 000-2H8z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Canje de Puntos</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Puedes canjear tus puntos por recompensas y productos exclusivos. 
                Visita la sección de <span className="font-semibold">Recompensas</span> para ver todas las opciones disponibles.
              </p>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
        
    </main>
  );
}
