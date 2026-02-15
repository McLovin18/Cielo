/**
 * Script para inicializar datos en Firestore
 * 
 * Ejecutar:
 * 1. npx ts-node scripts/initializeFirestore.ts
 * 
 * O manualmente en Firebase Console:
 * 1. Crear collection "superAdmins"
 * 2. Crear documento con email: hectorcobea03@gmail.com
 * 3. Crear collection "tenderos_validos" con códigos pre-cargados
 */

import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../config/serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Archivo config/serviceAccountKey.json no encontrado');
  console.error('⚠️ Ejecuta este script en Firebase Console manualmente:');
  console.error('');
  console.error('1. Ir a: https://console.firebase.google.com/project/tu-proyecto/firestore/data');
  console.error('2. Crear collection: "superAdmins"');
  console.error('3. Agregar documento con estos campos:');
  console.error(JSON.stringify({
    email: 'hectorcobea03@gmail.com',
    role: 'SUPER_ADMIN',
    createdAt: 'timestamp actual',
    active: true,
  }, null, 2));
  console.error('');
  console.error('4. Crear collection: "tenderos_validos" con los códigos');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function initializeFirestore() {
  console.log('🚀 Inicializando Firestore...');

  try {
    // 1. Crear documento super admin
    console.log('📝 Creando super admin...');
    await db.collection('superAdmins').doc('hectorcobea03@gmail.com').set({
      email: 'hectorcobea03@gmail.com',
      role: 'SUPER_ADMIN',
      createdAt: new Date(),
      active: true,
    });
    console.log('✅ Super admin creado');

    // 2. Crear tenderos_validos
    console.log('📝 Creando códigos de tenderos...');
    
    const tenderoCodes = [
      { code: 'TEND001', country: 'CO', city: 'Bogotá', district: 'Chapinero' },
      { code: 'TEND002', country: 'CO', city: 'Medellín', district: 'Sabaneta' },
      { code: 'TEND003', country: 'CO', city: 'Cali', district: 'Cristo Rey' },
      { code: 'TEND004', country: 'CO', city: 'Barranquilla', district: 'Riomar' },
      { code: 'TEND005', country: 'CO', city: 'Bucaramanga', district: 'Cabecera' },
      { code: 'TEND006', country: 'MX', city: 'CDMX', district: 'Polanco' },
      { code: 'TEND007', country: 'MX', city: 'Guadalajara', district: 'Chapultepec' },
      { code: 'TEND008', country: 'AR', city: 'Buenos Aires', district: 'Palermo' },
      { code: 'TEND009', country: 'AR', city: 'Córdoba', district: 'Centro' },
      { code: 'TEND010', country: 'PE', city: 'Lima', district: 'Miraflores' },
    ];

    for (const tendero of tenderoCodes) {
      await db.collection('tenderos_validos').doc(tendero.code).set({
        code: tendero.code,
        countryId: tendero.country,
        city: tendero.city,
        district: tendero.district,
        activo: true,
        utilizado: false,
        registeredStoreId: null,
        createdAt: new Date(),
      });
      console.log(`  ✅ ${tendero.code} (${tendero.country})`);
    }

    console.log('');
    console.log('✅ Firestore inicializado correctamente');
    console.log('');
    console.log('📝 Tenderos disponibles para registrar:');
    tenderoCodes.forEach(t => {
      console.log(`   • ${t.code} - ${t.city}, ${t.country}`);
    });
    console.log('');
    console.log('🔑 Super Admin:');
    console.log('   • Email: hectorcobea03@gmail.com');
    console.log('');

  } catch (error) {
    console.error('❌ Error inicializando Firestore:', error);
    process.exit(1);
  }

  process.exit(0);
}

initializeFirestore();
