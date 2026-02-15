/**
 * Script para cargar países de prueba en Firestore
 * Cada país será un documento en la colección 'countries'
 * 
 * Uso: npx ts-node scripts/loadCountries.ts
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: firebase-service-account.json no encontrado\n');
  console.error(`📍 Esperado en: ${serviceAccountPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Países a cargar
const countries = [
  {
    id: 'col',
    name: 'Colombia',
    code: 'CO',
    currency: 'COP',
    timezone: 'America/Bogota',
    language: 'es',
    status: 'active',
  },
  {
    id: 'vzla',
    name: 'Venezuela',
    code: 'VE',
    currency: 'VES',
    timezone: 'America/Caracas',
    language: 'es',
    status: 'active',
  },
  {
    id: 'per',
    name: 'Perú',
    code: 'PE',
    currency: 'PEN',
    timezone: 'America/Lima',
    language: 'es',
    status: 'active',
  },
  {
    id: 'ecu',
    name: 'Ecuador',
    code: 'EC',
    currency: 'USD',
    timezone: 'America/Guayaquil',
    language: 'es',
    status: 'active',
  },
  {
    id: 'chi',
    name: 'Chile',
    code: 'CL',
    currency: 'CLP',
    timezone: 'America/Santiago',
    language: 'es',
    status: 'active',
  },
  {
    id: 'arg',
    name: 'Argentina',
    code: 'AR',
    currency: 'ARS',
    timezone: 'America/Argentina/Buenos_Aires',
    language: 'es',
    status: 'active',
  },
  {
    id: 'mex',
    name: 'México',
    code: 'MX',
    currency: 'MXN',
    timezone: 'America/Mexico_City',
    language: 'es',
    status: 'active',
  },
  {
    id: 'esp',
    name: 'España',
    code: 'ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid',
    language: 'es',
    status: 'active',
  },
];

async function loadCountries() {
  try {
    console.log('\n📍 Iniciando carga de países...\n');

    for (const country of countries) {
      const countryRef = db.collection('countries').doc(country.id);
      
      // Agregar timestamps
      const countryData = {
        ...country,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };

      await countryRef.set(countryData);
      console.log(`✅ País creado: ${country.name} (${country.id})`);
    }

    console.log(`\n✅ Total de ${countries.length} países cargados exitosamente\n`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al cargar países:', error, '\n');
    process.exit(1);
  }
}

// Ejecutar
loadCountries();
