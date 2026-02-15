'use client';

import React, { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/context/AuthContext';
import { invoiceService } from '@/services/invoiceService';
import Link from 'next/link';

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  imageUrl: string;
}

export default function InvoicesPage() {
  const { currentUser, loading } = useRequireAuth(['STORE']);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!loading && currentUser) {
      loadInvoices();
    }
  }, [loading, currentUser]);

  const loadInvoices = async () => {
    try {
      setLoadingInvoices(true);
      // TODO: Implement getInvoicesByStore in invoiceService
      // const data = await invoiceService.getInvoicesByStore(currentUser!.uid);
      // setInvoices(data);
      setInvoices([]);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  const filteredInvoices = filter === 'ALL' 
    ? invoices 
    : invoices.filter((inv) => inv.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return '⏳ En Revisión';
      case 'APPROVED':
        return '✅ Aprobada';
      case 'REJECTED':
        return '❌ Rechazada';
      default:
        return 'Desconocido';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-900">Mis Facturas</h1>
          <Link
            href="/store/dashboard"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({invoices.length})
            </button>
            <button
              onClick={() => setFilter('PENDING_REVIEW')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'PENDING_REVIEW'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              En Revisión ({invoices.filter((i) => i.status === 'PENDING_REVIEW').length})
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'APPROVED'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Aprobadas ({invoices.filter((i) => i.status === 'APPROVED').length})
            </button>
            <button
              onClick={() => setFilter('REJECTED')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'REJECTED'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Rechazadas ({invoices.filter((i) => i.status === 'REJECTED').length})
            </button>
          </div>
        </div>

        {/* Table */}
        {loadingInvoices ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Cargando facturas...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">No hay facturas para mostrar</p>
            <Link
              href="/store/uploads"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              + Cargar Factura
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Proveedor
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {invoice.supplierName}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        ${invoice.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            invoice.status
                          )}`}
                        >
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                Factura #{selectedInvoice.invoiceNumber}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Proveedor</p>
                  <p className="font-semibold text-gray-900">
                    {selectedInvoice.supplierName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-semibold text-gray-900">
                    ${selectedInvoice.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <p className="font-semibold">
                    {getStatusLabel(selectedInvoice.status)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Image */}
              {selectedInvoice.imageUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Imagen</p>
                  <img
                    src={selectedInvoice.imageUrl}
                    alt="Factura"
                    className="w-full max-h-96 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="border-t p-6 flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium"
              >
                Cerrar
              </button>
              <Link
                href="/store/uploads"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-center"
              >
                + Nueva Factura
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
