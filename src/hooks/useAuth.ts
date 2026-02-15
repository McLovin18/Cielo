import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }

  return {
    user: context.currentUser,
    currentUser: context.currentUser, // Alias para compatibilidad
    firebaseUser: context.firebaseUser,
    loading: context.loading,
    userRole: context.userRole,
    error: context.error,
  };
}
