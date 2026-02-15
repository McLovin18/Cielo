const admin = require('firebase-admin');

const serviceAccount = require('../firebaseServiceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// JSON de tenderos válidos con distribuidores
const tenderosData: Record<string, { pais: string; ciudad: string; distribuidorId: string; activo: boolean }> = {
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
  let skipped = 0;

  for (const [code, data] of Object.entries(tenderosData)) {
    try {
      await db.collection('tenderos_validos').doc(code).update({
        distribuidorId: data.distribuidorId,
      });
      console.log(`✅ ${code} → ${data.distribuidorId} (${data.ciudad})`);
      updated++;
    } catch (error: any) {
      if (error.code === 'not-found') {
        console.log(`⏭️  ${code} no existe (será creado en próximo registro)`);
        skipped++;
      } else {
        console.error(`❌ Error actualizando ${code}:`, error.message);
      }
    }
  }

  console.log(`\n✅ Actualización completada: ${updated} actualizados, ${skipped} no encontrados`);
  process.exit(0);
}

updateTenderosValidos().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
