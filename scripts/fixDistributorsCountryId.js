// Script para corregir usuarios DISTRIBUTOR sin countryId en Firestore
// Ejecuta este script con Node.js y las credenciales de admin de Firebase

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../firebaseServiceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function fixDistributorsCountryId() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'DISTRIBUTOR').get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.countryId) {
      // Aquí debes definir cómo obtener el countryId correcto para cada distribuidor
      // Por ejemplo, si tienes un campo "distributorId" tipo "DIST-ECU-02", puedes mapearlo a un país
      // Aquí un ejemplo simple para Ecuador:
      let countryId = null;
      if (data.distributorId && data.distributorId.startsWith('DIST-ECU')) {
        countryId = 'ECU';
      }
      // Agrega más lógica según tu convención de IDs
      if (countryId) {
        await doc.ref.update({ countryId });
        console.log(`✅ countryId asignado a ${doc.id}: ${countryId}`);
        updated++;
      } else {
        console.warn(`⚠️ No se pudo determinar countryId para ${doc.id}`);
      }
    }
  }
  console.log(`\nTotal de distribuidores actualizados: ${updated}`);
}

fixDistributorsCountryId().then(() => process.exit());
