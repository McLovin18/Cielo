'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Si el usuario está autenticado, redirigir a su panel
  useEffect(() => {
    if (!loading && user) {
      const roleRoutes: Record<string, string> = {
        'SUPER_ADMIN': '/super-admin/dashboard',
        'ADMIN_COUNTRY': '/admin/dashboard',
        'DISTRIBUTOR': '/distributor/dashboard',
        'STORE': '/store/dashboard',
      };
      const targetRoute = roleRoutes[user.role] || '/store/dashboard';
      console.log(`🏠 Usuario autenticado en inicio: ${user.email} (${user.role}) → ${targetRoute}`);
      router.push(targetRoute);
    }
  }, [user, loading, router]);

  const features = [
    {
      icon: '📊',
      title: 'Dashboard Intuitivo',
      description: 'Visualiza tus ventas, puntos y promociones en tiempo real',
    },
    {
      icon: '🎁',
      title: 'Programa de Puntos',
      description: 'Gana puntos con cada compra y canjéalos por recompensas',
    },
    {
      icon: '📱',
      title: 'Facturas Digitales',
      description: 'Gestiona tus facturas fácilmente con OCR inteligente',
    },
    {
      icon: '🌍',
      title: 'Multi-país',
      description: 'Acceso a promociones en toda América Latina',
    },
    {
      icon: '💰',
      title: 'Mejores Precios',
      description: 'Negocia directamente con distribuidores para maximizar ganancias',
    },
    {
      icon: '📈',
      title: 'Reportes Avanzados',
      description: 'Análisis detallados de tu rendimiento y competencia',
    },
  ];

  const stats = [
    { number: '50+', label: 'Tenderos conectados' },
    { number: '15+', label: 'Países cubiertos' },
    { number: '10K+', label: 'Puntos por semana' },
    { number: '24/7', label: 'Soporte disponible' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20 dark:to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Plataforma para
              <span className="text-blue-600 dark:text-blue-400"> Tenderos</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Conecta con distribuidores, administra tu inventario, gana puntos y accede a promociones exclusivas. 
              Todo lo que necesitas para hacer crecer tu negocio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold text-lg"
              >
                Empezar Gratis
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition font-semibold text-lg"
              >
                Ya tengo cuenta
              </Link>
            </div>

            {/* Trust Badge */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              ✓ Sin tarjeta de crédito requerida
              <span className="mx-2">•</span>
              Acceso instantáneo
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Todo lo que necesitas para triunfar
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Herramientas diseñadas especialmente para tenderos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg dark:hover:shadow-gray-900/50 transition"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-8 bg-gradient-to-br from-blue-50 to-transparent dark:from-blue-950/20 dark:to-transparent rounded-xl"
              >
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-12 text-center">
            Por qué elegir Cielo
          </h2>

          <div className="space-y-8">
            {[
              {
                title: 'Conexión Directa con Distribuidores',
                description: 'Accede a una red de distribuidores verificados en múltiples países. Negocia mejores términos y aumenta tu margen de ganancia.'
              },
              {
                title: 'Sistema de Puntos Inteligente',
                description: 'Gana puntos con cada compra y transacción. Canjéalos por productos, descuentos o promociones exclusivas.'
              },
              {
                title: 'Gestión Fácil de Facturas',
                description: 'Sube tus facturas una sola vez. Nuestro sistema OCR extrae automáticamente toda la información y calcula puntos.'
              },
              {
                title: 'Panel de Control Completo',
                description: 'Visualiza tu inventario, ventas, puntos, facturas y promociones en un solo lugar. Reportes en tiempo real.'
              },
            ].map((benefit, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-600 text-white font-bold">
                    {index + 1}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-20 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Listo para impulsar tu negocio
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a Cielo hoy y accede a herramientas que te harán crecer
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition font-semibold text-lg"
          >
            Registrarse Ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">☁️</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">Cielo</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                La plataforma #1 para tenderos en América Latina
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Características</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Contacto</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Términos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">Seguridad</a></li>
                <li><a href="#" className="hover:text-gray-900 dark:hover:text-white">GDPR</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <p>&copy; 2026 Cielo. Todos los derechos reservados.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Twitter</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Instagram</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">LinkedIn</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
