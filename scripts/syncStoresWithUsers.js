#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebaseServiceAccountKey.json'), 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const db = admin.firestore();

async function syncStoresWithUsers() {
  console.log('🔄 Sincronizando colecciones users ↔️ stores...\n');

  try {
    // Obtener todos los usuarios con rol STORE
    const usersQuery = await db.collection('users')
      .where('role', '==', 'STORE')
      .get();

    console.log(`📍 Encontrados ${usersQuery.docs.length} usuarios STORE\n`);

    let synced = 0;
    let errors = 0;

    for (const userDoc of usersQuery.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;

        console.log(`\n📄 ${userData.name} (${userId})`);

        // Obtener documento en stores
        const storeRef = db.collection('stores').doc(userId);
        const storeDoc = await storeRef.get();

        if (!storeDoc.exists) {
          console.log(`   ⚠️  No existe en stores, saltando`);
          continue;
        }

        const storeData = storeDoc.data();
        const updateData = {};
        let hasChanges = false;

        // Sincronizar FROM users TO stores
        const fieldsToSync = [
          'email',
          'city',
          'countryId',
          'distributorId',
          'phone',
          'name',
          'status',
          'storeCode'
        ];

        for (const field of fieldsToSync) {
          if (userData[field] !== storeData[field]) {
            updateData[field] = userData[field] || null;
            hasChanges = true;
            console.log(`   🔄 ${field}: ${storeData[field]} → ${userData[field]}`);
          }
        }

        // Si hay cambios, guardar en stores
        if (hasChanges) {
          await storeRef.update(updateData);
          console.log(`   ✅ Sincronizado a stores`);
          synced++;
        } else {
          console.log(`   ℹ️  Ya sincronizado`);
          synced++;
        }
      } catch (error) {
        console.error(`   ❌ ERROR: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Sincronizados: ${synced}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📝 Total procesados: ${usersQuery.docs.length}`);

    if (errors === 0) {
      console.log(`\n✨ ¡Sincronización completada exitosamente!`);
    }

    await admin.app().delete();
    process.exit(errors === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    await admin.app().delete();
    process.exit(1);
  }
}

syncStoresWithUsers();
