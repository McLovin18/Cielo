'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import productService from '@/services/productService';
import { GlobalProduct, CountryProduct } from '@/types';

export default function AdminProductsPage() {
  useRequireAuth(['ADMIN_COUNTRY']);
  const { currentUser } = useAuth();

  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [countryProducts, setCountryProducts] = useState<Record<string, CountryProduct>>({});
  const [loading, setLoading] = useState(true);

  // Estado del formulario de edición
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    localName: '',
    pointsValue: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (!currentUser?.countryId) {
        console.error('❌ No country ID found');
        return;
      }

      // Cargar productos globales
      const products = await productService.getGlobalProducts();
      setGlobalProducts(products);

      // Cargar configuraciones por país
      const countryProds = await productService.getCountryProducts(currentUser.countryId);
      const countryProdsMap: Record<string, CountryProduct> = {};
      countryProds.forEach((cp) => {
        countryProdsMap[cp.globalProductId] = cp;
      });
      setCountryProducts(countryProdsMap);

      console.log(
        `✅ Cargados ${products.length} productos globales, ${countryProds.length} configurados para país`
      );
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (globalProduct: GlobalProduct) => {
    const countryConfig = countryProducts[globalProduct.id];

    setEditingProductId(globalProduct.id);
    setFormData({
      sku: countryConfig?.sku || globalProduct.sku,
      localName: countryConfig?.localName || globalProduct.name,
      pointsValue: countryConfig?.pointsValue || globalProduct.pointsValue,
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.sku.trim()) {
      errors.sku = 'El código SKU es requerido';
    } else if (!/^[A-Z0-9\-]+$/.test(formData.sku.toUpperCase())) {
      errors.sku = 'El SKU solo puede contener letras, números y guiones';
    }

    if (!formData.localName.trim()) {
      errors.localName = 'El nombre local es requerido';
    }

    if (formData.pointsValue <= 0) {
      errors.pointsValue = 'Los puntos deben ser mayor a 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !editingProductId || !currentUser?.countryId) return;

    try {
      setSubmitting(true);

      const globalProduct = globalProducts.find((p) => p.id === editingProductId);
      if (!globalProduct) throw new Error('Producto global no encontrado');

      const countryConfig = countryProducts[editingProductId];

      if (countryConfig) {
        // Actualizar configuración existente
        console.log(`🔄 Actualizando configuración del país para ${globalProduct.name}`);
        await productService.updateCountryProduct(countryConfig.id, {
          sku: formData.sku.toUpperCase(),
          localName: formData.localName,
          pointsValue: formData.pointsValue,
        });
      } else {
        // Crear nueva configuración
        console.log(`✨ Creando configuración del país para ${globalProduct.name}`);
        await productService.createCountryProduct({
          globalProductId: editingProductId,
          countryId: currentUser.countryId,
          sku: formData.sku.toUpperCase(),
          localName: formData.localName,
          pointsValue: formData.pointsValue,
          status: 'active',
        });
      }

      // Limpiar y recargar
      setEditingProductId(null);
      setFormData({ sku: '', localName: '', pointsValue: 0 });
      await loadData();
    } catch (error: any) {
      console.error('❌ Error guardando producto:', error);
      setFormErrors({
        submit: error.message || 'Error al guardar el producto',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (globalProductId: string, productName: string) => {
    const countryConfig = countryProducts[globalProductId];
    if (!countryConfig) return;

    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar la configuración de "${productName}" de tu inventario?`
      )
    ) {
      return;
    }

    try {
      console.log(`🗑️ Eliminando configuración del producto: ${productName}`);
      await productService.deleteCountryProduct(countryConfig.id);
      await loadData();
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', error);
      alert(error.message);
    }
  };

  const handleCancel = () => {
    setEditingProductId(null);
    setFormData({ sku: '', localName: '', pointsValue: 0 });
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            📝 Configurar Productos por País
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Personaliza los productos globales para tu país: nombre local, código SKU y puntos
          </p>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            💡 <strong>Nota:</strong> Estos son los productos globales de la empresa. Puedes
            modificar su nombre local, código SKU y puntos asignados para tu país. No puedes
            agregar nuevos productos - eso lo controla la empresa a nivel global.
          </p>
        </div>

        {/* Lista de productos */}
        <div className="space-y-4">
          {globalProducts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <p className="text-gray-600 dark:text-gray-400">No hay productos registrados</p>
            </div>
          ) : (
            globalProducts.map((product) => {
              const countryConfig = countryProducts[product.id];
              const isEditing = editingProductId === product.id;

              return (
                <div
                  key={product.id}
                  className={`bg-white dark:bg-gray-900 rounded-lg shadow transition border ${
                    isEditing
                      ? 'border-blue-500 dark:border-blue-400 ring-1 ring-blue-200 dark:ring-blue-700'
                      : 'border-gray-200 dark:border-gray-800 hover:shadow-lg'
                  } p-6`}
                >
                  {/* Vista Normal */}
                  {!isEditing && (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {product.name}
                          </h3>
                          {countryConfig && (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-semibold">
                              ✓ Configurado
                            </span>
                          )}
                          {!countryConfig && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">
                              Sin configurar
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                              SKU Global
                            </p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                              {product.sku}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                              SKU Local
                            </p>
                            <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                              {countryConfig?.sku || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                              Puntos Global
                            </p>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {product.pointsValue}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-semibold">
                              Puntos Local
                            </p>
                            <p className="font-bold text-blue-600 dark:text-blue-400">
                              {countryConfig?.pointsValue || '—'}
                            </p>
                          </div>
                        </div>

                        {countryConfig && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Nombre local:
                            </p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {countryConfig.localName}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => startEditing(product)}
                          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition font-semibold"
                        >
                          {countryConfig ? '✏️ Editar' : '➕ Agregar'}
                        </button>
                        {countryConfig && (
                          <button
                            onClick={() =>
                              handleDelete(product.id, product.name)
                            }
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition font-semibold"
                          >
                            🗑️ Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vista de Edición */}
                  {isEditing && (
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                          Editando: {product.name}
                        </h3>

                        {formErrors.submit && (
                          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                            {formErrors.submit}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* SKU Local */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Código SKU Local *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    sku: e.target.value,
                                  }))
                                }
                                placeholder={product.sku}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                              />
                              <span className="absolute right-3 top-3 text-xs text-gray-500 dark:text-gray-400">
                                Global: {product.sku}
                              </span>
                            </div>
                            {formErrors.sku && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                                {formErrors.sku}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Código que se leerá en facturas de tu país
                            </p>
                          </div>

                          {/* Nombre Local */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Nombre Local *
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={formData.localName}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    localName: e.target.value,
                                  }))
                                }
                                placeholder={product.name}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            {formErrors.localName && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                                {formErrors.localName}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Traducción o versión local del nombre
                            </p>
                          </div>

                          {/* Puntos */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                              Puntos por Unidad *
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="0.5"
                                step="0.5"
                                value={formData.pointsValue}
                                onChange={(e) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    pointsValue: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="absolute right-3 top-3 text-xs text-gray-500 dark:text-gray-400">
                                Global: {product.pointsValue}
                              </span>
                            </div>
                            {formErrors.pointsValue && (
                              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                                {formErrors.pointsValue}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Sobrescribe el valor global para tu país
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-semibold"
                        >
                          {submitting ? 'Guardando...' : '💾 Guardar Cambios'}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="flex-1 px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
