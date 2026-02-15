import { db } from '@/lib/firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, Timestamp } from 'firebase/firestore';

export interface GlobalReward {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  pointsRequired: number;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CountryReward {
  id: string;
  rewardId: string;
  globalRewardId: string; // Made required to match src/types/index.ts
  countryId: string;
  name: string;
  pointsRequired: number;
  monthlyTarget?: number; // Puntos a alcanzar en el mes para ganar este premio
  imageUrl?: string;
  description: string; // Made required to match src/types/index.ts
  active: boolean;
  status: 'active' | 'inactive'; // Added to satisfy type compatibility (required)
  createdAt: Date;
  updatedAt: Date;
}

export interface RewardClaim {
  id: string;
  storeId: string;
  storeName?: string; // Add optional to match types/index.ts
  rewardId: string;
  countryRewardId?: string; // Add optional to match types/index.ts
  rewardName?: string; // Add optional to match types/index.ts
  pointsDeducted?: number; // Add optional to match types/index.ts
  countryId: string;
  distributorId?: string;
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'rejected' | 'in_assignment' | 'expired' | 'cancelled'; // Expanded status from both types
  claimedAt: Date;
  assignedAt?: Date;
  deliveredAt?: Date;
  updatedAt: Date;
  rating?: {
    score: number;
    comment: string;
    ratedAt: Date;
  };
}

export interface DistributorRewardStock {
  id: string;
  distributorId: string;
  rewardId: string;
  countryId: string;
  quantity: number;
  reserved: number; // Cantidad reservada para entregas en tránsito
  updatedAt: Date;
}

class RewardService {
  // ===== PREMIOS GLOBALES (SUPER_ADMIN) =====

  async createGlobalReward(reward: Omit<GlobalReward, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const rewardRef = doc(collection(db, 'globalRewards'));
      const data: GlobalReward = {
        id: rewardRef.id,
        ...reward,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(rewardRef, data);
      return data;
    } catch (error) {
      console.error('Error creating global reward:', error);
      throw error;
    }
  }

  async getGlobalRewards() {
    try {
      const snapshot = await getDocs(collection(db, 'globalRewards'));
      return snapshot.docs.map(doc => doc.data() as GlobalReward);
    } catch (error) {
      console.error('Error fetching global rewards:', error);
      throw error;
    }
  }

  async updateGlobalReward(rewardId: string, updates: Partial<GlobalReward>) {
    try {
      await updateDoc(doc(db, 'globalRewards', rewardId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating global reward:', error);
      throw error;
    }
  }

  async deleteGlobalReward(rewardId: string) {
    try {
      await deleteDoc(doc(db, 'globalRewards', rewardId));
    } catch (error) {
      console.error('Error deleting global reward:', error);
      throw error;
    }
  }

  // ===== PREMIOS POR PAÍS (ADMIN_COUNTRY) =====

  async createCountryReward(countryReward: Omit<CountryReward, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const rewardRef = doc(collection(db, 'countryRewards'));
      const data: CountryReward = {
        id: rewardRef.id,
        ...countryReward,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(rewardRef, data);
      return data;
    } catch (error) {
      console.error('Error creating country reward:', error);
      throw error;
    }
  }

  async getCountryRewards(countryId: string) {
    try {
      const q = query(collection(db, 'countryRewards'), where('countryId', '==', countryId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          globalRewardId: data.globalRewardId || '',
          description: data.description || '',
          active: data.active ?? false,
          status: data.status || (data.active ? 'active' : 'inactive'),
        } as CountryReward;
      });
    } catch (error) {
      console.error('Error fetching country rewards:', error);
      throw error;
    }
  }

  async getAvailableRewards(countryId: string) {
    try {
      const q = query(
        collection(db, 'countryRewards'),
        where('countryId', '==', countryId),
        where('active', '==', true)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          globalRewardId: data.globalRewardId || '',
          description: data.description || '',
          active: data.active ?? false,
          status: data.status || (data.active ? 'active' : 'inactive'),
        } as CountryReward;
      });
    } catch (error) {
      console.error('Error fetching available rewards:', error);
      throw error;
    }
  }

  async updateCountryReward(rewardId: string, updates: Partial<CountryReward>) {
    try {
      await updateDoc(doc(db, 'countryRewards', rewardId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating country reward:', error);
      throw error;
    }
  }

  async deleteCountryReward(rewardId: string) {
    try {
      await deleteDoc(doc(db, 'countryRewards', rewardId));
    } catch (error) {
      console.error('Error deleting country reward:', error);
      throw error;
    }
  }

  // ===== RECLAMACIONES DE PREMIOS (STORE) =====

  async claimReward(claim: Omit<RewardClaim, 'id' | 'claimedAt' | 'updatedAt'>) {
    try {
      const claimRef = doc(collection(db, 'rewardClaims'));
      const data: RewardClaim = {
        id: claimRef.id,
        ...claim,
        claimedAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(claimRef, data);
      return data;
    } catch (error) {
      console.error('Error claiming reward:', error);
      throw error;
    }
  }

  async redeemReward(user: any, reward: CountryReward | any) { // Relax type check for compatibility
    try {
      // 1. Deduct points from store (Optimistic update on client, strict on server)
      // This part should technically be a transaction or Cloud Function for safety
      const storeRef = doc(db, 'stores', user.storeId);
      const newPointsTotal = Math.max(0, (user.pointsTotal || 0) - reward.pointsRequired);

      await updateDoc(storeRef, {
        pointsTotal: newPointsTotal,
        updatedAt: Timestamp.now(),
      });

      // 2. Create the claim record
      const rewardId = reward.id || reward.countryRewardId || reward.rewardId;
      
      await this.claimReward({
        storeId: user.storeId,
        storeName: user.name || 'Tienda',
        rewardId: rewardId,
        countryRewardId: rewardId, // For compatibility
        rewardName: reward.name,
        pointsDeducted: reward.pointsRequired,
        countryId: user.countryId,
        distributorId: user.distributorId, // Assign to current distributor
        status: 'pending', // Waiting for distributor
        // Only add description if it exists (it's optional in some interfaces)
      });

      return true;

    } catch (error) {
      console.error('Error redeeming reward:', error);
      throw error;
    }
  }

  async getStoreRewards(storeId: string) {
    try {
      const q = query(collection(db, 'rewardClaims'), where('storeId', '==', storeId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as RewardClaim);
    } catch (error) {
      console.error('Error fetching store rewards:', error);
      throw error;
    }
  }

  async getMyClaims(storeId: string) {
    const claims = await this.getStoreRewards(storeId);
    return claims.map(claim => ({
      ...claim,
      storeName: claim.storeName || '',
      countryRewardId: claim.countryRewardId || claim.rewardId,
      rewardName: claim.rewardName || '',
      pointsDeducted: claim.pointsDeducted || 0,
    }));
  }

  async getDistributorDeliveries(distributorId: string) {
    try {
      const q = query(collection(db, 'rewardClaims'), where('distributorId', '==', distributorId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as RewardClaim);
    } catch (error) {
      console.error('Error fetching distributor deliveries:', error);
      throw error;
    }
  }

  async updateRewardClaim(claimId: string, updates: Partial<RewardClaim>) {
    try {
      await updateDoc(doc(db, 'rewardClaims', claimId), {
        ...updates,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating reward claim:', error);
      throw error;
    }
  }

  // ===== STOCK DE DISTRIBUIDOR =====

  async getDistributorStock(distributorId: string) {
    try {
      const q = query(collection(db, 'distributorRewardStock'), where('distributorId', '==', distributorId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as DistributorRewardStock);
    } catch (error) {
      console.error('Error fetching distributor stock:', error);
      throw error;
    }
  }

  async updateDistributorStock(stockId: string, quantity: number, reserved: number = 0) {
    try {
      await updateDoc(doc(db, 'distributorRewardStock', stockId), {
        quantity,
        reserved,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating distributor stock:', error);
      throw error;
    }
  }
}

export default new RewardService();
