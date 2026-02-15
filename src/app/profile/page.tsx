'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebase';
import { updateDoc, doc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { User, Distributor } from '@/types';

// Helper para convertir Timestamp a Date
const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp);
};

export default function ProfilePage() {
  useRequireAuth();
  const { currentUser, updateUserProfile, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [distributors, setDistributors] = useState<User[]>([]); // Para STORE: distribuidores del país
  const [distributorInfo, setDistributorInfo] = useState<User | null>(null); // Info del distribuidor actual
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.city || '',
    address: currentUser?.address || '',
    distributorId: currentUser?.distributorId || '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(currentUser?.profilePhoto || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Cargar distribuidores si es STORE y está editando
  useEffect(() => {
    if (currentUser?.role === 'STORE' && isEditing && currentUser.countryId) {
      loadDistributorsForCountry();
    }
  }, [isEditing, currentUser?.countryId]);

  // Cargar info del distribuidor actual cuando el usuario cambie
  useEffect(() => {
    console.log(`🔍 useEffect distributor - distributorId: ${currentUser?.distributorId}, role: ${currentUser?.role}`);
    if (currentUser?.distributorId && currentUser?.role === 'STORE') {
      console.log(`✅ Cargando info del distribuidor: ${currentUser.distributorId}`);
      loadCurrentDistributorInfo();
    } else {
      console.log(`❌ No se carga distributor - distributorId es: ${currentUser?.distributorId}`);
      setDistributorInfo(null);
    }
  }, [currentUser?.uid, currentUser?.distributorId, currentUser?.role]);

  const loadDistributorsForCountry = async () => {
    try {
      console.log(`📍 Cargando distribuidores para país: ${currentUser?.countryId}, ciudad: ${currentUser?.city}`);
      
      // Obtener distribuidores del país que están activos
      const distQuery = query(
        collection(db, 'users'),
        where('role', '==', 'DISTRIBUTOR'),
        where('countryId', '==', currentUser?.countryId),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(distQuery);
      let dists = snapshot.docs.map(doc => doc.data() as User);
      
      // Filtrar distribuidores que:
      // 1. Pertenecen al mismo país, O
      // 2. Tienen zonas de entrega (cities) que incluyen la ciudad del tendero
      if (currentUser?.city) {
        dists = dists.filter(dist => {
          // Permitir todos los del país
          return true; 
          // O si tienes un campo "deliveryCities" en distribuidores, podrías hacer:
          // return !dist.deliveryCities || dist.deliveryCities.includes(currentUser.city);
        });
        console.log(`✅ Distribuidores disponibles para ${currentUser.city}: ${dists.length}`);
      }
      
      setDistributors(dists);
    } catch (error) {
      console.error('Error loading distributors:', error);
    }
  };

  const loadCurrentDistributorInfo = async () => {
    try {
      if (!currentUser?.distributorId) {
        console.log(`❌ loadCurrentDistributorInfo: distributorId es null`);
        return;
      }
      console.log(`🔍 Buscando distribuidor por distributorId: ${currentUser.distributorId}`);
      
      const distributorId = currentUser.distributorId;
      
      // Estrategia 1: Si parece un UID de Firebase, intentar buscar directo
      // UIDs de Firebase típicamente son strings de 28 caracteres alfanuméricos
      if (distributorId.length > 20 && /^[a-zA-Z0-9]+$/.test(distributorId)) {
        console.log(`📍 Intentando buscar como UID de Firebase`);
        try {
          const distRef = doc(db, 'users', distributorId);
          const distDoc = await getDoc(distRef);
          if (distDoc.exists()) {
            console.log(`✅ Distribuidor encontrado por UID:`, distDoc.data());
            setDistributorInfo(distDoc.data() as User);
            return;
          }
        } catch (e) {
          console.log(`⚠️  No encontrado como UID, intentando query...`);
        }
      }
      
      // Estrategia 2: Buscar por campo distributorId (para IDs personalizados como "DIST-ECU-01")
      console.log(`📍 Buscando por campo distributorId en Firestore`);
      const distQuery = query(
        collection(db, 'users'),
        where('distributorId', '==', distributorId),
        where('role', '==', 'DISTRIBUTOR')
      );
      
      const snapshot = await getDocs(distQuery);
      
      if (!snapshot.empty) {
        const distributor = snapshot.docs[0].data() as User;
        console.log(`✅ Distribuidor encontrado:`, distributor);
        setDistributorInfo(distributor);
      } else {
        console.log(`❌ Distribuidor NO encontrado con distributorId: ${distributorId}`);
      }
    } catch (error) {
      console.error('Error loading distributor info:', error);
    }
  };

  if (!currentUser) {
    return null;
  }

  // Obtener el nombre del rol
  const getRoleName = () => {
    const roleNames: Record<string, string> = {
      SUPER_ADMIN: 'Super Administrador',
      ADMIN_COUNTRY: 'Administrador Regional',
      DISTRIBUTOR: 'Distribuidor',
      STORE: 'Tendero',
    };
    return roleNames[currentUser.role] || currentUser.role;
  };

  // Obtener el icono del rol
  const getRoleIcon = () => {
    const roleIcons: Record<string, string> = {
      SUPER_ADMIN: '🔐',
      ADMIN_COUNTRY: '🌍',
      DISTRIBUTOR: '🚚',
      STORE: '🏪',
    };
    return roleIcons[currentUser.role] || '👤';
  };

  // Obtener el color del rol
  const getRoleColor = () => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'from-purple-500 to-pink-500',
      ADMIN_COUNTRY: 'from-blue-500 to-cyan-500',
      DISTRIBUTOR: 'from-orange-500 to-red-500',
      STORE: 'from-green-500 to-emerald-500',
    };
    return colors[currentUser.role] || 'from-gray-500 to-gray-600';
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    setIsLoading(true);
    try {
      // Crear referencia en Storage
      const storageRef = ref(storage, `profile-photos/${currentUser.uid}/${Date.now()}`);
      
      // Subir archivo
      await uploadBytes(storageRef, file);
      
      // Obtener URL de descarga
      const downloadURL = await getDownloadURL(storageRef);
      
      // Actualizar en Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        profilePhoto: downloadURL,
        updatedAt: new Date(),
      });

      // Actualizar localmente
      setProfilePhoto(downloadURL);
      updateUserProfile({ profilePhoto: downloadURL });
      
      // Refrescar usuario desde Firestore
      await refreshUser();
      
      alert('✅ Foto de perfil actualizada correctamente');
    } catch (error) {
      console.error('Error al subir foto:', error);
      alert('Error al subir la foto. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
        updatedAt: new Date(),
      };

      // Si es tendero (STORE), guardar también el distributorId
      if (currentUser.role === 'STORE' && formData.distributorId) {
        updateData.distributorId = formData.distributorId;
      }

      await updateDoc(userRef, updateData);

      const profileUpdateData: any = {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
      };

      if (currentUser.role === 'STORE' && formData.distributorId) {
        profileUpdateData.distributorId = formData.distributorId;
      }

      updateUserProfile(profileUpdateData);

      // Refrescar usuario desde Firestore
      await refreshUser();

      alert('✅ Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      alert('Error al actualizar el perfil. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Mi Perfil</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tu información personal</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {/* Role Banner */}
          <div className={`h-32 bg-gradient-to-r ${getRoleColor()} relative`}></div>

          {/* Profile Content */}
          <div className="px-6 py-8">
            {/* Profile Photo Section */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative -mt-20 mb-6">
                {profilePhoto ? (
                  <div className="relative w-40 h-40">
                    <Image
                      src={profilePhoto}
                      alt={currentUser.name}
                      fill
                      className="rounded-full object-cover border-4 border-white dark:border-gray-900 shadow-lg"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-5xl border-4 border-white dark:border-gray-900 shadow-lg">
                    {currentUser.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3 shadow-lg transition disabled:opacity-50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={isLoading}
                />
              </div>

              {isLoading && uploadProgress > 0 && (
                <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {currentUser.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{currentUser.email}</p>
            </div>

            {/* Role Badge */}
            <div className="flex justify-center mb-8">
              <div className={`bg-gradient-to-r ${getRoleColor()} text-white px-6 py-2 rounded-full inline-flex items-center gap-2 shadow-lg`}>
                <span className="text-2xl">{getRoleIcon()}</span>
                <span className="font-semibold">{getRoleName()}</span>
              </div>
            </div>

            {/* Form */}
            {isEditing ? (
              <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white opacity-60"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dirección
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Distributor Selector (Only for STORE role) */}
                {currentUser.role === 'STORE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mi Distribuidor
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Puedes seleccionar cualquier distribuidor activo en {currentUser.countryId || 'tu país'}{currentUser.city ? ` o que entregue en ${currentUser.city}` : ''}
                    </p>
                    <select
                      value={formData.distributorId}
                      onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">-- Selecciona un distribuidor --</option>
                      {distributors.length > 0 ? (
                        distributors.map((dist) => (
                          <option key={dist.uid} value={dist.uid}>
                            {dist.name} ({dist.city || 'Sin ciudad especificada'}) - 📦
                          </option>
                        ))
                      ) : (
                        <option disabled>No hay distribuidores disponibles</option>
                      )}
                    </select>
                    {distributors.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                        ⚠️ No hay distribuidores disponibles en tu país
                      </p>
                    )}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSaveChanges}
                    disabled={isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                  >
                    {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: currentUser.name || '',
                        email: currentUser.email || '',
                        phone: currentUser.phone || '',
                        city: currentUser.city || '',
                        address: currentUser.address || '',
                        distributorId: currentUser.distributorId || '',
                      });
                    }}
                    disabled={isLoading}
                    className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-6">
                {/* Info Display */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Teléfono</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentUser.phone || 'No especificado'}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ciudad</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentUser.city || 'No especificada'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white break-all text-sm">
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dirección</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentUser.address || 'No especificada'}
                    </p>
                  </div>
                </div>

                {/* Distributor Info (Only for STORE role) */}
                {currentUser.role === 'STORE' && (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Mi Distribuidor</p>
                    {distributorInfo ? (
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {distributorInfo.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{distributorInfo.email}</p>
                        {distributorInfo.phone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{distributorInfo.phone}</p>
                        )}
                        {distributorInfo.city && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">📍 {distributorInfo.city}</p>
                        )}
                      </div>
                    ) : currentUser.distributorId ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ID: {currentUser.distributorId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Distribuidor asignado. Esperando creación en el panel de admin.
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400">No asignado</p>
                    )}
                  </div>
                )}

                {/* Distributor Superior Info (Only for DISTRIBUTOR role) */}
                {currentUser.role === 'DISTRIBUTOR' && currentUser.distributorId && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Distribuidor Superior</p>
                    {distributorInfo ? (
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {distributorInfo.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{distributorInfo.email}</p>
                        {distributorInfo.phone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">{distributorInfo.phone}</p>
                        )}
                        {distributorInfo.city && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">📍 {distributorInfo.city}</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          ID: {currentUser.distributorId}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Distribuidor superior asignado. Esperando creación en el panel de admin.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Button */}
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 mt-6"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Perfil
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Member Since */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Miembro desde</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {toDate(currentUser.createdAt).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                <p className="font-semibold text-gray-900 dark:text-white">Activo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
