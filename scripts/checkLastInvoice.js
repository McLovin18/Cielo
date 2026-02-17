const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const STORE_ID = 'U85Mqj9IkDYHTEFz0Pb7Yo1J5S93';
const DISTRIBUTOR_ID = 'DIST-ECU-02';

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'checkLastInvoice_output.txt');

function log(message) {
  console.log(message);
  fs.appendFileSync(OUTPUT_FILE, message + '\n');
}

async function checkLastInvoice() {
  fs.writeFileSync(OUTPUT_FILE, ''); // Clear previous output
  log(`Checking last invoice for Store: ${STORE_ID}`);
  
  const invoicesSnapshot = await db.collection('invoices')
    .where('storeId', '==', STORE_ID)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (invoicesSnapshot.empty) {
    log('No invoices found for this store.');
    return;
  }

  const invoiceDoc = invoicesSnapshot.docs[0];
  const invoiceData = invoiceDoc.data();

  log('--- Most Recent Invoice ---');
  log(`ID: ${invoiceDoc.id}`);
  log(`Invoice Number: ${invoiceData.invoiceNumber}`);
  log(`Status: ${invoiceData.status}`);
  log(`Distributor ID: ${invoiceData.distributorId}`);
  log(`Store ID: ${invoiceData.storeId}`);
  log(`Created At: ${invoiceData.createdAt.toDate ? invoiceData.createdAt.toDate() : invoiceData.createdAt}`);
  
  // Validation
  log('--- Validation ---');
  if (invoiceData.distributorId !== DISTRIBUTOR_ID) {
    log(`❌ ERROR: distributorId mismatch! Expected '${DISTRIBUTOR_ID}', found '${invoiceData.distributorId}'`);
    
    // Check Store Data to see why it might be missing
    const storeDoc = await db.collection('stores').doc(STORE_ID).get();
    if (storeDoc.exists) {
        log(`Store Data distributorId: ${storeDoc.data().distributorId}`);
    } else {
        log('Store document not found!');
    }

  } else {
    log('✅ distributorId matches.');
  }

  if (invoiceData.status !== 'pending') {
     log(`⚠️ Warning: Status is '${invoiceData.status}', expected 'pending' for distributor review.`);
  }

}

checkLastInvoice().catch(console.error);
