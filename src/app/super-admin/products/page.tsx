'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import productService from '@/services/productService';
import { GlobalProduct, Country } from '@/types';

export default function SuperAdminProductsPage() {
  useRequireAuth(['SUPER_ADMIN']);
  const { currentUser } = useAuth();

  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'global'>('global');

  // Estado del formulario
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    brand: '',
    category: '',
    pointsValue: 0,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Cargar productos y países
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar productos globales
      const products = await productService.getGlobalProducts();
      setGlobalProducts(products);

      // Cargar países
      const countriesQuery = query(
        collection(db, 'countries'),
        orderBy('name', 'asc')
      );
      const countriesSnapshot = await getDocs(countriesQuery);
      const countriesData = countriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Country));
      setCountries(countriesData);

      console.log(`✅ Datos cargados: ${products.length} productos, ${countriesData.length} países`);
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'El nombre del producto es requerido';
    }

    if (!formData.sku.trim()) {
      errors.sku = 'El código SKU es requerido';
    } else if (!/^[A-Z0-9\-]+$/.test(formData.sku.toUpperCase())) {
      errors.sku = 'El SKU solo puede contener letras, números y guiones';
    }

    if (!formData.category.trim()) {
      errors.category = 'La categoría es requerida';
    }

    if (formData.pointsValue <= 0) {
      errors.pointsValue = 'Los puntos deben ser mayor a 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);
      console.log(`📦 Creando nuevo producto...`);

      await productService.createGlobalProduct({
        name: formData.name,
        sku: formData.sku.toUpperCase(),
        brand: formData.brand,
        category: formData.category,
        pointsValue: formData.pointsValue,
        status: 'active',
      });

      // Limpiar formulario y recargar
      setFormData({
        name: '',
        sku: '',
        brand: '',
        category: '',
        pointsValue: 0,
      });
      setShowForm(false);
      await loadData();
    } catch (error: any) {
      console.error('❌ Error creando producto:', error);
      setFormErrors({
        submit: error.message || 'Error al crear el producto',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (
      !window.confirm(
        `¿Estás seguro de que deseas eliminar el producto "${productName}"? Se eliminarán también todas sus configuraciones por país.`
      )
    ) {
      return;
    }

    try {
      await productService.deleteGlobalProduct(productId);
      await loadData();
    } catch (error: any) {
      console.error('❌ Error eliminando producto:', error);
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
            📦 Inventario Global de Productos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona los productos de la empresa para todos los países
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('global')}
            className={`px-6 py-3 font-semibold transition ${
              activeTab === 'global'
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            Productos Globales
          </button>
        </div>

        {/* TAB: Productos Globales */}
        {activeTab === 'global' && (
          <div>
            {/* Botón crear */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  {globalProducts.length} productos registrados
                </p>
              </div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
              >
                {showForm ? '✕ Cancelar' : '+ Nuevo Producto'}
              </button>
            </div>

            {/* Formulario */}
            {showForm && (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 mb-8 border border-gray-200 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Crear Nuevo Producto
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
                        Nombre del Producto *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Ej: Agua Purificada 500ml"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {formErrors.name && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {formErrors.name}
                        </p>
                      )}
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Código SKU *
                      </label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, sku: e.target.value }))
                        }
                        placeholder="Ej: AGUA-500-PUR"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                      {formErrors.sku && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {formErrors.sku}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Este código se leerá desde las facturas OCR
                      </p>
                    </div>

                    {/* Marca */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, brand: e.target.value }))
                        }
                        placeholder="Ej: CIELO"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    {/* Categoría */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Categoría *
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, category: e.target.value }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Seleccionar categoría</option>
                        <option value="agua">Agua</option>
                        <option value="bebidas">Bebidas</option>
                        <option value="alimentos">Alimentos</option>
                        <option value="otros">Otros</option>
                      </select>
                      {formErrors.category && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {formErrors.category}
                        </p>
                      )}
                    </div>

                    {/* Puntos */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        Puntos por Unidad *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.5"
                        value={formData.pointsValue}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, pointsValue: parseFloat(e.target.value) || 0 }))
                        }
                        placeholder="Ej: 5"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      {formErrors.pointsValue && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          {formErrors.pointsValue}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Se sumarán estos puntos cuando se cargue una factura con este producto
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition font-semibold"
                    >
                      {submitting ? 'Creando...' : 'Crear Producto'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de productos */}
            <div className="space-y-4">
              {globalProducts.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No hay productos registrados
                  </p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                  >
                    Crear primer producto
                  </button>
                </div>
              ) : (
                globalProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {product.name}
                          </h3>
                          <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-semibold">
                            {product.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm mt-3">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">SKU</p>
                            <p className="font-mono font-semibold text-gray-900 dark:text-white">
                              {product.sku}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Marca</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {product.brand || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Categoría</p>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {product.category}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Puntos</p>
                            <p className="font-bold text-orange-600 dark:text-orange-400 text-lg">
                              {product.pointsValue} ⭐
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDeleteProduct(product.id, product.name)
                        }
                        className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition font-semibold"
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
