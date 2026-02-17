const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkUsers() {
    console.log('🔍 Checking users and roles...');
    const snapshot = await db.collection('users').get();
    
    if (snapshot.empty) {
        console.log('No users found.');
        return;
    }

    console.log(`Found ${snapshot.size} users.`);
    let storeCount = 0;
    let distCount = 0;
    
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.role === 'STORE') {
            storeCount++;
            // Log Stores that seem suspicious (e.g. have 'distribu' in email or name)
            if (data.email.includes('dist') || (data.name && data.name.toLowerCase().includes('entregas'))) {
                 console.log(`⚠️ SUSPICIOUS STORE: ${doc.id} | Email: ${data.email} | Name: ${data.name} | Role: ${data.role}`);
            }
        }
        if (data.role === 'DISTRIBUTOR') distCount++;
    });

    console.log(`\nSummary:`);
    console.log(`- STORES: ${storeCount}`);
    console.log(`- DISTRIBUTORS: ${distCount}`);
}

checkUsers().catch(console.error);
