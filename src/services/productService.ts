import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { GlobalProduct, CountryProduct } from '@/types';

// Tipos de compatibilidad para el código existente
export interface Product {
  id: string;
  name: string;
  sku: string; // SKU global para OCR
  brand?: string;
  category?: string;
  status?: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

class ProductService {
  /**
   * ===== PRODUCTOS GLOBALES =====
   * Estos son los productos principales de la empresa (iguales en todos los países)
   * Ej: Agua 500ml, Agua 1L, Agua 5L, etc.
   */

  async createGlobalProduct(
    data: Omit<GlobalProduct, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(`📦 Creando producto global: ${data.name}`);

      // Validar que el SKU sea único
      const existingSku = query(
        collection(db, 'globalProducts'),
        where('sku', '==', data.sku.toUpperCase())
      );
      const existingSnapshot = await getDocs(existingSku);
      if (!existingSnapshot.empty) {
        throw new Error(`El SKU "${data.sku}" ya existe. Debe ser único.`);
      }

      // Validar que pointsValue sea positivo
      if (data.pointsValue <= 0) {
        throw new Error('Los puntos deben ser mayor a 0');
      }

      const productData = {
        ...data,
        sku: data.sku.toUpperCase(),
        pointsValue: data.pointsValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'globalProducts'), productData);
      console.log(`✅ Producto global creado: ${docRef.id} (${data.pointsValue} puntos)`);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error creando producto global:', error);
      throw error;
    }
  }

  async getGlobalProducts(): Promise<GlobalProduct[]> {
    try {
      const productsQuery = query(
        collection(db, 'globalProducts'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(productsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as GlobalProduct));
    } catch (error) {
      console.error('❌ Error obteniendo productos globales:', error);
      throw error;
    }
  }

  async getGlobalProduct(id: string): Promise<GlobalProduct | null> {
    try {
      const docRef = doc(db, 'globalProducts', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as GlobalProduct;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo producto global:', error);
      throw error;
    }
  }

  async updateGlobalProduct(
    id: string,
    data: Partial<Omit<GlobalProduct, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      console.log(`🔄 Actualizando producto global: ${id}`);
      const docRef = doc(db, 'globalProducts', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
      console.log(`✅ Producto global actualizado`);
    } catch (error) {
      console.error('❌ Error actualizando producto global:', error);
      throw error;
    }
  }

  async deleteGlobalProduct(id: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando producto global: ${id}`);

      // Primero eliminar todos los productos de país asociados
      const countryProductsQuery = query(
        collection(db, 'countryProducts'),
        where('globalProductId', '==', id)
      );
      const countryProductsSnapshot = await getDocs(countryProductsQuery);
      for (const docItem of countryProductsSnapshot.docs) {
        await deleteDoc(docItem.ref);
      }

      // Luego eliminar el producto global
      await deleteDoc(doc(db, 'globalProducts', id));
      console.log(`✅ Producto global eliminado`);
    } catch (error) {
      console.error('❌ Error eliminando producto global:', error);
      throw error;
    }
  }

  async getProductBySku(sku: string): Promise<GlobalProduct | null> {
    try {
      const q = query(collection(db, 'globalProducts'), where('sku', '==', sku.toUpperCase()));
      const snapshot = await getDocs(q);
      if (snapshot.docs.length > 0) {
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
        } as GlobalProduct;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo producto por SKU:', error);
      throw error;
    }
  }

  /**
   * Obtiene el valor de puntos efectivo para un producto en un país
   * Prioridad:
   * 1. Si existe CountryProduct → usa su pointsValue
   * 2. Si no → usa GlobalProduct.pointsValue
   */
  async getEffectivePointsValue(
    globalProductId: string,
    countryId?: string
  ): Promise<number> {
    try {
      // Obtener producto global primero
      const globalDocRef = doc(db, 'globalProducts', globalProductId);
      const globalDocSnap = await getDoc(globalDocRef);
      
      if (!globalDocSnap.exists()) {
        throw new Error(`Producto global ${globalProductId} no encontrado`);
      }

      const globalProduct = globalDocSnap.data() as GlobalProduct;
      
      // Si no hay countryId, retornar valor global
      if (!countryId) {
        return globalProduct.pointsValue;
      }

      // Buscar CountryProduct
      const countryProductQuery = query(
        collection(db, 'countryProducts'),
        where('globalProductId', '==', globalProductId),
        where('countryId', '==', countryId)
      );
      const countrySnapshot = await getDocs(countryProductQuery);
      
      if (!countrySnapshot.empty) {
        const countryProduct = countrySnapshot.docs[0].data() as CountryProduct;
        console.log(
          `📍 Usando puntos por país: ${countryProduct.pointsValue} (vs global: ${globalProduct.pointsValue})`
        );
        return countryProduct.pointsValue;
      }

      // Si no existe CountryProduct, retornar global
      console.log(
        `📍 Usando puntos globales: ${globalProduct.pointsValue} (no hay config por país)`
      );
      return globalProduct.pointsValue;
    } catch (error) {
      console.error('❌ Error obteniendo valor efectivo de puntos:', error);
      throw error;
    }
  }

  /**
   * ===== PRODUCTOS POR PAÍS =====
   * Estos productos heredan del producto global pero tienen configuración específica
   * por país (nombre local, puntos, etc.)
   */

  async createCountryProduct(
    data: Omit<CountryProduct, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      console.log(`🌍 Creando producto para país: ${data.countryId}`);

      // Validar que no existe ya para este país y producto global
      const existingQuery = query(
        collection(db, 'countryProducts'),
        where('globalProductId', '==', data.globalProductId),
        where('countryId', '==', data.countryId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      if (!existingSnapshot.empty) {
        throw new Error(`Este producto ya existe para el país ${data.countryId}`);
      }

      const productData = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'countryProducts'), productData);
      console.log(`✅ Producto de país creado: ${docRef.id}`);
      return docRef.id;
    } catch (error: any) {
      console.error('❌ Error creando producto de país:', error);
      throw error;
    }
  }

  async getCountryProducts(countryId: string): Promise<CountryProduct[]> {
    try {
      const productsQuery = query(
        collection(db, 'countryProducts'),
        where('countryId', '==', countryId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(productsQuery);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as CountryProduct));
    } catch (error) {
      console.error('❌ Error obteniendo productos de país:', error);
      throw error;
    }
  }

  async getCountryProduct(id: string): Promise<CountryProduct | null> {
    try {
      const docRef = doc(db, 'countryProducts', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
        } as CountryProduct;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo producto de país:', error);
      throw error;
    }
  }

  async updateCountryProduct(
    id: string,
    data: Partial<Omit<CountryProduct, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      console.log(`🔄 Actualizando producto de país: ${id}`);
      const docRef = doc(db, 'countryProducts', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date(),
      });
      console.log(`✅ Producto de país actualizado`);
    } catch (error) {
      console.error('❌ Error actualizando producto de país:', error);
      throw error;
    }
  }

  async deleteCountryProduct(id: string): Promise<void> {
    try {
      console.log(`🗑️ Eliminando producto de país: ${id}`);
      await deleteDoc(doc(db, 'countryProducts', id));
      console.log(`✅ Producto de país eliminado`);
    } catch (error) {
      console.error('❌ Error eliminando producto de país:', error);
      throw error;
    }
  }
}

export default new ProductService();
