'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, where, setDoc, updateDoc, deleteDoc, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Country, User } from '@/types';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

interface CountryAdmin {
  countryId: string;
  countryName: string;
  admin?: User;
  adminEmail?: string;
  status: 'with-admin' | 'without-admin';
}

export default function ConfigAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const currentUser = user;
  
  const [countries, setCountries] = useState<CountryAdmin[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);

  // Verificar que es SuperAdmin
  useEffect(() => {
    if (!loading && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [user, loading, router]);

  // Cargar países y sus admins
  useEffect(() => {
    const loadCountriesAndAdmins = async () => {
      try {
        setLoadingData(true);
        
        // Obtener todos los países
        const countriesSnapshot = await getDocs(collection(db, 'countries'));
        const countriesList = countriesSnapshot.docs.map(doc => doc.data() as Country);
        
        // Para cada país, buscar si tiene admin
        const countryAdminsData: CountryAdmin[] = [];
        
        for (const country of countriesList) {
          const adminQuery = query(
            collection(db, 'users'),
            where('role', '==', 'ADMIN_COUNTRY'),
            where('countryId', '==', country.id)
          );
          
          const adminSnapshot = await getDocs(adminQuery);
          
          if (adminSnapshot.empty) {
            countryAdminsData.push({
              countryId: country.id,
              countryName: country.name,
              status: 'without-admin'
            });
          } else {
            const admin = adminSnapshot.docs[0].data() as User;
            countryAdminsData.push({
              countryId: country.id,
              countryName: country.name,
              admin,
              adminEmail: admin.email,
              status: 'with-admin'
            });
          }
        }
        
        setCountries(countryAdminsData);
      } catch (error) {
        console.error('Error loading countries:', error);
        setMessage({ type: 'error', text: 'Error al cargar países' });
      } finally {
        setLoadingData(false);
      }
    };
    
    if (!loading && currentUser) {
      loadCountriesAndAdmins();
    }
  }, [loading, currentUser]);

  // Crear nuevo admin de país
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCountry || !formData.name || !formData.email) {
      setMessage({ type: 'error', text: 'Completa todos los campos requeridos' });
      return;
    }

    try {
      setSubmitting(true);
      
      // Llamar Cloud Function para asignar como admin
      const assignAdmin = httpsCallable(functions, 'assignCountryAdmin');
      const response = await assignAdmin({
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        countryId: selectedCountry
      });

      setMessage({ 
        type: 'success', 
        text: `✅ Admin asignado: ${formData.email}. Esta persona debe registrarse con este email.` 
      });
      
      // Limpiar formulario y recargar
      setShowForm(false);
      setFormData({ name: '', email: '', phone: '' });
      setSelectedCountry('');
      
      // Recargar países
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error assigning admin:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error al asignar admin' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar admin de país
  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm('¿Eliminar este admin de país? Los tenderos de este país quedarán huérfanos.')) {
      return;
    }

    try {
      setSubmitting(true);
      
      // Llamar Cloud Function para eliminar
      const deleteAdmin = httpsCallable(functions, 'deleteCountryAdmin');
      await deleteAdmin({ userId: adminId });

      setMessage({ 
        type: 'success', 
        text: '✅ Admin eliminado' 
      });
      
      // Recargar
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Error al eliminar admin' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-800 rounded-lg transition"
          >
            ← Atrás
          </button>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            ⚙️ Configuración de Admins de País
          </h1>
        </div>
        <p className="text-slate-400 text-lg">
          💡 Los admins de país son el <span className="text-yellow-400 font-bold">CORAZÓN</span> del sistema. 
          Sin admin en un país, no pueden existir tenderos.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`max-w-7xl mx-auto mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-900/30 border border-green-500 text-green-300' 
            : 'bg-red-900/30 border border-red-500 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Button */}
      {!showForm && (
        <div className="max-w-7xl mx-auto mb-8">
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition"
          >
            ✨ Agregar Admin de País
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="max-w-7xl mx-auto mb-8 bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Crear Nuevo Admin de País</h2>
          
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            {/* Select Country */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                País *
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Selecciona un país --</option>
                {countries
                  .filter(c => c.status === 'without-admin')
                  .map(country => (
                    <option key={country.countryId} value={country.countryId}>
                      {country.countryName}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                placeholder="admin@ejemplo.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                placeholder="+34 600 000 000"
              />
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-300">
                💡 <span className="font-semibold">Esta persona debe registrarse</span> usando el email proporcionado. 
                El sistema la asignará automáticamente como admin de {countries.find(c => c.countryId === selectedCountry)?.countryName}.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {submitting ? 'Asignando...' : '✅ Asignar como Admin'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', email: '', phone: '' });
                }}
                className="px-6 py-2 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition"
              >
                ✖️ Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Countries List */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Estado de Admins por País</h2>
        
        <div className="grid gap-4">
          {countries.map(country => (
            <div
              key={country.countryId}
              className={`p-6 rounded-xl border transition ${
                country.status === 'with-admin'
                  ? 'bg-slate-800/50 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Country Info */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{country.countryName}</h3>
                  
                  {country.status === 'with-admin' ? (
                    <div className="space-y-1">
                      <p className="text-sm text-slate-300">
                        <span className="text-emerald-400 font-semibold">✅ ADMIN ASIGNADO</span>
                      </p>
                      <p className="text-sm text-slate-400">
                        👤 {country.admin?.name} ({country.admin?.email})
                      </p>
                      <p className="text-xs text-slate-500">
                        Teléfono: {country.admin?.phone || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Estado: <span className="text-emerald-400">{country.admin?.status}</span>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-400">
                        <span className="text-yellow-400 font-semibold">⚠️ SIN ADMIN</span> - No pueden crear tenderos
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {country.status === 'with-admin' && country.admin && (
                  <button
                    onClick={() => handleDeleteAdmin(country.admin!.uid)}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-900/30 border border-red-500/30 text-red-300 rounded-lg hover:bg-red-900/50 hover:border-red-500/50 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    🗑️ Eliminar Admin
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {countries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No hay países configurados en el sistema</p>
          </div>
        )}
      </div>
    </div>
  );
}
