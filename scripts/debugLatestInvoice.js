const admin = require('firebase-admin');

// Adjust path as needed for local service account
const serviceAccount = require(process.env.SERVICE_ACCOUNT_PATH || '../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function debugLatestInvoice() {
    console.log('🔍 Fetching latest invoice...');
    
    // Store UID from logs: U85Mqj9IkDYHTEFz0Pb7Yo1J5S93
    const storeUid = 'U85Mqj9IkDYHTEFz0Pb7Yo1J5S93'; 

    const snapshot = await db.collection('invoices')
        .where('storeId', '==', storeUid)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        console.log('❌ No invoices found for this store.');
        return;
    }

    const doc = snapshot.docs[0];
    const inv = doc.data();
    
    console.log(`\n--- Latest Invoice (${doc.id}) ---`);
    console.log(`Status: "${inv.status}"`);
    console.log(`InvoiceNumber: "${inv.invoiceNumber}"`);
    console.log(`DistributorId: "${inv.distributorId}"`);
    console.log(`StoreId: "${inv.storeId}"`);
    console.log(`CountryId: "${inv.countryId}"`);
    console.log(`CreatedAt: ${inv.createdAt?.toDate ? inv.createdAt.toDate() : inv.createdAt}`);

    // Check if the store itself has the correct distributor ID
    const storeDoc = await db.collection('stores').doc(storeUid).get();
    const store = storeDoc.data();
    console.log(`\n--- Store Config ---`);
    console.log(`Store.distributorId: "${store?.distributorId}"`);
    
    if (inv.distributorId !== 'DIST-ECU-02') {
        console.error(`💥 MISMATCH: Expected 'DIST-ECU-02' but got '${inv.distributorId}'`);
        console.log('Reason: The backend function created the invoice with an empty or wrong distributorId.');
    } else {
        console.log('✅ DistributorId matches correctly.');
    }
}

debugLatestInvoice().catch(console.error);
