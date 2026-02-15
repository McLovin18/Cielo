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

(async () => {
  try {
    console.log('📍 Buscando usuarios STORE...\n');
    const users = await db.collection('users').where('role', '==', 'STORE').get();
    
    console.log(`Usuarios STORE encontrados: ${users.docs.length}\n`);
    
    users.docs.forEach(doc => {
      const data = doc.data();
      console.log(`📄 ${data.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   storeCode: ${data.storeCode || 'SIN ASIGNAR'}`);
      console.log(`   countryId: ${data.countryId || 'SIN ASIGNAR'}`);
      console.log(`   city: ${data.city || 'SIN ASIGNAR'}`);
      console.log(`   distributorId: ${data.distributorId || 'SIN ASIGNAR'}`);
      console.log('');
    });
    
    await admin.app().delete();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    await admin.app().delete();
    process.exit(1);
  }
})();
