'use client';

import Link from 'next/link';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import Image from 'next/image';

interface NavbarAuthProps {
  user: User;
}

export default function NavbarAuth({ user }: NavbarAuthProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Obtener el dashboard según el rol
  const getDashboardLink = () => {
    switch (user.role) {
      case 'SUPER_ADMIN':
        return '/super-admin/dashboard';
      case 'ADMIN_COUNTRY':
        return '/admin/dashboard';
      case 'DISTRIBUTOR':
        return '/distributor/dashboard';
      case 'STORE':
        return '/store/dashboard';
      default:
        return '/';
    }
  };

  // Obtener el nombre del rol
  const getRoleName = () => {
    const roleNames: Record<string, string> = {
      SUPER_ADMIN: '🔐 Super Admin',
      ADMIN_COUNTRY: '🌍 Admin Regional',
      DISTRIBUTOR: '🚚 Distribuidor',
      STORE: '🏪 Tendero',
    };
    return roleNames[user.role] || user.role;
  };

  // Obtener opciones de menú según el rol
  const getMenuItems = () => {
    const roleItems: Record<string, Array<{ label: string; href: string }>> = {
      SUPER_ADMIN: [
        { label: 'Dashboard', href: getDashboardLink() },
        { label: 'Usuarios', href: '/super-admin/users' },
        { label: 'Países', href: '/super-admin/countries' },
        { label: 'Tenderos Válidos', href: '/super-admin/valid-stores' },
        { label: 'Premios', href: '/super-admin/rewards' },
        { label: 'Reportes', href: '/super-admin/reports' },
      ],
      ADMIN_COUNTRY: [
        { label: 'Dashboard', href: getDashboardLink() },
        { label: 'Distribuidores', href: '/admin/distributors' },
        { label: 'Tenderos', href: '/admin/stores' },
        { label: 'Premios', href: '/admin/rewards' },
        { label: 'Reportes', href: '/admin/reports' },
      ],
      DISTRIBUTOR: [
        { label: 'Dashboard', href: getDashboardLink() },
        { label: 'Tenderos', href: '/distributor/stores' },
        { label: 'Entregas', href: '/distributor/deliveries' },
        { label: 'Reportes', href: '/distributor/reports' },
      ],
      STORE: [
        { label: 'Dashboard', href: getDashboardLink() },
        { label: 'Mi Distribuidor', href: '/store/distributor' },
        { label: 'Facturas', href: '/store/invoices' },
        { label: 'Mis Puntos', href: '/store/points' },
        { label: 'Recompensas', href: '/store/rewards' },
      ],
    };

    return roleItems[user.role] || [{ label: 'Dashboard', href: getDashboardLink() }];
  };

  const menuItems = getMenuItems();

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={getDashboardLink()} className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Cielo</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition text-sm"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-4">
            {/* Rol Badge */}
            <div className="hidden sm:block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              {getRoleName()}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {user.profilePhoto ? (
                  <div className="relative w-8 h-8">
                    <Image
                      src={user.profilePhoto}
                      alt={user.name}
                      fill
                      className="rounded-full object-cover"
                      priority
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {user.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{user.name}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs truncate">{user.email}</p>
                  </div>

                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Mi Perfil
                  </Link>

                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    Configuración
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden ml-4"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
            >
              Cerrar Sesión
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
