'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import rewardService, { GlobalReward } from '@/services/rewardService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

export default function SuperAdminRewardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rewards, setRewards] = useState<GlobalReward[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    pointsRequired: 0, 
    description: '', 
    category: '',
    imageUrl: '' 
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadRewards = async () => {
      try {
        setLoadingData(true);
        const rews = await rewardService.getGlobalRewards();
        setRewards(rews);
      } catch (error) {
        console.error('Error loading rewards:', error);
      } finally {
        setLoadingData(false);
      }
    };
    if (user?.role === 'SUPER_ADMIN') {
        loadRewards();
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        const storageRef = ref(storage, `rewards/global/${Date.now()}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      }

      await rewardService.createGlobalReward({
        name: formData.name,
        pointsRequired: Number(formData.pointsRequired),
        description: formData.description,
        category: formData.category,
        imageUrl: finalImageUrl,
      });

      setFormData({ name: '', pointsRequired: 0, description: '', category: '', imageUrl: '' });
      setImageFile(null);
      setPreviewUrl(null);
      setShowForm(false);
      const rews = await rewardService.getGlobalRewards();
      setRewards(rews);
    } catch (error) {
      console.error('Error creating reward:', error);
      alert('Error al crear el premio');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (rewardId: string) => {
    if (!confirm('¿Eliminar este premio?')) return;
    try {
      await rewardService.deleteGlobalReward(rewardId);
      setRewards(rewards.filter(r => r.id !== rewardId));
    } catch (error) {
      console.error('Error deleting reward:', error);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando premios globales...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🎁 Catálogo de Premios Globales</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Define los premios base que podrán utilizar los países</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
          >
            {showForm ? '✕ Cancelar' : '➕ Nuevo Premio Global'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 mb-8 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-2">Crear Nuevo Premio Global</h2>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre del Premio</label>
                  <input
                    type="text"
                    placeholder="Ej. Televisor 50 Pulgadas"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puntos Sugeridos (Base)</label>
                  <input
                    type="number"
                    placeholder="Ej. 5000"
                    value={formData.pointsRequired}
                    onChange={(e) => setFormData({ ...formData, pointsRequired: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Seleccionar Categoría --</option>
                    <option value="Electronics">Electrónica</option>
                    <option value="Home">Hogar</option>
                    <option value="Merch">Merchandising</option>
                    <option value="Travel">Viajes</option>
                    <option value="Other">Otro</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4 mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Imagen del Premio</label>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      {/* Opción 1: Subir Archivo */}
                      <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-xs font-semibold text-gray-500 uppercase mb-2 block">Opción 1: Subir desde dispositivo</span>
                        <input
                           type="file"
                           accept="image/*"
                           onChange={handleImageChange}
                           className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                      </div>

                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">O usar URL externa</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      {/* Opción 2: URL */}
                      <div>
                        <input
                          type="url"
                          placeholder="https://ejemplo.com/imagen.jpg"
                          value={formData.imageUrl}
                          onChange={(e) => {
                            setFormData({ ...formData, imageUrl: e.target.value });
                            setPreviewUrl(e.target.value);
                            setImageFile(null); // Limpiar archivo si se escribe URL
                          }}
                          disabled={!!imageFile}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {/* Previsualización */}
                    <div className="w-full md:w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600">
                      {previewUrl || formData.imageUrl ? (
                        <img 
                          src={previewUrl || formData.imageUrl} 
                          alt="Vista previa" 
                          className="w-full h-full object-cover"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error+Imagen')}
                        />
                      ) : (
                        <div className="text-center text-gray-400 p-4">
                          <span className="text-2xl block mb-1">🖼️</span>
                          <span className="text-xs">Sin imagen</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                <textarea
                  placeholder="Descripción detallada del premio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={uploading}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Subiendo...
                    </>
                  ) : (
                    '✔️ Crear Premio'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => (
            <div key={reward.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-100 dark:border-gray-700">
               <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">
                {reward.imageUrl ? (
                  <img src={reward.imageUrl} alt={reward.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-4xl">🎁</div>
                )}
                {reward.category && (
                  <div className="absolute top-3 right-3">
                     <span className="px-3 py-1 bg-black/50 backdrop-blur-sm text-white rounded-full text-xs font-bold uppercase">
                      {reward.category}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{reward.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 h-10">
                  {reward.description || 'Sin descripción'}
                </p>
                
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-semibold">Puntos Base</span>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{reward.pointsRequired}</div>
                  </div>
                  <button
                    onClick={() => handleDelete(reward.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar Premio Global"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}

          {rewards.length === 0 && !showForm && (
            <div className="col-span-full py-16 text-center bg-white dark:bg-gray-800 rounded-xl border-dashed border-2 border-gray-300 dark:border-gray-700">
              <p className="text-xl text-gray-500 mb-4">No hay premios globales configurados</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                Comienza creando el catálogo global
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
