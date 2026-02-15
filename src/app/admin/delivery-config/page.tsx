'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { User } from '@/types';

interface DeliveryZone {
  id: string;
  name: string;
  email: string;
  phone: string;
  distributorId: string;
  cities: string[];
  countryId: string;
  storeCount: number;
  createdAt: Date;
  status: 'active' | 'inactive';
}

const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export default function DeliveryConfigPage() {
  useRequireAuth(['ADMIN_COUNTRY']);
  const { currentUser } = useAuth();
  const [distributors, setDistributors] = useState<DeliveryZone[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [validDistributorIds, setValidDistributorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    distributorId: '',
    cities: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Primero obtener el nombre del país desde la colección countries
      const countryDoc = await getDoc(doc(db, 'countries', currentUser?.countryId || ''));
      const countryName = countryDoc.exists() ? countryDoc.data().name : currentUser?.countryId;
      
      console.log(`📍 País del admin: ${currentUser?.countryId} -> ${countryName}`);
      
      // Cargar distribuidores del país
      const distributorsQuery = query(
        collection(db, 'users'),
        where('role', '==', 'DISTRIBUTOR'),
        where('countryId', '==', currentUser?.countryId)
      );
      const distributorsSnapshot = await getDocs(distributorsQuery);
      
      const distributorsList: DeliveryZone[] = await Promise.all(
        distributorsSnapshot.docs.map(async (doc) => {
          const data = doc.data() as any;
          
          console.log(`✅ Distribuidor encontrado: ${data.name} (${data.distributorId})`);
          
          // Contar tiendas asignadas a este distribuidor
          // Filtrar por país también para evitar problemas de permisos
          const storesQuery = query(
            collection(db, 'users'),
            where('role', '==', 'STORE'),
            where('countryId', '==', currentUser?.countryId),
            where('distributorId', '==', data.distributorId || doc.id)
          );
          
          try {
            const storesSnapshot = await getDocs(storesQuery);
            console.log(`  📦 Tiendas encontradas: ${storesSnapshot.size}`);
            
            return {
              id: doc.id,
              name: data.name,
              email: data.email,
              phone: data.phone || '',
              distributorId: data.distributorId || '',
              cities: data.cities || [],
              countryId: data.countryId,
              storeCount: storesSnapshot.size,
              createdAt: toDate(data.createdAt),
              status: data.status || 'active',
            };
          } catch (error) {
            console.error(`  ❌ Error contando tiendas para ${data.name}:`, error);
            return {
              id: doc.id,
              name: data.name,
              email: data.email,
              phone: data.phone || '',
              distributorId: data.distributorId || '',
              cities: data.cities || [],
              countryId: data.countryId,
              storeCount: 0,
              createdAt: toDate(data.createdAt),
              status: data.status || 'active',
            };
          }
        })
      );
      
      setDistributors(distributorsList);
      
      // Cargar ciudades disponibles de tenderos_validos usando el nombre del país
      const tenderosQuery = query(
        collection(db, 'tenderos_validos'),
        where('pais', '==', countryName)
      );
      const tenderosSnapshot = await getDocs(tenderosQuery);
      const cities = new Set<string>();
      const distributorIds = new Set<string>();
      
      tenderosSnapshot.docs.forEach((doc) => {
        const data = doc.data() as any;
        if (data.ciudad) {
          cities.add(data.ciudad);
        }
        if (data.distribuidorId) {
          distributorIds.add(data.distribuidorId);
        }
      });
      
      console.log(`🏙️ Ciudades encontradas: ${Array.from(cities).join(', ')}`);
      console.log(`📊 Códigos de distribuidor válidos: ${Array.from(distributorIds).join(', ')}`);
      
      setAvailableCities(Array.from(cities).sort());
      setValidDistributorIds(Array.from(distributorIds).sort());
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'El nombre es requerido';
    if (!formData.email.trim()) errors.email = 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }
    if (!formData.phone.trim()) errors.phone = 'El teléfono es requerido';
    if (!formData.distributorId.trim()) {
      errors.distributorId = 'Debe seleccionar un código de distribuidor';
    } else if (!validDistributorIds.includes(formData.distributorId)) {
      errors.distributorId = `El código "${formData.distributorId}" no es válido. Los códigos válidos son: ${validDistributorIds.join(', ')}`;
    }
    if (formData.cities.length === 0) {
      errors.cities = 'Debe seleccionar al menos una ciudad';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCityToggle = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Crear documento en users con el email asignado al rol DISTRIBUTOR
      await setDoc(doc(db, 'users', formData.email), {
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        role: 'DISTRIBUTOR',
        countryId: currentUser?.countryId,
        distributorId: formData.distributorId,
        cities: formData.cities,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Crear documento en distribuidores (colección de referencia)
      await addDoc(collection(db, 'distributors'), {
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        countryId: currentUser?.countryId,
        distributorId: formData.distributorId,
        cities: formData.cities,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // Resetear formulario y recargar
      setFormData({
        name: '',
        email: '',
        phone: '',
        distributorId: '',
        cities: [],
      });
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      console.error('Error creando distribuidor:', error);
      setFormErrors({
        submit: error.message || 'Error al crear el distribuidor',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDistributor = async (uid: string) => {
    if (
      !window.confirm(
        '¿Estás seguro de que deseas eliminar este distribuidor? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
      await loadData();
    } catch (error) {
      console.error('Error eliminando distribuidor:', error);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Configuración de Entregas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Crea y gestiona distribuidores por zonas de entrega
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-lg transition flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Crear Distribuidor
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Nuevo Distribuidor
            </h2>

            {formErrors.submit && (
              <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Nombre del Repartidor *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ej: Juan García"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.name && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {formErrors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="juan@example.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.email && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="+593 123456789"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.phone && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                {/* Código Distribuidor */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Código de Distribuidor *
                  </label>
                  {validDistributorIds.length === 0 ? (
                    <div className="w-full px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                      No hay códigos de distribuidor disponibles en tenderos válidos
                    </div>
                  ) : (
                    <select
                      value={formData.distributorId}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, distributorId: e.target.value }))
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Seleccionar código de distribuidor</option>
                      {validDistributorIds.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.distributorId && (
                    <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                      {formErrors.distributorId}
                    </p>
                  )}
                </div>
              </div>

              {/* Ciudades */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Ciudades a Entregar *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {availableCities.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 col-span-full">
                      No hay ciudades disponibles en los tenderos registrados
                    </p>
                  ) : (
                    availableCities.map((city) => (
                      <label
                        key={city}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.cities.includes(city)}
                          onChange={() => handleCityToggle(city)}
                          className="w-4 h-4 text-orange-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-300">
                          {city}
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {formErrors.cities && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                    {formErrors.cities}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Seleccionadas: {formData.cities.length}
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  {submitting ? 'Creando...' : 'Crear Distribuidor'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Distributors List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-gray-400">Cargando distribuidores...</p>
          </div>
        ) : distributors.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No hay distribuidores creados aún
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Crear el primer Distribuidor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {distributors.map((distributor) => (
              <div
                key={distributor.id}
                className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-800 hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-2xl">
                        🚚
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {distributor.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {distributor.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteDistributor(distributor.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Código Distribuidor
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm font-mono">
                      {distributor.distributorId}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Teléfono
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {distributor.phone}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Tiendas Asignadas
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {distributor.storeCount}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Estado
                    </p>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                          distributor.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {distributor.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Ciudades */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Ciudades de Entrega
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {distributor.cities.length === 0 ? (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        No asignado
                      </span>
                    ) : (
                      distributor.cities.map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                        >
                          📍 {city}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
