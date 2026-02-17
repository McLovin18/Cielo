// Roles disponibles en el sistema
export type UserRole = 'SUPER_ADMIN' | 'ADMIN_COUNTRY' | 'DISTRIBUTOR' | 'STORE';

// ===== 👤 USERS =====
export interface User {
  uid: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  countryId?: string;
  storeCode?: string; // Código de tendero (si es STORE)
  city?: string;
  storeId?: string;
  distributorId?: string;
  address?: string;
  profilePhoto?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 🌍 COUNTRIES =====
export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  timezone: string;
  language: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 📍 REGIONS =====
export interface Region {
  id: string;
  countryId: string;
  name: string;
  createdAt: Date;
}

// ===== 🚚 DISTRIBUTORS =====
export interface Distributor {
  id?: string;
  distributorId: string;  // ID personalizado como "DIST-ECU-01"
  countryId: string;
  name: string;
  email: string;
  phone: string;
  cities: string[];       // Array de ciudades donde reparte
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 🏪 STORES (Tenderos) =====
export interface Store {
  id: string;
  storeCode: string; // Código único validado contra tenderos_validos
  countryId: string;
  city?: string; // Ciudad del tendero
  regionId: string;
  distributorId: string | null;  // ← El distribuidor asignado automáticamente
  
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  pointsTotal: number;
  pointsMonth: number;
  monthStart: Date;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 📦 PRODUCTOS GLOBALES =====
export interface GlobalProduct {
  id: string;
  sku: string; // SKU global único
  name: string;
  brand: string;
  category: string;
  pointsValue: number; // Puntos asignados por unidad de este producto
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 📦 PRODUCTOS POR PAÍS =====
export interface CountryProduct {
  id: string;
  globalProductId: string;
  countryId: string;
  
  sku: string;           // SKU local (puede diferir del global)
  localName: string;
  pointsValue: number;   // Puntos que vale este producto en este país
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 🧾 FACTURAS =====
export interface Invoice {
  id: string;
  storeId: string;
  storeName: string;
  countryId: string;
  distributorId: string;
  
  invoiceNumber: string;
  invoiceDate: Date;
  imageUrl: string;
  ocrRawData?: string;
  
  status: 'pending' | 'approved' | 'rejected';
  totalAmount: number;
  pointsEarned: number;
  
  createdAt: Date;
  approvedAt?: Date;
  rejectedReason?: string;
}

// ===== 🧾 ITEMS DE FACTURA (subcolección) =====
export interface InvoiceItem {
  id: string;
  countryProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  pointsEarned: number;
}

// ===== 🎁 PREMIOS GLOBALES =====
export interface GlobalReward {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 🎁 PREMIOS POR PAÍS =====
export interface CountryReward {
  id: string;
  globalRewardId: string;
  countryId: string;
  
  name: string;
  description: string;
  pointsRequired: number;
  imageUrl?: string;
  status: 'active' | 'inactive';
  
  createdAt: Date;
  updatedAt: Date;
}

// ===== 📦 STOCK DE PREMIOS POR DISTRIBUIDOR =====
export interface DistributorRewardStock {
  id: string;
  distributorId: string;
  countryRewardId: string;
  rewardName: string;
  quantity: number;
  updatedAt: Date;
}

// ===== 🎁 RECLAMOS DE PREMIOS =====
export interface RewardClaim {
  id: string;
  storeId: string;
  storeName: string;
  countryId: string;
  distributorId?: string;
  countryRewardId: string;
  rewardName: string;
  pointsDeducted: number;
  
  status: 'in_assignment' | 'in_transit' | 'delivered' | 'expired' | 'cancelled';
  
  rating?: {
    score: number; // 1-5
    comment: string;
    ratedAt: Date;
  };
  
  claimedAt: Date;
  deliveredAt?: Date;
  updatedAt: Date;
}

// ===== 🚚 ENTREGAS =====
export interface Delivery {
  id: string;
  rewardClaimId: string;
  storeId: string;
  storeName: string;
  countryId: string;
  distributorId: string;
  
  rewardName: string;
  status: 'assigned' | 'in_transit' | 'delivered' | 'failed';
  
  proofImage?: string;
  rating?: number;
  comments?: string;
  
  assignedAt: Date;
  deliveredAt?: Date;
  updatedAt: Date;
}

// ===== 🧮 TRANSACCIONES DE PUNTOS =====
export interface PointTransaction {
  id: string;
  storeId: string;
  countryId: string;
  
  type: 'purchase' | 'reward_redemption' | 'adjustment' | 'refund';
  points: number;
  
  invoiceId?: string;
  rewardClaimId?: string;
  description: string;
  
  createdAt: Date;
}

// ===== 🎯 CAMPAÑAS =====
export interface Campaign {
  id: string;
  countryId: string;
  name: string;
  description: string;
  
  startDate: Date;
  endDate: Date;
  rules: Record<string, any>; // JSON flexible
  
  status: 'draft' | 'active' | 'ended';
  createdAt: Date;
  updatedAt: Date;
}

// ===== 🔐 TENDEROS VÁLIDOS =====
export interface ValidStore {
  pais: string;
  ciudad: string;
  distribuidorId: string;
  activo: boolean;
}

// ===== 📊 ESTADÍSTICAS =====
export interface SalesStats {
  totalSales: number;
  totalStores: number;
  totalPoints: number;
  totalRewardsClaimed: number;
  weeklyData?: {
    week: number;
    sales: number;
    storesActive: number;
  }[];
  monthlyData?: {
    month: number;
    sales: number;
    storesActive: number;
  }[];
}
