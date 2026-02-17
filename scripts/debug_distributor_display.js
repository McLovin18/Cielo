const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function debugDistributors() {
  console.log('Starting debug of distributor display...');

  try {
    // 1. Get all stores
    console.log('Fetching all stores...');
    const storesSnapshot = await db.collection('users')
      .where('role', '==', 'STORE')
      .get();

    if (storesSnapshot.empty) {
      console.log('No stores found.');
      return;
    }

    console.log(`Found ${storesSnapshot.size} stores.`);

    let issuesFound = 0;

    for (const doc of storesSnapshot.docs) {
      const storeData = doc.data();
      const storeId = doc.id;
      const distributorId = storeData.distributorId;

      if (!distributorId) {
        // console.log(`Store ${storeData.name} (${storeId}) has no distributorId.`);
        continue;
      }

      console.log(`\nChecking Store: ${storeData.name} (${storeData.email})`);
      console.log(`  - Country ID: ${storeData.countryId}`);
      console.log(`  - Distributor ID: ${distributorId}`);

      // 2. Fetch the distributor user directly
      const distDoc = await db.collection('users').doc(distributorId).get();

      if (!distDoc.exists) {
        console.error(`  ❌ ERROR: Distributor document ${distributorId} does NOT exist.`);
        issuesFound++;
        continue;
      }

      const distData = distDoc.data();
      console.log(`  - Distributor Data Found:`);
      console.log(`    - Name: ${distData.name}`);
      console.log(`    - Email: ${distData.email}`);
      console.log(`    - Role: ${distData.role}`);
      console.log(`    - Country ID: ${distData.countryId}`);

      // 3. Check against the query logic used in the app
      // Logic: where('role', '==', 'DISTRIBUTOR') AND where('countryId', '==', currentUser.countryId)
      // Assuming currentUser.countryId matches the store.countryId (which is typical)

      const roleMatches = distData.role === 'DISTRIBUTOR';
      const countryMatches = distData.countryId === storeData.countryId;

      if (roleMatches && countryMatches) {
        console.log(`  ✅ OK: Distributor should be visible.`);
      } else {
        console.log(`  ❌ PROBLEM: Distributor will NOT be visible in the list.`);
        if (!roleMatches) console.log(`     - Reason: Role is '${distData.role}', expected 'DISTRIBUTOR'.`);
        if (!countryMatches) console.log(`     - Reason: CountryId is '${distData.countryId}', expected '${storeData.countryId}'.`);
        issuesFound++;
      }
    }

    console.log(`\nFinished check. Issues found: ${issuesFound}`);

  } catch (error) {
    console.error('Error running script:', error);
  }
}

debugDistributors();
