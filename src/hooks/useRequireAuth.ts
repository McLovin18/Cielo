import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        // No autenticado, redirigir a login
        router.push('/login');
      } else if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        // Rol no permitido
        router.push('/unauthorized');
      }
    }
  }, [currentUser, loading, router, allowedRoles]);

  return { currentUser, loading };
}
