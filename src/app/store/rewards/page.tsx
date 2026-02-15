'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, QueryConstraint, updateDoc, doc } from 'firebase/firestore';
import { RewardClaim, CountryReward } from '@/types'; // Import CountryReward
import Link from 'next/link';
import rewardService from '@/services/rewardService';

export default function StoreRewardsPage() {
  const { currentUser, loading } = useRequireAuth(['STORE']);
  
  // State for Claims (Recompensas reclamadas)
  const [myClaims, setMyClaims] = useState<(RewardClaim & { id: string })[]>([]);
  
  // State for Catalog (Recompensas disponibles)
  const [catalog, setCatalog] = useState<CountryReward[]>([]);
  
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_rewards' | 'deliveries'>('catalog');
  
  // Rating states (Existing logic for rating delivered items)
  const [ratingReward, setRatingReward] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  // Estados para manejo de canje
  const [redeeming, setRedeeming] = useState<string | null>(null); // ID del premio siendo canjeado
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (currentUser?.uid && currentUser?.countryId) {
        try {
          setDataLoading(true);
          
          // 1. Cargar catálogo disponible para mi país
          const availableRewards = await rewardService.getAvailableRewards(currentUser.countryId);
          setCatalog(availableRewards);

          // 2. Cargar mis reclamos anteriores
          const claims = await rewardService.getMyClaims(currentUser.uid);
          setMyClaims(claims as (RewardClaim & { id: string })[]);
          
        } catch (err) {
          console.error('Error loading rewards data:', err);
        } finally {
          setDataLoading(false);
        }
      }
    };

    if (!loading) {
      loadData();
    }
  }, [currentUser, loading]);

  const handleRedeem = async (reward: CountryReward) => {
    if (!currentUser) return;
    
    // Validación básica de puntos (UI check)
    if ((currentUser as any).pointsTotal < reward.pointsRequired) {
      setErrorMsg(`No tienes suficientes puntos. Necesitas ${reward.pointsRequired}.`);
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    if (!confirm(`¿Estás seguro de canjear "${reward.name}" por ${reward.pointsRequired} puntos?`)) {
      return;
    }

    try {
      setRedeeming(reward.id);
      setErrorMsg(null);
      
      await rewardService.redeemReward(currentUser, reward);
      
      setSuccessMsg(`¡Genial! Has canjeado: ${reward.name}`);
      
      // Recargar datos para actualizar puntos y lista de reclamos
      const claims = await rewardService.getMyClaims(currentUser.uid);
      setMyClaims(claims as (RewardClaim & { id: string })[]);
      
      // NOTA: Idealmente actualizaríamos el contexto de usuario para reflejar los nuevos puntos inmediatamente
      // window.location.reload(); // Simple brute-force update for now strictly for demo
      
      // Cambiar a tab de mis premios
      setActiveTab('my_rewards');

    } catch (err: any) {
      console.error("Redemption error:", err);
      setErrorMsg(err.message || "Error al procesar el canje.");
    } finally {
      setRedeeming(null);
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleRateReward = async (rewardId: string) => {
    try {
      await updateDoc(doc(db, 'rewardClaims', rewardId), {
        rating: {
          score: ratingScore,
          comment: ratingComment,
          ratedAt: new Date(),
        },
      });
      setRatingReward(null);
      setRatingScore(5);
      setRatingComment('');
      // Refresh rewards
      const claims = await rewardService.getMyClaims(currentUser!.uid);
      setMyClaims(claims as (RewardClaim & { id: string })[]);
    } catch (err) {
      console.error('Error rating reward:', err);
    }
  };

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter claims logic
  const delivered = myClaims.filter(r => r.status === 'delivered');
  const available = myClaims.filter(r => (r.status as string) === 'assigned' || r.status === 'in_transit' || r.status === 'in_assignment');
  const waiting = myClaims.filter(r => (r.status as string) === 'pending');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                🎁 Centro de Recompensas
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Canjea tus puntos por premios increíbles
              </p>
            </div>
            <Link
              href="/store/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Volver al Dashboard
            </Link>
          </div>

          {/* Points Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 font-medium mb-1">Mis Puntos Disponibles</p>
                <h2 className="text-4xl font-bold">
                  {(currentUser as any).pointsTotal?.toLocaleString() || 0} pts
                </h2>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <span className="text-3xl">💎</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <strong className="font-bold">¡Éxito! </strong>
            <span className="block sm:inline">{successMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${
                activeTab === 'catalog'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🛍️ Catálogo de Premios
            </button>
            <button
              onClick={() => setActiveTab('my_rewards')}
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${
                activeTab === 'my_rewards'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              📦 Mis Canjes
            </button>
            <button
              onClick={() => setActiveTab('deliveries')}
              className={`py-4 px-6 font-medium text-sm focus:outline-none ${
                activeTab === 'deliveries'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              🚚 Mis Entregas
            </button>
        </div>

        {/* CONTENT: CATALOG */}
        {activeTab === 'catalog' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalog.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No hay premios disponibles en tu región por el momento.
                </p>
              </div>
            ) : (
              catalog.map((reward) => (
                <div key={reward.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
                  <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                    {reward.imageUrl ? (
                       // eslint-disable-next-line @next/next/no-img-element
                      <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🎁</div>
                    )}
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      {reward.pointsRequired.toLocaleString()} pts
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{reward.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 flex-1">{reward.description}</p>
                    
                    <button
                      onClick={() => handleRedeem(reward)}
                      disabled={redeeming === reward.id || ((currentUser as any).pointsTotal || 0) < reward.pointsRequired}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        ((currentUser as any).pointsTotal || 0) >= reward.pointsRequired
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {redeeming === reward.id ? 'Procesando...' : 
                       ((currentUser as any).pointsTotal || 0) < reward.pointsRequired ? 'Puntos Insuficientes' : 'Canjear Ahora'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* CONTENT: MY REWARDS (Now only Delivered/History) */}
        {activeTab === 'my_rewards' && (
          <div className="space-y-8">
            {myClaims.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  Aún no has canjeado ningún premio. ¡Ve al catálogo!
                </p>
              </div>
            )}

            {/* Delivered */}
            {delivered.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">✅ Historial de Canjes</h3>
                <div className="grid gap-4">
                  {delivered.map((claim) => (
                    <div key={claim.id} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow border-l-4 border-green-500">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg dark:text-white">{claim.rewardName}</h4>
                          <p className="text-sm text-gray-500">Entregado el: {claim.deliveredAt ? new Date((claim.deliveredAt as any).seconds * 1000).toLocaleDateString() : '-'}</p>
                        </div>
                        
                        {!claim.rating ? (
                          <button
                            onClick={() => setRatingReward(claim.id)}
                            className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-200"
                          >
                            ⭐ Calificar
                          </button>
                        ) : (
                          <div className="flex items-center text-yellow-500">
                            {'⭐'.repeat(claim.rating.score)}
                          </div>
                        )}
                      </div>
                      
                      {/* Rating Form Inline */}
                      {ratingReward === claim.id && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fadeIn">
                          <p className="font-medium mb-2 dark:text-white">¿Qué tal el premio?</p>
                          <div className="flex gap-2 mb-3">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                onClick={() => setRatingScore(score)}
                                className={`text-2xl ${ratingScore >= score ? 'grayscale-0' : 'grayscale opacity-30'} transition-all hover:scale-110`}
                              >
                                ⭐
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={ratingComment}
                            onChange={(e) => setRatingComment(e.target.value)}
                            placeholder="Deja un comentario..."
                            className="w-full p-2 border rounded mb-2 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                            rows={2}
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setRatingReward(null)}
                              className="px-3 py-1 text-gray-600 dark:text-gray-300 text-sm"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleRateReward(claim.id)}
                              className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTENT: DELIVERIES (En Tránsito & En Espera) */}
        {activeTab === 'deliveries' && (
          <div className="space-y-8">
             {available.length === 0 && waiting.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  No tienes entregas pendientes.
                </p>
              </div>
            )}

            {/* Premios en Tránsito */}
            {available.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  📦 En Tránsito
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {available.map(reward => (
                    <div
                      key={reward.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {reward.rewardName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {reward.status === 'in_assignment'
                          ? '🔗 Asignado al distribuidor'
                          : '🚚 En camino a tu tienda'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Puntos usados: {reward.pointsDeducted}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Premios en Espera */}
            {waiting.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  ⏳ En Espera
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {waiting.map(reward => (
                    <div
                      key={reward.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 opacity-60"
                    >
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {reward.rewardName}
                      </h3>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                        Agotado - Se repondrá pronto
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Puntos reservados: {reward.pointsDeducted}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}



        {/* Modal de Calificación */}
        {ratingReward && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Calificar Entrega
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Puntuación
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      onClick={() => setRatingScore(score)}
                      className={`text-2xl ${
                        score <= ratingScore ? 'opacity-100' : 'opacity-30'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Comentario (opcional)
                </label>
                <textarea
                  value={ratingComment}
                  onChange={e => setRatingComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setRatingReward(null)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRateReward(ratingReward)}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
