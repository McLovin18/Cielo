const admin = require('firebase-admin');

// Adjust path as needed for local service account
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkInvoices() {
    console.log('🔍 Checking pending invoices...');
    const snapshot = await db.collection('invoices')
        .where('status', '==', 'pending')
        .get();

    if (snapshot.empty) {
        console.log('❌ No pending invoices found.');
        return;
    }

    console.log(`✅ Found ${snapshot.size} pending invoices.`);
    
    for (const doc of snapshot.docs) {
        const inv = doc.data();
        console.log(`\n--- Invoice ${doc.id} ---`);
        console.log(`Number: ${inv.invoiceNumber}`);
        console.log(`StoreId: ${inv.storeId}`);
        console.log(`DistributorId: "${inv.distributorId}"`); // Quote to see empty string
        console.log(`Created At: ${inv.createdAt?.toDate ? inv.createdAt.toDate() : inv.createdAt}`);

        // Check Store
        if (inv.storeId) {
            const storeDoc = await db.collection('stores').doc(inv.storeId).get();
            if (storeDoc.exists) {
                const store = storeDoc.data();
                console.log(`Store Name: ${store.storeName || store.name}`);
                console.log(`Store DistributorId: "${store.distributorId}"`);
                
                if (store.distributorId !== inv.distributorId) {
                    console.log('⚠️ MISMATCH: Store DistributorId vs Invoice DistributorId');
                    // Automatic fix script could go here but let's just observe.
                }
            } else {
                console.log('❌ Store document not found!');
            }
        }
    }
}

checkInvoices().catch(console.error);
