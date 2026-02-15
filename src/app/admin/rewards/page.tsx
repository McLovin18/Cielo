'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import rewardService, { CountryReward, GlobalReward } from '@/services/rewardService';

export default function AdminCountryRewardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Datos
  const [rewards, setRewards] = useState<CountryReward[]>([]);
  const [globalRewards, setGlobalRewards] = useState<GlobalReward[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Formulario
  const [showForm, setShowForm] = useState(false);
  const [useGlobal, setUseGlobal] = useState(false); // Toggle entre crear nuevo o usar global
  
  const initialFormState = {
    globalRewardId: '',
    name: '',
    description: '',
    pointsRequired: 0,
    imageUrl: '',
    monthlyTarget: 0,
    active: true
  };
  
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!loading && user?.role !== 'ADMIN_COUNTRY') {
      router.push('/');
    }
  }, [user, loading, router]);

  const loadData = async () => {
    if (!user?.countryId) return;
    try {
      setLoadingData(true);
      const [global, country] = await Promise.all([
        rewardService.getGlobalRewards(),
        rewardService.getCountryRewards(user.countryId)
      ]);
      setGlobalRewards(global);
      setRewards(country);
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.countryId]);

  const handleGlobalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const global = globalRewards.find(r => r.id === selectedId);
    
    if (global) {
      setFormData({
        ...formData,
        globalRewardId: global.id,
        name: global.name,
        description: global.description || '',
        pointsRequired: global.pointsRequired,
        imageUrl: global.imageUrl || '',
      });
    } else {
      setFormData({ ...initialFormState, globalRewardId: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.countryId) return;

    try {
      // Si no usa global, generar un ID para rewardId
      const rewardIdToUse = useGlobal && formData.globalRewardId 
        ? formData.globalRewardId 
        : `local_${Date.now()}`;

      await rewardService.createCountryReward({
        countryId: user.countryId,
        rewardId: rewardIdToUse,
        globalRewardId: useGlobal ? (formData.globalRewardId || '') : '',
        name: formData.name,
        description: formData.description,
        pointsRequired: Number(formData.pointsRequired),
        imageUrl: formData.imageUrl,
        monthlyTarget: Number(formData.monthlyTarget),
        active: formData.active,
        status: formData.active ? 'active' : 'inactive',
      });

      setFormData(initialFormState);
      setShowForm(false);
      loadData();
    } catch (error) {
      console.error('Error creating reward:', error);
      alert('Error al crear el premio');
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('¿Eliminar este premio del país? Esta acción no se puede deshacer.')) return;
    try {
      await rewardService.deleteCountryReward(rewardId);
      setRewards(rewards.filter(r => r.id !== rewardId));
    } catch (error) {
      console.error('Error deleting reward:', error);
    }
  };

  const handleToggleActive = async (reward: CountryReward) => {
    try {
      await rewardService.updateCountryReward(reward.id, { active: !reward.active });
      loadData();
    } catch (error) {
      console.error('Error toggling reward:', error);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando premios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Premios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Configura el catálogo de recompensas para {user?.countryId}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            {showForm ? '✕ Cancelar' : '➕ Nuevo Premio'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-2">
              {useGlobal ? 'Importar Premio Global' : 'Crear Nuevo Premio Local'}
            </h2>

            <div className="mb-6 flex gap-4">
              <button 
                type="button"
                onClick={() => { setUseGlobal(true); setFormData(initialFormState); }}
                className={`flex-1 py-2 px-4 rounded-lg border ${useGlobal ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}
              >
                🌍 Usar Catálogo Global
              </button>
              <button 
                type="button"
                onClick={() => { setUseGlobal(false); setFormData(initialFormState); }}
                className={`flex-1 py-2 px-4 rounded-lg border ${!useGlobal ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600'}`}
              >
                🏠 Crear Premio Personalizado
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {useGlobal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Seleccionar Premio Global</label>
                  <select
                    value={formData.globalRewardId}
                    onChange={handleGlobalSelect}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required={useGlobal}
                  >
                    <option value="">-- Seleccionar --</option>
                    {globalRewards.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre del Premio</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="Ej. Kit de Merchandising"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puntos Requeridos</label>
                  <input
                    type="number"
                    value={formData.pointsRequired}
                    onChange={(e) => setFormData({ ...formData, pointsRequired: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                    placeholder="Ej. 500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="Descripción detallada del premio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL de Imagen (Opcional)</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Premio Activo (Visible para tenderos)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg font-medium"
                >
                  Guardar Premio
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Premios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => (
            <div key={reward.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl border ${!reward.active ? 'opacity-75 border-gray-200 dark:border-gray-700' : 'border-transparent'}`}>
              <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                {reward.imageUrl ? (
                  <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">🎁</div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${reward.active ? 'bg-green-500' : 'bg-gray-500'}`}>
                    {reward.active ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{reward.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 h-10">
                  {reward.description || 'Sin descripción'}
                </p>
                
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Costo</span>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reward.pointsRequired} pts</div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(reward)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition"
                      title={reward.active ? "Desactivar" : "Activar"}
                    >
                      {reward.active ? '👁️' : '🚫'}
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {rewards.length === 0 && !showForm && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-gray-800 rounded-xl border-dashed border-2 border-gray-300 dark:border-gray-700">
              <p className="text-xl text-gray-500 mb-4">No hay premios configurados para {user?.countryId || 'tu país'}</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                Comienza creando el primer premio
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
