/**
 * OCR Service - Extracción de datos de facturas
 * 
 * Fase 1: Manual (usuario entra datos)
 * Fase 2: ML (modelo sugiere automáticamente)
 * Fase 3: Advanced (validación automática)
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

export interface OCRProduct {
  sku: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface OCRTrainingData {
  id: string;
  invoiceId: string;           // Referencia a factura
  storeId: string;
  countryId: string;
  imageUrl: string;            // URL de imagen subida
  
  // Datos extraídos manualmente (Fase 1)
  manualEntries: OCRProduct[];
  
  // Datos sugeridos por OCR (Fase 2)
  ocrSuggestions?: {
    products: OCRProduct[];
    confidence: number;         // 0-100%
    detectedText?: string;      // Raw OCR text
  };
  
  // Validación
  validated: boolean;
  validator: 'manual' | 'ocr' | 'ml';
  validatedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export const ocrService = {
  /**
   * Crear registro de entrenamiento OCR
   * Se llama después de guardar factura con datos manuales
   */
  async createTrainingData(
    invoiceId: string,
    storeId: string,
    countryId: string,
    imageUrl: string,
    products: OCRProduct[]
  ): Promise<string> {
    try {
      const trainingDataId = `${invoiceId}-ocr`;
      const trainingRef = doc(db, 'ocrTrainingData', trainingDataId);

      const trainingData: OCRTrainingData = {
        id: trainingDataId,
        invoiceId,
        storeId,
        countryId,
        imageUrl,
        manualEntries: products,
        validated: true,
        validator: 'manual',
        validatedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(trainingRef, trainingData);
      console.log('✅ Datos OCR guardados para entrenamientos:', trainingDataId);
      return trainingDataId;
    } catch (error) {
      console.error('❌ Error creando training data:', error);
      throw error;
    }
  },

  /**
   * Obtener datos de entrenamiento por país
   * Útil para exportar y entrenar modelo
   */
  async getTrainingDataByCountry(
    countryId: string,
    limit: number = 1000
  ): Promise<OCRTrainingData[]> {
    try {
      const trainingRef = collection(db, 'ocrTrainingData');
      const q = query(
        trainingRef,
        where('countryId', '==', countryId)
      );

      const snapshot = await getDocs(q);
      const data: OCRTrainingData[] = [];

      snapshot.forEach((doc) => {
        data.push(doc.data() as OCRTrainingData);
      });

      console.log(`📊 ${data.length} registros de entrenamiento en ${countryId}`);
      return data.slice(0, limit);
    } catch (error) {
      console.error('❌ Error obteniendo training data:', error);
      throw error;
    }
  },

  /**
   * Exportar datos para entrenar modelo ML
   * Formato: JSON Lines para Vertex AI
   */
  async exportForMLTraining(
    countryId: string
  ): Promise<{
    totalRecords: number;
    jsonlContent: string;
    fileName: string;
  }> {
    try {
      const trainingData = await ocrService.getTrainingDataByCountry(countryId);

      // Convertir a formato JSONL para Google Vertex AI
      const jsonlLines = trainingData.map((record) => {
        return JSON.stringify({
          imageGcs: record.imageUrl,           // Must be GCS path
          text: record.manualEntries
            .map((p) => `${p.sku}|${p.productName}|${p.quantity}|${p.price}`)
            .join(';'),
          set: 'TRAINING',                    // or VALIDATION/TEST
        });
      });

      const jsonlContent = jsonlLines.join('\n');
      const fileName = `training_data_${countryId}_${Date.now()}.jsonl`;

      console.log(`📤 Exportados ${trainingData.length} registros para ML`);
      return {
        totalRecords: trainingData.length,
        jsonlContent,
        fileName,
      };
    } catch (error) {
      console.error('❌ Error exportando para ML:', error);
      throw error;
    }
  },

  /**
   * Guardar sugerencias de OCR (desde Cloud Function)
   * Se llamará cuando esté disponible la integración con Vision API
   */
  async saveSuggestions(
    trainingDataId: string,
    suggestions: OCRProduct[],
    confidence: number,
    detectedText?: string
  ): Promise<void> {
    try {
      const trainingRef = doc(db, 'ocrTrainingData', trainingDataId);
      
      await setDoc(
        trainingRef,
        {
          ocrSuggestions: {
            products: suggestions,
            confidence,
            detectedText,
          },
          updatedAt: new Date(),
        },
        { merge: true }
      );

      console.log(`✅ Sugerencias OCR guardadas (${confidence}% confianza)`);
    } catch (error) {
      console.error('❌ Error guardando sugerencias:', error);
      throw error;
    }
  },

  /**
   * Validar sugerencias de OCR
   * Usuario acepta o rechaza sugerencias
   */
  async validateOCRSuggestions(
    trainingDataId: string,
    accepted: boolean,
    correctedProducts?: OCRProduct[]
  ): Promise<void> {
    try {
      const trainingRef = doc(db, 'ocrTrainingData', trainingDataId);

      const updateData: any = {
        validated: true,
        validator: 'ocr',
        validatedAt: new Date(),
        updatedAt: new Date(),
      };

      // Si usuario rechazó, guardar las correcciones
      if (!accepted && correctedProducts) {
        updateData.manualEntries = correctedProducts;
        updateData.validator = 'manual'; // Cambiar a manual si hay correcciones
      }

      await setDoc(trainingRef, updateData, { merge: true });
      
      console.log(
        `✅ Sugerencias OCR validadas (${accepted ? 'aceptadas' : 'corregidas'})`
      );
    } catch (error) {
      console.error('❌ Error validando OCR:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de OCR por país
   * Para monitoreo y mejora del modelo
   */
  async getOCRStats(countryId: string): Promise<{
    totalRecords: number;
    manualOnly: number;
    withOCRSuggestions: number;
    avgConfidence: number;
  }> {
    try {
      const data = await ocrService.getTrainingDataByCountry(countryId, 10000);

      const withOCR = data.filter((d) => d.ocrSuggestions).length;
      const manualOnly = data.length - withOCR;
      
      const totalConfidence = data
        .filter((d) => d.ocrSuggestions)
        .reduce((sum, d) => sum + (d.ocrSuggestions?.confidence || 0), 0);
      
      const avgConfidence = withOCR > 0 ? totalConfidence / withOCR : 0;

      return {
        totalRecords: data.length,
        manualOnly,
        withOCRSuggestions: withOCR,
        avgConfidence: Math.round(avgConfidence),
      };
    } catch (error) {
      console.error('❌ Error obteniendo stats:', error);
      throw error;
    }
  },

  /**
   * Simular sugerencias OCR (para testing Fase 2)
   * En producción, esto vendría de Google Vision API
   */
  async mockOCRSuggestions(
    products: OCRProduct[]
  ): Promise<OCRProduct[]> {
    // Simular detección del 85% de exactitud
    return products.map((p) => ({
      ...p,
      // Podría variar SKU o nombre ligeramente para simular error
      quantity: p.quantity + (Math.random() > 0.85 ? 1 : 0),
    }));
  },
};
