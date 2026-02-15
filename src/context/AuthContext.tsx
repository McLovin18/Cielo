'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { User, UserRole } from '@/types';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  userRole: UserRole | null;
  isSuperAdmin: boolean;
  updateUserProfile: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

// Helper para obtener ciudad y distribuidorId desde tendero válido
const enrichUserWithStoreData = async (user: User): Promise<User> => {
  if (user.role === 'STORE' && (!user.city || !user.distributorId)) {
    try {
      console.log(`🔍 Enriqueciendo datos de STORE: ${user.uid}`);
      
      // Obtener storeCode
      let storeCode = user.storeCode;
      
      if (!storeCode && user.uid) {
        console.log(`📍 Buscando storeCode en stores/${user.uid}`);
        const storeRef = doc(db, 'stores', user.uid);
        const storeDoc = await getDoc(storeRef);
        
        if (storeDoc.exists()) {
          const storeData = storeDoc.data();
          storeCode = storeData.storeCode;
          console.log(`✅ storeCode obtenido: ${storeCode}`);
        }
      }
      
      if (storeCode) {
        // Obtener datos de tenderos_validos (ciudad y distribuidorId)
        try {
          const tenderoRef = doc(db, 'tenderos_validos', storeCode);
          const tenderoDoc = await getDoc(tenderoRef);
          if (tenderoDoc.exists()) {
            const tenderoData = tenderoDoc.data();
            
            if (tenderoData.ciudad && !user.city) {
              user.city = tenderoData.ciudad;
              console.log(`  ✓ Ciudad asignada: ${user.city}`);
            }
            
            if (tenderoData.distribuidorId && !user.distributorId) {
              user.distributorId = tenderoData.distribuidorId;
              console.log(`  ✓ Distribuidor asignado (Firestore): ${user.distributorId}`);
            }
          }
        } catch (error) {
          console.warn(`Advertencia al obtener datos de tendero:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error enriching user with store data:', error);
    }
  }
  return user;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setLoading(true);
        if (user) {
          // Verificar si es super admin por email
          const isSuperAdminUser = user.email === 'hectorcobea03@gmail.com';
          setIsSuperAdmin(isSuperAdminUser);

          // Obtener datos del usuario de Firestore
          // Primero intentar por UID, luego por email (para distribuidores que se crearon sin auth)
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists() && user.email) {
            console.log(`⚠️ Usuario no encontrado por UID, buscando por email...`);
            userDoc = await getDoc(doc(db, 'users', user.email));
          }

          if (userDoc.exists()) {
            let userData = {
              ...userDoc.data(),
              uid: user.uid,
            } as User;
            
            console.log(`📄 Usuario cargado de Firestore:`, {
              name: userData.name,
              role: userData.role,
              distributorId: userData.distributorId,
              storeCode: userData.storeCode,
              city: userData.city
            });
            
            // Enriquecer datos si es STORE y falta ciudad/distribuidor
            userData = await enrichUserWithStoreData(userData);
            
            console.log(`✅ Usuario después de enriquecimiento:`, {
              name: userData.name,
              role: userData.role,
              distributorId: userData.distributorId,
              storeCode: userData.storeCode,
              city: userData.city
            });
            
            setCurrentUser(userData);
            setFirebaseUser(user);
          } else {
            // Usuario autenticado pero sin datos en Firestore
            console.warn(`⚠️ Usuario autenticado pero sin datos en Firestore: ${user.email}`);
            setFirebaseUser(user);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
          setFirebaseUser(null);
          setIsSuperAdmin(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar usuario');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    firebaseUser,
    loading,
    error,
    userRole: currentUser?.role || null,
    isSuperAdmin,
    updateUserProfile: (updates: Partial<User>) => {
      if (currentUser) {
        setCurrentUser({
          ...currentUser,
          ...updates,
        });
      }
    },
    refreshUser: async () => {
      if (firebaseUser) {
        try {
          // Primero intentar por UID, luego por email
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (!userDoc.exists()) {
            console.log(`⚠️ Usuario no encontrado por UID, buscando por email...`);
            userDoc = await getDoc(doc(db, 'users', firebaseUser.email!));
          }
          
          if (userDoc.exists()) {
            let userData = {
              ...userDoc.data(),
              uid: firebaseUser.uid,
            } as User;
            
            // Enriquecer datos si es STORE y falta ciudad
            userData = await enrichUserWithStoreData(userData);
            
            setCurrentUser(userData);
          }
        } catch (err) {
          console.error('Error refrescando usuario:', err);
        }
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
