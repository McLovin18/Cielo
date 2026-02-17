'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { db, functions } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import Link from 'next/link';
import { Invoice, Store } from '@/types';

type InvoiceWithStore = Invoice & { storeName: string };

export default function DistributorInvoicesPage() {
  const { currentUser, loading } = useRequireAuth(['DISTRIBUTOR']);
  const [invoices, setInvoices] = useState<InvoiceWithStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithStore | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  useEffect(() => {
    if (currentUser?.distributorId) {
      loadPendingInvoices();
    }
  }, [currentUser]);

  const loadPendingInvoices = async () => {
    setIsLoading(true);
    try {
        // En un mundo ideal, filtramos por distributorId. 
        // Por ahora, asumimos que el distribuidor ve todas las de su país o las que no tienen distribuidor asignado aún.
        // O mejor: Buscamos tiendas de este distribuidor y luego sus facturas pendientes.
        
        // 1. Buscar tiendas del distribuidor
        /*
        const storesQuery = query(
            collection(db, 'stores'),
            where('distributorId', '==', currentUser!.distributorId)
        );
        const storesSnap = await getDocs(storesQuery);
        const storeIds = storesSnap.docs.map(d => d.id);
        
        if (storeIds.length === 0) {
            setInvoices([]);
            return;
        }
        */

        // query must match the security rules 
        const q = query(
            collection(db, 'invoices'),
            where('countryId', '==', currentUser!.countryId),
            where('distributorId', '==', currentUser!.distributorId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        /*
        // DEBUGGING: Traer TODAS las facturas pendientes del país para ver qué está pasando
        const q = query(
            collection(db, 'invoices'),
            where('countryId', '==', currentUser!.countryId),
            // where('distributorId', '==', currentUser!.distributorId), // Comentado temporalmente para debug
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        */

        const snap = await getDocs(q);
        console.log(`Query results: ${snap.docs.length} invoices found for distributor ${currentUser?.distributorId}`);
        const loadedInvoices: InvoiceWithStore[] = snap.docs.map(d => {
            const data = d.data();
            console.log(`Invoice ${d.id}: status=${data.status}, distributorId=${data.distributorId}`);
            return { 
                id: d.id, 
                ...data 
            } as InvoiceWithStore;
        });
        
        // No need to filter manually, the query does it and satisfies the rules
        setInvoices(loadedInvoices);

    } catch (error) {
      console.error("Error loading invoices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (invoice: InvoiceWithStore) => {
    if (!confirm(`¿Aprobar factura #${invoice.invoiceNumber} y asignar ${invoice.pointsEarned} puntos?`)) return;

    setProcessingId(invoice.id);
    try {
        const approveFn = httpsCallable(functions, 'approveInvoice');
        await approveFn({ 
            invoiceId: invoice.id,
            approve: true 
        });
        
        // Remove from list
        setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        setModalOpen(false);
        alert('✅ Factura aprobada exitosamente');
    } catch (error: any) {
        alert('❌ Error al aprobar: ' + error.message);
    } finally {
        setProcessingId(null);
    }
  };

  const handleReject = async (invoice: InvoiceWithStore) => {
    if (!rejectReason.trim()) {
        alert('Debes indicar una razón para el rechazo');
        return;
    }

    setProcessingId(invoice.id);
    try {
        const approveFn = httpsCallable(functions, 'approveInvoice');
        await approveFn({ 
            invoiceId: invoice.id,
            approve: false,
            reason: rejectReason
        });
        
        setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        setModalOpen(false);
        setRejectReason('');
        setShowRejectInput(false);
        alert('Factura rechazada.');
    } catch (error: any) {
        alert('Error: ' + error.message);
    } finally {
        setProcessingId(null);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Facturas Pendientes de Revisión</h1>
          <button onClick={loadPendingInvoices} className="text-blue-600 hover:text-blue-800">
            ↻ Actualizar
          </button>
        </div>

        {isLoading ? (
          <p>Cargando facturas...</p>
        ) : invoices.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <p className="text-gray-500 text-lg">🎉 No hay facturas pendientes de revisión.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {invoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-lg shadow-sm border p-6 flex flex-col md:flex-row gap-6 items-start">
                 {/* Image Thumbnail */}
                 <div className="w-full md:w-32 h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0 cursor-pointer"
                      onClick={() => { setSelectedInvoice(inv); setModalOpen(true); }}>
                    <img src={inv.imageUrl} alt="Factura" className="w-full h-full object-cover hover:scale-110 transition" />
                 </div>

                 {/* Info */}
                 <div className="flex-grow">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg text-blue-900">{inv.storeName || 'Tienda Desconocida'}</h3>
                            <p className="text-sm text-gray-500">Factura #{inv.invoiceNumber}</p>
                            <p className="text-xs text-gray-400">{new Date(inv.createdAt.seconds * 1000).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                             <div className="font-bold text-xl text-green-600">+{inv.pointsEarned || 0} pts</div>
                             <div className="text-sm text-gray-600">${Number(inv.totalAmount).toFixed(2)}</div>
                        </div>
                    </div>
                    
                    {/* Products Summary */}
                    <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
                        <p className="font-medium mb-1 text-gray-700">Productos detectados:</p>
                        <ul className="list-disc list-inside text-gray-600">
                            {inv.products?.slice(0, 3).map((p: any, i: number) => (
                                <li key={i}>{p.quantity}x {p.productName || p.sku} ({p.price})</li>
                            ))}
                            {(inv.products?.length || 0) > 3 && <li>... y {(inv.products?.length || 0) - 3} más</li>}
                        </ul>
                    </div>
                 </div>

                 {/* Actions */}
                 <div className="flex flex-col gap-2 min-w-[150px]">
                    <button 
                        onClick={() => { setSelectedInvoice(inv); setModalOpen(true); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition"
                    >
                        Revisar
                    </button>
                    {/* Quick Actions (Optional) */}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DE REVISIÓN */}
      {modalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-xl">Revisión de Factura #{selectedInvoice.invoiceNumber}</h2>
                <button onClick={() => { setModalOpen(false); setShowRejectInput(false); }} className="text-gray-500 hover:text-black text-2xl">✕</button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
                {/* Left: Image */}
                <div className="w-full md:w-1/2 bg-gray-900 rounded-lg flex items-center justify-center p-2">
                    <img src={selectedInvoice.imageUrl} alt="Full Invoice" className="max-h-[60vh] object-contain" />
                </div>

                {/* Right: Details & Actions */}
                <div className="w-full md:w-1/2 flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-2">Detalles</h3>
                        <p><strong>Tienda:</strong> {selectedInvoice.storeName}</p>
                        <p><strong>Total Factura:</strong> ${selectedInvoice.totalAmount}</p>
                        <p><strong>Puntos Calculados:</strong> <span className="text-green-600 font-bold">{selectedInvoice.pointsEarned}</span></p>
                    </div>

                    <div className="flex-grow">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Productos</h3>
                        <div className="bg-gray-50 rounded border p-2 h-48 overflow-y-auto text-sm">
                            {selectedInvoice.products?.map((p: any, i: number) => (
                                <div key={i} className="flex justify-between py-1 border-b last:border-0 border-gray-200">
                                    <span>{p.quantity}x {p.productName}</span>
                                    <span className="text-gray-500 font-mono">${p.price}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                        {showRejectInput ? (
                            <div className="animate-fadeIn">
                                <label className="block text-sm font-medium text-red-700 mb-1">Motivo del rechazo:</label>
                                <textarea 
                                    className="w-full border border-red-300 rounded p-2 text-sm mb-3 focus:ring-2 focus:ring-red-500 outline-none"
                                    rows={2}
                                    placeholder="Ej: La imagen es ilegible, fecha antigua..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleReject(selectedInvoice)}
                                        disabled={!!processingId}
                                        className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700 font-medium"
                                    >
                                        {processingId ? '...' : 'Confirmar Rechazo'}
                                    </button>
                                    <button 
                                        onClick={() => setShowRejectInput(false)}
                                        className="px-4 py-2 border rounded hover:bg-gray-100"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowRejectInput(true)}
                                    className="border border-red-200 text-red-600 hover:bg-red-50 font-bold py-3 rounded-lg transition"
                                >
                                    ❌ Rechazar
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedInvoice)}
                                    disabled={!!processingId}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-lg transition transform hover:scale-[1.02]"
                                >
                                    {processingId ? 'Procesando...' : '✅ Aprobar & Asignar Puntos'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
