'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface Region {
  id: string;
  name: string;
}

interface Distributor {
  id: string;
  name: string;
  phone?: string;
  regions: string[];
}

interface DeliveryAssignment {
  id: string;
  distributorId: string;
  distributorName: string;
  regionId: string;
  regionName: string;
}

export default function ConfigDeliveriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ distributorId: '', regionId: '' });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && user?.role !== 'ADMIN_COUNTRY') {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const countryId = user?.countryId || '';

        // Cargar regiones
        const regionsSnap = await getDocs(query(
          collection(db, 'regions'),
          where('countryId', '==', countryId)
        ));
        const regionsData: Region[] = regionsSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
        }));
        setRegions(regionsData);

        // Cargar distribuidores
        const distribSnap = await getDocs(query(
          collection(db, 'distributors'),
          where('countryId', '==', countryId)
        ));
        const distribData: Distributor[] = distribSnap.docs.map(d => ({
          id: d.id,
          name: d.data().name,
          phone: d.data().phone,
          regions: d.data().assignedRegions || [],
        }));
        setDistributors(distribData);

        // Cargar asignaciones
        const assignSnap = await getDocs(query(
          collection(db, 'deliveryAssignments'),
          where('countryId', '==', countryId)
        ));
        const assignData: DeliveryAssignment[] = assignSnap.docs.map(d => ({
          id: d.id,
          distributorId: d.data().distributorId,
          distributorName: d.data().distributorName,
          regionId: d.data().regionId,
          regionName: d.data().regionName,
        }));
        setAssignments(assignData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    if (user?.countryId) {
      loadData();
    }
  }, [user?.countryId]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.countryId) return;

    try {
      const distributor = distributors.find(d => d.id === formData.distributorId);
      const region = regions.find(r => r.id === formData.regionId);
      
      if (!distributor || !region) return;

      // Crear asignación
      await addDoc(collection(db, 'deliveryAssignments'), {
        countryId: user.countryId,
        distributorId: formData.distributorId,
        distributorName: distributor.name,
        regionId: formData.regionId,
        regionName: region.name,
        createdAt: new Date(),
      });

      // Actualizar distribuidores
      setFormData({ distributorId: '', regionId: '' });
      setShowForm(false);

      // Recargar asignaciones
      const assignSnap = await getDocs(query(
        collection(db, 'deliveryAssignments'),
        where('countryId', '==', user.countryId)
      ));
      const assignData: DeliveryAssignment[] = assignSnap.docs.map(d => ({
        id: d.id,
        distributorId: d.data().distributorId,
        distributorName: d.data().distributorName,
        regionId: d.data().regionId,
        regionName: d.data().regionName,
      }));
      setAssignments(assignData);
    } catch (error) {
      console.error('Error assigning:', error);
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return;
    
    try {
      await deleteDoc(doc(db, 'deliveryAssignments', assignmentId));
      setAssignments(assignments.filter(a => a.id !== assignmentId));
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  if (loading || loadingData) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-2xl font-bold">🔄 Cargando...</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">🚚 Configuración de Entregas</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {showForm ? '✕ Cancelar' : '➕ Asignar Distribuidor'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <form onSubmit={handleAssign} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Distribuidor
                  </label>
                  <select
                    value={formData.distributorId}
                    onChange={(e) => setFormData({ ...formData, distributorId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Seleccionar distribuidor</option>
                    {distributors.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Región
                  </label>
                  <select
                    value={formData.regionId}
                    onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Seleccionar región</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                ✔️ Asignar
              </button>
            </form>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📍 Asignaciones Activas</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Distribuidor</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Región</th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assign, idx) => (
                <tr key={assign.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{assign.distributorName}</td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{assign.regionName}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(assign.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400"
                    >
                      🗑️ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
