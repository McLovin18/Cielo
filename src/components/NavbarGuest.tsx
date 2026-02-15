'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function NavbarGuest() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">☁️</span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Cielo</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#features" 
              className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
            >
              Características
            </a>
            <a 
              href="#stats" 
              className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
            >
              Estadísticas
            </a>
            <a 
              href="#cta" 
              className="text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
            >
              Contacto
            </a>
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Registrarse
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-4">
            <a href="#features" className="block text-gray-600 dark:text-gray-300">Características</a>
            <a href="#stats" className="block text-gray-600 dark:text-gray-300">Estadísticas</a>
            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Link href="/login" className="flex-1 px-4 py-2 text-center border border-gray-300 dark:border-gray-700 rounded-lg">
                Ingresar
              </Link>
              <Link href="/register" className="flex-1 px-4 py-2 text-center bg-blue-600 text-white rounded-lg">
                Registrarse
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
