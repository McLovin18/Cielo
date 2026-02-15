#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Intentar cargar credenciales desde archivo JSON
const credentialPaths = [
  path.join(process.cwd(), 'firebaseServiceAccountKey.json'),
  path.join(process.cwd(), 'serviceAccountKey.json'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.firebase', 'serviceAccountKey.json'),
];

let serviceAccount = null;

for (const credPath of credentialPaths) {
  try {
    if (fs.existsSync(credPath)) {
      console.log(`✅ Cargando credenciales desde: ${credPath}\n`);
      serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      break;
    }
  } catch (error) {
    // Continuar buscando
  }
}

// Inicializar Firebase
try {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    // Intentar con credenciales por defecto (variable de entorno)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'cielo-promo',
    });
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error.message);
  console.log('\n⚠️  IMPORTANTE: Necesitas proporcionar credenciales de Firebase');
  console.log('\nOpciones:');
  console.log('1. Descarga la clave JSON desde Firebase Console → Settings → Service Accounts');
  console.log('   Guarda como: firebaseServiceAccountKey.json en la raíz del proyecto');
  console.log('   Luego ejecuta: node scripts/updateTenderosValidos.js\n');
  console.log('2. O configura la variable de entorno GOOGLE_APPLICATION_CREDENTIALS\n');
  process.exit(1);
}

const db = admin.firestore();

// JSON de tenderos válidos con distribuidores
const tenderosData = {
  "ECU-TEN-0001": { "pais": "Ecuador", "ciudad": "Quito", "distribuidorId": "DIST-ECU-01", "activo": true },
  "ECU-TEN-0002": { "pais": "Ecuador", "ciudad": "Guayaquil", "distribuidorId": "DIST-ECU-02", "activo": true },
  "ECU-TEN-0003": { "pais": "Ecuador", "ciudad": "Cuenca", "distribuidorId": "DIST-ECU-03", "activo": true },
  "ECU-TEN-0004": { "pais": "Ecuador", "ciudad": "Ambato", "distribuidorId": "DIST-ECU-01", "activo": true },
  "ECU-TEN-0005": { "pais": "Ecuador", "ciudad": "Manta", "distribuidorId": "DIST-ECU-02", "activo": true },
  "PER-TEN-0001": { "pais": "Perú", "ciudad": "Lima", "distribuidorId": "DIST-PER-01", "activo": true },
  "PER-TEN-0002": { "pais": "Perú", "ciudad": "Arequipa", "distribuidorId": "DIST-PER-02", "activo": true },
  "PER-TEN-0003": { "pais": "Perú", "ciudad": "Cusco", "distribuidorId": "DIST-PER-03", "activo": true },
  "PER-TEN-0004": { "pais": "Perú", "ciudad": "Trujillo", "distribuidorId": "DIST-PER-01", "activo": true },
  "PER-TEN-0005": { "pais": "Perú", "ciudad": "Piura", "distribuidorId": "DIST-PER-02", "activo": true },
  "MEX-TEN-0001": { "pais": "México", "ciudad": "CDMX", "distribuidorId": "DIST-MEX-01", "activo": true },
  "MEX-TEN-0002": { "pais": "México", "ciudad": "Guadalajara", "distribuidorId": "DIST-MEX-02", "activo": true },
  "MEX-TEN-0003": { "pais": "México", "ciudad": "Monterrey", "distribuidorId": "DIST-MEX-03", "activo": true },
  "MEX-TEN-0004": { "pais": "México", "ciudad": "Puebla", "distribuidorId": "DIST-MEX-01", "activo": true },
  "MEX-TEN-0005": { "pais": "México", "ciudad": "Tijuana", "distribuidorId": "DIST-MEX-02", "activo": true },
  "COL-TEN-0001": { "pais": "Colombia", "ciudad": "Bogotá", "distribuidorId": "DIST-COL-01", "activo": true },
  "COL-TEN-0002": { "pais": "Colombia", "ciudad": "Medellín", "distribuidorId": "DIST-COL-02", "activo": true },
  "COL-TEN-0003": { "pais": "Colombia", "ciudad": "Cali", "distribuidorId": "DIST-COL-03", "activo": true },
  "COL-TEN-0004": { "pais": "Colombia", "ciudad": "Barranquilla", "distribuidorId": "DIST-COL-01", "activo": true },
  "COL-TEN-0005": { "pais": "Colombia", "ciudad": "Cartagena", "distribuidorId": "DIST-COL-02", "activo": true },
  "BRA-TEN-0001": { "pais": "Brasil", "ciudad": "São Paulo", "distribuidorId": "DIST-BRA-01", "activo": true },
  "BRA-TEN-0002": { "pais": "Brasil", "ciudad": "Río de Janeiro", "distribuidorId": "DIST-BRA-02", "activo": true },
  "BRA-TEN-0003": { "pais": "Brasil", "ciudad": "Curitiba", "distribuidorId": "DIST-BRA-03", "activo": true },
  "BRA-TEN-0004": { "pais": "Brasil", "ciudad": "Salvador", "distribuidorId": "DIST-BRA-01", "activo": true },
  "BRA-TEN-0005": { "pais": "Brasil", "ciudad": "Fortaleza", "distribuidorId": "DIST-BRA-02", "activo": true },
  "GTM-TEN-0001": { "pais": "Guatemala", "ciudad": "Ciudad de Guatemala", "distribuidorId": "DIST-GTM-01", "activo": true },
  "GTM-TEN-0002": { "pais": "Guatemala", "ciudad": "Mixco", "distribuidorId": "DIST-GTM-02", "activo": true },
  "GTM-TEN-0003": { "pais": "Guatemala", "ciudad": "Villa Nueva", "distribuidorId": "DIST-GTM-03", "activo": true },
  "GTM-TEN-0004": { "pais": "Guatemala", "ciudad": "Antigua", "distribuidorId": "DIST-GTM-01", "activo": true },
  "GTM-TEN-0005": { "pais": "Guatemala", "ciudad": "Quetzaltenango", "distribuidorId": "DIST-GTM-02", "activo": true },
  "BOL-TEN-0001": { "pais": "Bolivia", "ciudad": "La Paz", "distribuidorId": "DIST-BOL-01", "activo": true },
  "BOL-TEN-0002": { "pais": "Bolivia", "ciudad": "Santa Cruz", "distribuidorId": "DIST-BOL-02", "activo": true },
  "BOL-TEN-0003": { "pais": "Bolivia", "ciudad": "Cochabamba", "distribuidorId": "DIST-BOL-03", "activo": true },
  "BOL-TEN-0004": { "pais": "Bolivia", "ciudad": "Oruro", "distribuidorId": "DIST-BOL-01", "activo": true },
  "BOL-TEN-0005": { "pais": "Bolivia", "ciudad": "Sucre", "distribuidorId": "DIST-BOL-02", "activo": true },
  "PAN-TEN-0001": { "pais": "Panamá", "ciudad": "Ciudad de Panamá", "distribuidorId": "DIST-PAN-01", "activo": true },
  "PAN-TEN-0002": { "pais": "Panamá", "ciudad": "Colón", "distribuidorId": "DIST-PAN-02", "activo": true },
  "PAN-TEN-0003": { "pais": "Panamá", "ciudad": "David", "distribuidorId": "DIST-PAN-03", "activo": true },
  "PAN-TEN-0004": { "pais": "Panamá", "ciudad": "La Chorrera", "distribuidorId": "DIST-PAN-01", "activo": true },
  "PAN-TEN-0005": { "pais": "Panamá", "ciudad": "Santiago", "distribuidorId": "DIST-PAN-02", "activo": true },
  "VEN-TEN-0001": { "pais": "Venezuela", "ciudad": "Caracas", "distribuidorId": "DIST-VEN-01", "activo": true },
  "VEN-TEN-0002": { "pais": "Venezuela", "ciudad": "Maracaibo", "distribuidorId": "DIST-VEN-02", "activo": true },
  "VEN-TEN-0003": { "pais": "Venezuela", "ciudad": "Valencia", "distribuidorId": "DIST-VEN-03", "activo": true },
  "VEN-TEN-0004": { "pais": "Venezuela", "ciudad": "Barquisimeto", "distribuidorId": "DIST-VEN-01", "activo": true },
  "VEN-TEN-0005": { "pais": "Venezuela", "ciudad": "Puerto La Cruz", "distribuidorId": "DIST-VEN-02", "activo": true },
};

async function updateTenderosValidos() {
  console.log('🔄 Actualizando documentos de tenderos_validos con distribuidorId...\n');

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const [code, data] of Object.entries(tenderosData)) {
    try {
      const tenderoRef = db.collection('tenderos_validos').doc(code);
      const doc = await tenderoRef.get();
      
      if (doc.exists) {
        // Actualizar documento existente
        await tenderoRef.update({
          distribuidorId: data.distribuidorId,
          ciudad: data.ciudad,
          pais: data.pais,
          activo: data.activo,
        });
        console.log(`✅ ACTUALIZADO: ${code} → ${data.distribuidorId} (${data.ciudad})`);
        updated++;
      } else {
        // Crear documento si no existe
        await tenderoRef.set({
          code: code,
          ciudad: data.ciudad,
          pais: data.pais,
          distribuidorId: data.distribuidorId,
          activo: data.activo,
          utilizado: false,
          createdAt: admin.firestore.Timestamp.now(),
        });
        console.log(`🆕 CREADO: ${code} → ${data.distribuidorId} (${data.ciudad})`);
        created++;
      }
    } catch (error) {
      console.error(`❌ ERROR: ${code} -`, error.message);
      errors++;
    }
  }

  console.log(`\n📊 RESUMEN:`);
  console.log(`   ✅ Actualizados: ${updated}`);
  console.log(`   🆕 Creados: ${created}`);
  console.log(`   ⏭️  No encontrados: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   📝 Total procesados: ${Object.keys(tenderosData).length}`);
  
  if (errors === 0) {
    console.log(`\n✨ ¡Actualización completada exitosamente!`);
  }
  
  await admin.app().delete();
  process.exit(errors === 0 ? 0 : 1);
}

updateTenderosValidos().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
