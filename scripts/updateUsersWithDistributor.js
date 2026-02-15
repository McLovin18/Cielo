#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Intentar cargar credenciales desde archivo JSON
const credentialPaths = [
  path.join(process.cwd(), 'firebaseServiceAccountKey.json'),
  path.join(process.cwd(), 'serviceAccountKey.json'),
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
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'cielo-promo',
    });
  }
} catch (error) {
  console.error('Error inicializando Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function updateUsersWithDistributorInfo() {
  console.log('🔄 Actualizando usuarios STORE con distribuidorId, ciudad y email...\n');

  try {
    // Obtener todos los usuarios con rol STORE
    const usersQuery = await db.collection('users')
      .where('role', '==', 'STORE')
      .get();

    console.log(`📍 Encontrados ${usersQuery.docs.length} usuarios STORE\n`);

    let updated = 0;
    let missing = 0;
    let errors = 0;

    for (const userDoc of usersQuery.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        let storeCode = userData.storeCode;

        // Si no tiene storeCode en users, buscarlo en stores
        if (!storeCode) {
          try {
            const storeRef = db.collection('stores').doc(userId);
            const storeDoc = await storeRef.get();
            if (storeDoc.exists) {
              const storeData = storeDoc.data();
              storeCode = storeData.storeCode;
              console.log(`  → storeCode encontrado en stores: ${storeCode}`);
            }
          } catch (e) {
            console.log(`  ⚠️  No encontrado en stores`);
          }
        }

        if (!storeCode) {
          console.log(`⏭️  SALTAR: ${userData.name} - No tiene storeCode`);
          missing++;
          continue;
        }

        // Buscar en tenderos_validos
        const tenderoRef = db.collection('tenderos_validos').doc(storeCode);
        const tenderoDoc = await tenderoRef.get();

        if (!tenderoDoc.exists) {
          console.log(`❌ NO ENCONTRADO: ${userData.name} (${storeCode}) - Código no válido`);
          missing++;
          continue;
        }

        const tenderoData = tenderoDoc.data();
        const updateData = {};
        let hasChanges = false;

        // Agregar storeCode si falta
        if (!userData.storeCode && storeCode) {
          updateData.storeCode = storeCode;
          hasChanges = true;
        }

        // Actualizar distributorId si falta o es null
        if (!userData.distributorId && tenderoData.distribuidorId) {
          updateData.distributorId = tenderoData.distribuidorId;
          hasChanges = true;
        }

        // Actualizar ciudad si falta
        if (!userData.city && tenderoData.ciudad) {
          updateData.city = tenderoData.ciudad;
          hasChanges = true;
        }

        // Obtener email de Firebase Auth si no tiene
        if (!userData.email) {
          try {
            const authUser = await admin.auth().getUser(userId);
            if (authUser.email) {
              updateData.email = authUser.email;
              hasChanges = true;
            }
          } catch (e) {
            console.warn(`  ⚠️  No se pudo obtener email de Auth`);
          }
        }

        if (hasChanges) {
          await userDoc.ref.update(updateData);
          const distribuidorId = updateData.distributorId || userData.distributorId;
          const city = updateData.city || userData.city;
          console.log(
            `✅ ACTUALIZADO: ${userData.name} → ${distribuidorId} (${city}) [${storeCode}]`
          );
          updated++;
        } else {
          console.log(`ℹ️  YA COMPLETO: ${userData.name}`);
          updated++;
        }
      } catch (error) {
        console.error(`  ❌ ERROR con usuario: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n📊 RESUMEN:`);
    console.log(`   ✅ Actualizados: ${updated}`);
    console.log(`   ⏭️  Sin storeCode/No encontrados: ${missing}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   📝 Total procesados: ${usersQuery.docs.length}`);

    if (errors === 0) {
      console.log(`\n✨ ¡Actualización de usuarios completada exitosamente!`);
    }

    await admin.app().delete();
    process.exit(errors === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Error fatal:', error);
    await admin.app().delete();
    process.exit(1);
  }
}

updateUsersWithDistributorInfo();
