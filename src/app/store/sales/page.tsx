'use client';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, QueryConstraint } from 'firebase/firestore';
import { Invoice } from '@/types';
import Link from 'next/link';

export default function StoreSalesPage() {
  const { currentUser, loading } = useRequireAuth(['STORE']);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (currentUser?.uid) {
        try {
          const constraints: QueryConstraint[] = [where('storeId', '==', currentUser.uid)];
          const q = query(collection(db, 'invoices'), ...constraints);
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Invoice));
          setInvoices(data);
        } catch (err) {
          console.error('Error fetching invoices:', err);
        }
      }
      setDataLoading(false);
    };

    if (!loading) {
      fetchInvoices();
    }
  }, [currentUser, loading]);

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                📋 Mis Compras
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Historial de todas tus compras registradas
              </p>
            </div>
            <Link
              href="/store/dashboard"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Volver al Dashboard
            </Link>
          </div>
        </div>

        {/* Tabla de Facturas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No tienes compras registradas aún
              </p>
              <Link
                href="/store/uploads"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Cargar tu primera factura
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Factura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Puntos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoices.map(invoice => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        ${invoice.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600 dark:text-blue-400">
                        +{invoice.totalPoints} pts
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            invoice.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : invoice.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          }`}
                        >
                          {invoice.status === 'approved' && '✓ Aprobada'}
                          {invoice.status === 'pending' && '⏳ Pendiente'}
                          {invoice.status === 'rejected' && '✗ Rechazada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total de Compras</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {invoices.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Monto Total</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              ${invoices.reduce((sum, inv) => sum + inv.totalAmount, 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Puntos Ganados</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              +{invoices.reduce((sum, inv) => sum + inv.totalPoints, 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
