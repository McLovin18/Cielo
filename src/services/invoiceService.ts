import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
  deleteDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Invoice } from '@/types';

interface CreateInvoiceData {
  storeId: string;
  storeName: string;
  countryId: string;
  invoiceNumber: string; // <-- Add this field
  imageFile: File;
  products: {
    sku: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
}

interface InvoiceQueryOptions {
  storeId?: string;
  countryId?: string;
  status?: Invoice['status'];
  limit?: number;
}

export const invoiceService = {
  /**
   * Crear una nueva factura
   * La validación y cálculo de puntos se hace en Cloud Functions
   */
  async createInvoice(data: CreateInvoiceData): Promise<{ invoiceId: string }> {
    try {
      // Validar datos básicos
      if (!data.storeId || !data.imageFile || !data.products.length) {
        throw new Error('Datos incompletos para la factura');
      }

      // Subir imagen a Storage
      const storageRef = ref(
        storage,
        `invoices/${data.storeId}/${Date.now()}-${data.imageFile.name}`
      );
      const uploadResult = await uploadBytes(storageRef, data.imageFile);
      const imageUrl = await getDownloadURL(uploadResult.ref);

      // Crear documento de factura
      const invoiceData: Omit<Invoice, 'id' | 'distributorId'> = {
        storeId: data.storeId,
        storeName: data.storeName,
        countryId: data.countryId,
        invoiceNumber: data.invoiceNumber || new Date().getTime().toString(), 
        invoiceDate: new Date(),
        imageUrl,
        totalAmount: data.totalAmount,
        totalPoints: 0, // Se calculará en Cloud Function
        status: 'pending',
        createdAt: new Date(),
      };

      const docRef = await addDoc(collection(db, 'invoices'), {
        ...invoiceData,
        distributorId: '', // Será asignado por Cloud Function
      });

      return { invoiceId: docRef.id };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtener una factura por ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const docRef = doc(db, 'invoices', invoiceId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate(),
        } as Invoice;
      }
      return null;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtener facturas de un tendero
   */
  async getStoreInvoices(storeId: string, limit = 50): Promise<Invoice[]> {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('storeId', '==', storeId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate(),
        } as Invoice;
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtener facturas de un país (para admin)
   */
  async getCountryInvoices(
    countryId: string,
    options?: { status?: Invoice['status']; limit?: number }
  ): Promise<Invoice[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('countryId', '==', countryId),
        orderBy('createdAt', 'desc'),
      ];

      if (options?.status) {
        constraints.push(where('status', '==', options.status));
      }

      const q = query(collection(db, 'invoices'), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate(),
        } as Invoice;
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtener facturas pendientes de aprobación
   */
  async getPendingInvoices(countryId?: string): Promise<Invoice[]> {
    try {
      const constraints: QueryConstraint[] = [
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc'),
      ];

      if (countryId) {
        constraints.push(where('countryId', '==', countryId));
      }

      const q = query(collection(db, 'invoices'), ...constraints);
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          approvedAt: data.approvedAt?.toDate(),
        } as Invoice;
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Aprobar factura (solo admin)
   * En producción, esto debería ser una Cloud Function
   */
  async approveInvoice(
    invoiceId: string,
    pointsEarned: number
  ): Promise<void> {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'approved',
        pointsEarned,
        approvedAt: Timestamp.now(),
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Rechazar factura con razón (solo admin)
   */
  async rejectInvoice(invoiceId: string, reason: string): Promise<void> {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: 'rejected',
        rejectedReason: reason,
        approvedAt: Timestamp.now(),
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * Eliminar factura (solo tendero y antes de aprobación)
   */
  async deleteInvoice(invoiceId: string): Promise<void> {
    try {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (!invoiceSnap.exists()) {
        throw new Error('Factura no encontrada');
      }

      const invoice = invoiceSnap.data() as Invoice;

      // Solo se puede eliminar si está pendiente
      if (invoice.status !== 'pending') {
        throw new Error('No se puede eliminar una factura aprobada o rechazada');
      }

      // Eliminar imagen de Storage
      if (invoice.imageUrl) {
        try {
          const imageRef = ref(storage, invoice.imageUrl);
          await deleteObject(imageRef);
        } catch (err) {
          console.error('Error al eliminar imagen:', err);
        }
      }

      // Eliminar documento
      await deleteDoc(invoiceRef);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Obtener estadísticas de facturas por período
   */
  async getInvoiceStats(countryId: string, startDate: Date, endDate: Date) {
    try {
      const q = query(
        collection(db, 'invoices'),
        where('countryId', '==', countryId),
        where('status', '==', 'approved'),
        where('approvedAt', '>=', Timestamp.fromDate(startDate)),
        where('approvedAt', '<=', Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      let totalSales = 0;
      let totalInvoices = 0;
      let totalPoints = 0;

      querySnapshot.forEach(doc => {
        const data = doc.data() as Invoice;
        totalSales += data.totalAmount;
        totalPoints += data.totalPoints;
        totalInvoices++;
      });

      return {
        totalSales,
        totalInvoices,
        totalPoints,
        averagePerInvoice: totalInvoices > 0 ? totalSales / totalInvoices : 0,
      };
    } catch (error) {
      throw error;
    }
  },
};
