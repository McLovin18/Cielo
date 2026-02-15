/**
 * Script para cargar masivamente tendederos a Firestore
 * Automatiza la inserción de datos en batch (rápido y eficiente)
 * Soporta millones de registros sin problema
 * 
 * Uso: npx ts-node scripts/loadTenderos.ts
 * 
 * Requisitos:
 * 1. firebase-service-account.json en la raíz
 * 2. TENDEROS_VALIDOS_50.json (o superior)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: firebase-service-account.json no encontrado\n');
  console.error(`📍 Esperado en: ${serviceAccountPath}`);
  console.error('\n📝 Para obtenerlo:');
  console.error('1. Firebase Console → Project Settings (gear icon)');
  console.error('2. Service Accounts tab');
  console.error('3. Click "Generate New Private Key"');
  console.error('4. Guardar como firebase-service-account.json en la raíz\n');
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

// Tipos
interface Tendero {
  pais: string;
  ciudad: string;
  activo: boolean;
  utilizado?: boolean;
}

interface TenderosData {
  [code: string]: Tendero;
}

// Función principal de carga
async function loadTenderos() {
  try {
    console.log('\n📦 Iniciando carga de tendederos...\n');

    // Leer archivo JSON
    const jsonPath = path.join(__dirname, '../TENDEROS_VALIDOS_50.json');
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ Archivo no encontrado: ${jsonPath}`);
      process.exit(1);
    }

    const tenderosData: TenderosData = JSON.parse(
      fs.readFileSync(jsonPath, 'utf8')
    );

    const codes = Object.keys(tenderosData);
    console.log(`📊 Total de tendederos a cargar: ${codes.length}\n`);

    // Cargar en batches (máximo 500 documentos por batch)
    const batchSize = 500;
    let batchCount = 0;
    let totalLoaded = 0;

    for (let i = 0; i < codes.length; i += batchSize) {
      batchCount++;
      const batch = db.batch();
      const batchCodes = codes.slice(i, Math.min(i + batchSize, codes.length));

      for (const code of batchCodes) {
        const tendero = tenderosData[code];
        const docRef = db.collection('tenderos_validos').doc(code);
        
        batch.set(docRef, {
          ...tendero,
          code: code,
          utilizado: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      totalLoaded += batchCodes.length;
      
      const progress = ((totalLoaded / codes.length) * 100).toFixed(1);
      console.log(`✅ Batch ${batchCount}: ${batchCodes.length} documentos | Total: ${totalLoaded}/${codes.length} (${progress}%)`);
    }

    console.log('\n🎉 ¡Carga completada exitosamente!');
    console.log(`📊 ${totalLoaded} tendederos cargados en Firestore\n`);

    // Mostrar resumen por país
    const summary: { [key: string]: number } = {};
    for (const code of codes) {
      const pais = tenderosData[code].pais;
      summary[pais] = (summary[pais] || 0) + 1;
    }

    console.log('📍 Distribución por país:');
    for (const [pais, count] of Object.entries(summary).sort()) {
      console.log(`   ${pais}: ${count}`);
    }

    console.log('\n✅ Próximos pasos:');
    console.log('1. Verificar en Firebase Console → Firestore Database');
    console.log('2. Actualizar Firestore Rules');
    console.log('3. Test: Registrar tendero con código válido\n');

  } catch (error) {
    console.error('❌ Error durante la carga:', error);
    process.exit(1);
  } finally {
    await admin.app().delete();
    process.exit(0);
  }
}

// Ejecutar
loadTenderos().catch(console.error);

