const admin = require('firebase-admin');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '../functions/cielodb-78dae-firebase-adminsdk.json');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin inicializado\n');
} catch (error) {
  console.error(
    '❌ No se encontró el archivo de credenciales.',
    'Asegúrate de que existe: functions/cielodb-78dae-firebase-adminsdk.json'
  );
  process.exit(1);
}

const db = admin.firestore();

/**
 * Script para limpiar usuarios duplicados en la colección /users
 */
async function cleanupDuplicateUsers() {
  console.log('🧹 Iniciando limpieza de usuarios duplicados...\n');

  try {
    // 1. Obtener TODOS los documentos de users
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Total de documentos en /users: ${usersSnapshot.size}\n`);

    if (usersSnapshot.size === 0) {
      console.log('✅ No hay documentos en /users');
      return;
    }

    // 2. Agrupar por email
    const usersByEmail = {};

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const email = data?.email;

      if (email) {
        if (!usersByEmail[email]) {
          usersByEmail[email] = [];
        }
        usersByEmail[email].push(doc);
      }
    });

    // 3. Encontrar duplicados
    let duplicateCount = 0;
    let deletedCount = 0;
    const emailsWithDuplicates = [];

    for (const [email, docs] of Object.entries(usersByEmail)) {
      if (docs.length > 1) {
        duplicateCount += docs.length - 1;
        emailsWithDuplicates.push(email);

        console.log(`⚠️  Email con ${docs.length} documentos: ${email}`);

        // Mostrar documentos
        docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(
            `   ${index + 1}. ID: ${doc.id.substring(0, 20)}... | Rol: ${data?.role || 'N/A'} | UID: ${data?.uid?.substring(0, 15)}... || 'N/A'`
          );
        });

        // Estrategia de limpieza:
        // - Mantener el documento con uid como ID (es el principal)
        // - Eliminar documentos con email como ID
        let mainDoc = docs.find((d) => d.id === d.data()?.uid);

        if (!mainDoc) {
          // Si no existe documento con uid, mantener el que tenga uid field
          mainDoc = docs.find((d) => d.data()?.uid);
        }

        if (!mainDoc) {
          // Si no hay uid, mantener el primero
          mainDoc = docs[0];
          console.log(`   ⚠️  No se encontró documento principal, manteniendo: ${mainDoc.id.substring(0, 20)}...`);
        }

        console.log(`   ✅ Documentos a mantener: ${mainDoc.id.substring(0, 20)}...`);

        // Eliminar los otros
        for (const doc of docs) {
          if (doc.id !== mainDoc.id) {
            console.log(`   🗑️  Eliminando: ${doc.id.substring(0, 20)}...`);
            await db.collection('users').doc(doc.id).delete();
            deletedCount++;
          }
        }
        console.log('');
      }
    }

    // 4. Resumen
    console.log('='.repeat(60));
    console.log('📋 RESUMEN DE LIMPIEZA:');
    console.log(`   Emails con duplicados: ${emailsWithDuplicates.length}`);
    console.log(`   Documentos duplicados encontrados: ${duplicateCount}`);
    console.log(`   Documentos eliminados: ${deletedCount}`);

    if (emailsWithDuplicates.length > 0) {
      console.log('\n📧 Emails afectados:');
      emailsWithDuplicates.forEach((email) => {
        console.log(`   - ${email}`);
      });
    } else {
      console.log('\n✅ No se encontraron duplicados');
    }

    console.log('='.repeat(60));
    console.log('✅ Limpieza completada\n');
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

// Ejecutar
cleanupDuplicateUsers()
  .then(() => {
    console.log('✅ Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
