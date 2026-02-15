'use client';

import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';

// Helper to convert Firestore Timestamp to Date
function toDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date();
}

export default function SettingsPage() {
  useRequireAuth();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notificationsSettings, setNotificationsSettings] = useState({
    emailNotifications: true,
    promotionalEmails: false,
    systemAlerts: true,
  });

  if (!currentUser) {
    return null;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      if (!auth.currentUser) throw new Error('No hay usuario autenticado');
      
      await updatePassword(auth.currentUser, passwordForm.newPassword);
      
      alert('✅ Contraseña actualizada correctamente');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error al cambiar contraseña:', error);
      if (error.code === 'auth/weak-password') {
        alert('La contraseña es muy débil');
      } else if (error.code === 'auth/wrong-password') {
        alert('Contraseña actual incorrecta');
      } else {
        alert('Error al cambiar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, currentUser.email);
      alert('✅ Email de recuperación de contraseña enviado');
    } catch (error) {
      console.error('Error al enviar reset:', error);
      alert('Error al enviar el email. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notificationsSettings) => {
    setNotificationsSettings({
      ...notificationsSettings,
      [key]: !notificationsSettings[key],
    });
    // Aquí se guardaría en Firestore
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Configuración</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona tu cuenta y preferencias</p>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Security Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Seguridad</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Gestiona tu contraseña y seguridad</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Change Password */}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirmar Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !passwordForm.currentPassword || !passwordForm.newPassword}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  {isLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </form>

              {/* Password Reset Option */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  ¿Olvidaste tu contraseña? Puedes solicitar un email de recuperación.
                </p>
                <button
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                >
                  Enviar Email de Recuperación
                </button>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notificaciones</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Controla qué notificaciones deseas recibir</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Email Notifications */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Notificaciones por Email</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recibe notificaciones importantes</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationsSettings.emailNotifications}
                    onChange={() => handleNotificationChange('emailNotifications')}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              {/* Promotional Emails */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Emails Promocionales</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recibe ofertas y promociones</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationsSettings.promotionalEmails}
                    onChange={() => handleNotificationChange('promotionalEmails')}
                    className="w-5 h-5"
                  />
                </label>
              </div>

              {/* System Alerts */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Alertas del Sistema</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recibe alertas de seguridad y actualizaciones</p>
                </div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notificationsSettings.systemAlerts}
                    onChange={() => handleNotificationChange('systemAlerts')}
                    className="w-5 h-5"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Account Info Section */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Información de Cuenta</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Datos sobre tu cuenta</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email</p>
                  <p className="font-semibold text-gray-900 dark:text-white break-all">{currentUser.email}</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Última actualización</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {toDate(currentUser.updatedAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
