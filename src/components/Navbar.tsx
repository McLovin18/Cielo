'use client';

import { useAuth } from '@/context/AuthContext';
import NavbarGuest from './NavbarGuest';
import NavbarAuth from './NavbarAuth';

export default function Navbar() {
  const { currentUser, loading } = useAuth();

  // Mostrar skeleton/placeholder mientras se carga la autenticación
  if (loading) {
    return (
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo placeholder */}
            <div className="flex-shrink-0">
              <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            {/* Menu items placeholder */}
            <div className="hidden md:flex gap-4">
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
            {/* Auth button placeholder */}
            <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </nav>
    );
  }

  return currentUser ? <NavbarAuth user={currentUser} /> : <NavbarGuest />;
}
