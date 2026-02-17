'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useAuth } from '@/context/AuthContext';
import { invoiceService } from '@/services/invoiceService';
import { ocrService, OCRProduct } from '@/services/ocrService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import Link from 'next/link';

interface Product {
  sku: string;
  productName: string;
  quantity: number;
  price: number;
}

export default function UploadInvoicePage() {
  const { currentUser, loading } = useRequireAuth(['STORE']);
  const [step, setStep] = useState<'upload' | 'ocr' | 'success'>('upload');
  
  // Upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  // OCR Data
  const [products, setProducts] = useState<Product[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierName, setSupplierName] = useState('');
  
  // Logs & UI
  const [processing, setProcessing] = useState(false);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  // Dropzone handlers
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      if (!file.type.startsWith('image/')) {
        setError('❌ Solo se aceptan archivos de imagen');
        return;
      }

      setImageFile(file);
      setError(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Don't auto advance, let used click "Analyze"
      // setStep('ocr'); 
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] },
    maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!imageFile) return;

    setProcessing(true);
    setAnalysisLogs(['🚀 Iniciando análisis de imagen...', '📤 Preparando envío seguro...']);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onload = async () => {
        try {
          const base64Image = (reader.result as string).split(',')[1];
          setAnalysisLogs(prev => [...prev, '🔍 Enviando a motor de IA (Cloud Vision)...']);

          // Call Cloud Function
          const analyzeInvoice = httpsCallable(functions, 'analyzeInvoice');
          const result = await analyzeInvoice({ 
            imageBase64: base64Image,
            countryId: currentUser?.countryId || 'CO'
          });

          const data = result.data as any;
          setAnalysisLogs(prev => [...prev, '✅ Análisis completado exitosamente.']);

          if (data.invoiceNumber) {
            setInvoiceNumber(data.invoiceNumber);
            setAnalysisLogs(prev => [...prev, `📝 Factura detectada: ${data.invoiceNumber}`]);
          }
          
          if (data.date) {
            setInvoiceDate(data.date);
          }

          if (data.items && data.items.length > 0) {
            setProducts(data.items);
            setAnalysisLogs(prev => [...prev, `📦 ${data.items.length} productos identificados.`]);
          } else {
            setAnalysisLogs(prev => [...prev, '⚠️ No se identificaron productos automáticamente.']);
          }

          // Small delay to show logs
          setTimeout(() => setStep('ocr'), 1500);

        } catch (err: any) {
          console.error(err);
          setError('Error en el análisis inteligente. Por favor ingrese los datos manualmente.');
          setStep('ocr');
        } finally {
          setProcessing(false);
        }
      };
    } catch (err) {
      console.error(err);
      setProcessing(false);
      setStep('ocr');
    }
  };

  const addProduct = () => {
    setProducts([
      ...products,
      { sku: '', productName: '', quantity: 0, price: 0 },
    ]);
  };

  const updateProduct = (index: number, field: keyof Product, value: any) => {
    const newProducts = [...products];
    newProducts[index] = { ...newProducts[index], [field]: value };
    setProducts(newProducts);
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!invoiceNumber.trim()) {
      setError('❌ Ingrese número de factura');
      return;
    }

    if (products.length === 0) {
      setError('❌ Ingrese al menos un producto');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Create invoice
      const invoiceResult = await invoiceService.createInvoice({
        storeId: currentUser!.uid,
        storeName: currentUser!.email || 'Tienda',
        countryId: currentUser!.countryId || 'CO',
        invoiceNumber: invoiceNumber, // <-- Passing the invoice number from state
        imageFile: imageFile!,
        products: products.map((p) => ({
          sku: p.sku.toUpperCase() || 'GENERIC',
          name: p.productName,
          quantity: Number(p.quantity),
          price: Number(p.price),
        })),
        totalAmount: products.reduce((sum, p) => sum + p.quantity * p.price, 0),
      });

      const invoiceId = invoiceResult.invoiceId;

      // 2. Get image URL (for training data)
      const invoice = await invoiceService.getInvoice(invoiceId);
      const imageUrl = invoice?.imageUrl || '';

      // 3. Save training data (Phase 2 ML)
      await ocrService.createTrainingData(
        invoiceId,
        currentUser!.uid,
        currentUser!.countryId || 'CO',
        imageUrl,
        products as OCRProduct[]
      );

      setSuccessMessage(
        `✅ Factura #${invoiceNumber} enviada a revisión. Un distribuidor verificará los puntos pronto.`
      );
      setStep('success');

    } catch (err: any) {
        // Validación de duplicados
        if (err.message && (err.message.includes('ya existe') || err.message.includes('already-exists'))) {
             setError('❌ No se puede validar la factura porque los puntos de este número de factura ya fueron adquiridos antes.');
        } else {
             setError(`❌ Error: ${err.message}`);
        }
    } finally {
      setUploading(false);
    }
  };
   
  const resetForm = () => {
      setImageFile(null);
      setImagePreview('');
      setProducts([]);
      setInvoiceNumber('');
      setAnalysisLogs([]);
      setStep('upload');
      setSuccessMessage('');
  };

  // RENDER: STEP 1 (UPLOAD)
  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📸 Escanear Factura</h1>
            <p className="text-gray-600 mb-8">
              Sube una foto de la factura. Nuestra IA detectará los productos automáticamente.
            </p>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-6xl mb-4">📷</div>
              {imageFile ? (
                <p className="text-lg font-medium text-blue-600">{imageFile.name}</p>
              ) : (
                <>
                  <p className="text-gray-700 font-medium mb-2">
                    Arrastra tu factura aquí
                  </p>
                  <p className="text-gray-500 text-sm">o haz clic para buscar</p>
                </>
              )}
            </div>

            {/* PREVIEW AND ANALYZE BUTTON */}
            {imagePreview && (
              <div className="mt-6 animate-fadeIn">
                <div className="relative h-64 rounded-lg overflow-hidden bg-gray-100 border mb-6">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                </div>
                
                <button
                  onClick={handleAnalyze}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center transition-all transform hover:scale-[1.02]"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analizando Factura con IA...
                    </>
                  ) : (
                    <>✨ Detectar Productos (OCR)</>
                  )}
                </button>
                
                {/* LOGS */}
                {analysisLogs.length > 0 && (
                  <div className="mt-4 bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-32 overflow-y-auto border border-gray-700 shadow-inner">
                    {analysisLogs.map((log, i) => (
                      <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                        <span className="text-blue-400 mr-2">[{new Date().toLocaleTimeString()}]</span>
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-6 text-red-600 text-sm p-3 bg-red-50 rounded border border-red-200">
                {error}
              </div>
            )}
            
            <div className="mt-8 text-center">
                 <Link href="/store/dashboard" className="text-gray-500 hover:underline">Cancelar</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: STEP 2 (OCR EDIT)
  if (step === 'ocr') {
    const totalAmount = products.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.price) || 0), 0);

    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">📝 Resultados del Análisis</h1>
            <button
               onClick={() => setStep('upload')}
               className="text-blue-600 hover:underline"
            >
              ← Volver a subir
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Side */}
            <div className="bg-white rounded-lg shadow p-4 h-fit sticky top-4">
              <h3 className="font-semibold mb-2">Factura Original</h3>
              {imagePreview && (
                <img src={imagePreview} alt="Factura" className="w-full rounded border" />
              )}
            </div>

            {/* Form Side */}
            <div className="bg-white rounded-lg shadow p-6">
               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">N° Factura</label>
                    <input 
                      value={invoiceNumber} 
                      disabled={true}
                      className="w-full border rounded px-3 py-2 bg-gray-100/50 text-gray-600 cursor-not-allowed"
                      title="El número de factura es extraído automáticamente y no puede ser editado."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input 
                      type="date"
                      value={invoiceDate} 
                      onChange={e => setInvoiceDate(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
               </div>

               <div className="mb-4 flex justify-between items-end">
                 <h3 className="font-semibold">Productos Detectados</h3>
                 <button onClick={addProduct} className="text-sm text-blue-600 border border-blue-600 px-3 py-1 rounded hover:bg-blue-50">
                    + Item Manual
                 </button>
               </div>

               <div className="space-y-4 mb-8">
                 {products.map((p, i) => (
                   <div key={i} className="flex gap-2 items-start bg-gray-50 p-3 rounded border border-dashed border-gray-300">
                      <div className="grid grid-cols-12 gap-2 w-full">
                        <div className="col-span-5">
                            <label className="text-xs text-gray-500">Producto</label>
                            <input 
                              value={p.productName} 
                              onChange={e => updateProduct(i, 'productName', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm font-medium"
                            />
                             <div className="text-xs text-gray-400 mt-1">SKU: {p.sku || 'N/A'}</div>
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs text-gray-500">Cant.</label>
                            <input 
                              type="number"
                              value={p.quantity} 
                              onChange={e => updateProduct(i, 'quantity', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="text-xs text-gray-500">$$ Unit.</label>
                            <input 
                              type="number"
                              value={p.price} 
                              onChange={e => updateProduct(i, 'price', e.target.value)}
                              className="w-full border rounded px-2 py-1 text-sm"
                            />
                        </div>
                      </div>
                      <button onClick={() => removeProduct(i)} className="text-red-500 mt-4 px-2">×</button>
                   </div>
                 ))}
               </div>

               <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center mb-6 border border-green-200">
                  <span className="font-medium text-green-800">Total Calculado</span>
                  <span className="font-bold text-2xl text-green-700">${totalAmount.toFixed(2)}</span>
               </div>

               {error && (
                  <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                      <strong className="font-bold block mb-1">No se pudo enviar:</strong>
                      <span className="block sm:inline">{error}</span>
                  </div>
               )}

               <button 
                  onClick={handleSubmit} 
                  disabled={uploading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow"
                >
                  {uploading ? 'Validando...' : '✅ Confirmar Datos y Enviar'}
               </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: SUCCESS
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
       <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Factura Enviada!</h2>
          <p className="text-gray-600 mb-8">{successMessage}</p>
          <div className="space-y-3">
            <button onClick={resetForm} className="w-full py-3 border rounded-lg hover:bg-gray-50 font-medium">Subir otra</button>
            <Link href="/store/dashboard" className="block w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
              Ir al Dashboard
            </Link>
          </div>
       </div>
    </div>
  );
}

