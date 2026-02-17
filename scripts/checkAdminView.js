const admin = require('firebase-admin');

// Adjust path as needed for local service account
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAdminView() {
    console.log('🔍 Checking Users where role == STORE ...');
    
    // Simulating the query from src/app/admin/stores/page.tsx
    // The query also filters by countryId, let's assume 'ecu' 
    const snapshot = await db.collection('users')
        .where('role', '==', 'STORE')
        // .where('countryId', '==', 'ecu') // Uncomment if you want to be specific
        .get();

    if (snapshot.empty) {
        console.log('❌ No STORE users found.');
        return;
    }

    console.log(`✅ Found ${snapshot.size} users with role STORE.`);
    
    snapshot.forEach(doc => {
        const u = doc.data();
        console.log(`\nUser: ${u.name} (${u.email})`);
        console.log(`Role: ${u.role}`);
        console.log(`DistributorId: ${u.distributorId}`);
        
        // Check if name sounds like "Nexel" or "Lucila" mentioned in the issue
        if (u.name && (u.name.includes('Nexel') || u.name.includes('Lucila'))) {
            console.log('⚠️ POSSIBLE MISMATCH: This user sounds like a distributor or non-store entity.');
        }
    });
}

checkAdminView().catch(console.error);
