import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Invoice } from '@/types';

export interface SalesStatistics {
  totalSales: number;
  totalInvoices: number;
  averageSale: number;
  topStores: Array<{ storeId: string; storeName: string; sales: number; invoices: number }>;
}

export interface StoreSalesDetail {
  storeId: string;
  storeName: string;
  countryId: string;
  countryName: string;
  totalSales: number;
  totalPoints: number;
  invoiceCount: number;
  monthSales: number;
}

export interface DeliveryStatistics {
  totalDeliveries: number;
  pending: number;
  inTransit: number;
  delivered: number;
  deliveryRate: number;
  averageDeliveryTime: number;
}

class StatisticsService {
  // ===== VENTAS GLOBALES (SUPER_ADMIN) =====

  async getSalesStatisticsByPeriod(period: 'week' | 'month' | 'year', countryFilter?: string) {
    try {
      const invoices = await this.getInvoicesByPeriod(period);
      
      let filtered = invoices;
      if (countryFilter) {
        filtered = invoices.filter(inv => inv.countryId === countryFilter);
      }

      const totalSales = filtered.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const topStores = this.calculateTopStores(filtered);

      return {
        totalSales,
        totalInvoices: filtered.length,
        averageSale: filtered.length > 0 ? totalSales / filtered.length : 0,
        topStores,
      };
    } catch (error) {
      console.error('Error fetching sales statistics:', error);
      throw error;
    }
  }

  async getStoreSalesDetails(storeId: string) {
    try {
      const q = query(collection(db, 'invoices'), where('storeId', '==', storeId));
      const snapshot = await getDocs(q);
      const invoices = snapshot.docs.map(doc => doc.data() as Invoice);

      const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const totalPoints = invoices.reduce((sum, inv) => sum + (inv.pointsEarned || 0), 0);

      return {
        storeId,
        totalSales,
        totalPoints,
        invoiceCount: invoices.length,
        monthSales: this.getMonthlySales(invoices),
      };
    } catch (error) {
      console.error('Error fetching store sales details:', error);
      throw error;
    }
  }

  async getCountrySalesStatistics(countryId: string, period: 'week' | 'month' | 'year') {
    try {
      const invoices = await this.getInvoicesByPeriod(period);
      const countryInvoices = invoices.filter(inv => inv.countryId === countryId);

      const totalSales = countryInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
      const topStores = this.calculateTopStores(countryInvoices);

      return {
        countryId,
        totalSales,
        totalInvoices: countryInvoices.length,
        averageSale: countryInvoices.length > 0 ? totalSales / countryInvoices.length : 0,
        topStores,
      };
    } catch (error) {
      console.error('Error fetching country sales statistics:', error);
      throw error;
    }
  }

  async getDistributorSalesStatistics(distributorId: string) {
    try {
      const q = query(collection(db, 'invoices'), where('distributorId', '==', distributorId));
      const snapshot = await getDocs(q);
      const invoices = snapshot.docs.map(doc => doc.data() as Invoice);

      const topStores = this.calculateTopStores(invoices);
      const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

      return {
        distributorId,
        totalSales,
        totalInvoices: invoices.length,
        topStores: topStores.sort((a, b) => b.sales - a.sales),
      };
    } catch (error) {
      console.error('Error fetching distributor sales statistics:', error);
      throw error;
    }
  }

  // ===== ENTREGAS =====

  async getDeliveryStatistics(countryId?: string) {
    try {
      let q = query(collection(db, 'rewardClaims'));
      if (countryId) {
        q = query(collection(db, 'rewardClaims'), where('countryId', '==', countryId));
      }

      const snapshot = await getDocs(q);
      const claims = snapshot.docs.map(doc => doc.data());

      const totalDeliveries = claims.length;
      const pending = claims.filter((c: any) => c.status === 'pending').length;
      const inTransit = claims.filter((c: any) => c.status === 'in_transit').length;
      const delivered = claims.filter((c: any) => c.status === 'delivered').length;

      return {
        totalDeliveries,
        pending,
        inTransit,
        delivered,
        deliveryRate: totalDeliveries > 0 ? (delivered / totalDeliveries) * 100 : 0,
        averageDeliveryTime: this.calculateAverageDeliveryTime(claims),
      };
    } catch (error) {
      console.error('Error fetching delivery statistics:', error);
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  private async getInvoicesByPeriod(period: 'week' | 'month' | 'year') {
    try {
      const snapshot = await getDocs(collection(db, 'invoices'));
      const invoices = snapshot.docs.map(doc => doc.data() as Invoice);

      const now = new Date();
      let startDate = new Date();

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }

      return invoices.filter(inv => {
        const invDate = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt);
        return invDate >= startDate && invDate <= now;
      });
    } catch (error) {
      console.error('Error fetching invoices by period:', error);
      throw error;
    }
  }

  private calculateTopStores(invoices: Invoice[]) {
    const storeMap = new Map<string, { sales: number; invoices: number }>();

    invoices.forEach(inv => {
      const existing = storeMap.get(inv.storeId) || { sales: 0, invoices: 0 };
      storeMap.set(inv.storeId, {
        sales: existing.sales + (inv.totalAmount || 0),
        invoices: existing.invoices + 1,
      });
    });

    return Array.from(storeMap.entries())
      .map(([storeId, data]) => ({
        storeId,
        storeName: `Store ${storeId}`, // TODO: Fetch real store name
        sales: data.sales,
        invoices: data.invoices,
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);
  }

  private getMonthlySales(invoices: Invoice[]) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthInvoices = invoices.filter(inv => {
      const invDate = inv.createdAt instanceof Date ? inv.createdAt : new Date(inv.createdAt);
      return invDate >= monthStart;
    });
    return monthInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  }

  private calculateAverageDeliveryTime(claims: any[]) {
    const deliveredClaims = claims.filter((c: any) => c.status === 'delivered' && c.deliveredAt);
    if (deliveredClaims.length === 0) return 0;

    const totalTime = deliveredClaims.reduce((sum, claim) => {
      const claimedDate = claim.claimedAt instanceof Date ? claim.claimedAt : new Date(claim.claimedAt);
      const deliveredDate = claim.deliveredAt instanceof Date ? claim.deliveredAt : new Date(claim.deliveredAt);
      return sum + (deliveredDate.getTime() - claimedDate.getTime());
    }, 0);

    return Math.round(totalTime / deliveredClaims.length / (1000 * 60 * 60 * 24)); // En días
  }
}

export default new StatisticsService();
