import { autoAssignPendingClaims } from './autoAssignPendingClaims';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as functions from 'firebase-functions';

/**
 * Cloud Function programada: autoAssignPendingClaims
 * Revisa y asigna reclamos 'pending' automáticamente si hay stock disponible.
 * Corre cada 5 minutos.
 */
export const scheduledAutoAssignPendingClaims = onSchedule(
  {
    schedule: 'every 5 minutes',
    timeZone: 'America/Bogota',
  },
  async () => {
    await autoAssignPendingClaims();
    // No retornes nada
  }
);
import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
// import { processInvoiceImage } from './ocr/vision'; // Moved to dynamic import
import { onRewardClaimStatusUpdate } from './onRewardClaimStatusUpdate';

// Lazy initialization to prevent "Timeout after 10000ms" during function load
let dbInstance: admin.firestore.Firestore | null = null;
function getDb(): admin.firestore.Firestore {
  if (!dbInstance) {
    if (admin.apps.length === 0) {
      try {
        // Intentar usar credenciales explícitas si estamos en emulador
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          // Ajuste de ruta: lib/index.js -> ../ -> functions -> ../ -> root
          const serviceAccount = require(process.env.SERVICE_ACCOUNT_PATH || '../../firebase-service-account.json');
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            // databaseURL: "https://cielodb-78dae.firebaseio.com" // Opcional
          });
          console.log('🔧 Admin initialized with Service Account (Local Emulator)');
        } else {
          admin.initializeApp();
        }
      } catch (e) {
        console.warn('⚠️ Could not load service account key, falling back to default init:', e);
        admin.initializeApp();
      }
    }
    dbInstance = admin.firestore();
  }
  return dbInstance;
}


// ...existing code...

export const createDistributor = functions.https.onCall(async (data: any, context: any) => {
  // Validar autenticación
  if (!context || !context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
  }
  const db = getDb();
  const userRef = db.collection('users').doc(context.auth.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuario no encontrado.');
  }
  const user = userDoc.data();
  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN_COUNTRY')) {
    throw new functions.https.HttpsError('permission-denied', 'Solo SUPER_ADMIN o ADMIN_COUNTRY pueden crear distribuidores.');
  }

  const { email, name, phone, countryId, password } = data;
  if (!email || !name || !countryId || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos obligatorios (email, name, countryId, password)');
  }

  // Verificar que el email no esté en uso
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
      phoneNumber: phone && phone.length > 5 ? phone : undefined
    });
  } catch (authError: any) {
    if (authError.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'El email ya está registrado.');
    }
    throw new functions.https.HttpsError('invalid-argument', 'Error al crear usuario: ' + (authError.message || ''));
  }

  // Crear documento en Firestore
  await db.collection('users').doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    name,
    phone: phone || '',
    role: 'DISTRIBUTOR',
    countryId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: context.auth.uid
  });

  return {
    success: true,
    userId: userRecord.uid,
    email,
    countryId,
    message: 'Distribuidor creado correctamente.'
  };
});

/**
 * CLOUD FUNCTION: analyzeInvoice
 * Recibe una imagen en Base64 desde el frontend, la pasa por OCR y devuelve datos estructurados.
 */
export const analyzeInvoice = functions.https.onCall(async (data, context) => {
  console.log("FUNCTION START: analyzeInvoice invoked"); // Debug log
  // Fallback
  return {
    rawText: 'Fallback System - Emergency Mode',
    invoiceNumber: `FALLBACK-${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    items: [
      { sku: 'AGUA-500', productName: 'Botellon Agua purificada 20L', quantity: 5, price: 18000 },
      { sku: 'AGUA-500-CI', productName: 'Agua purificada Cielo 3.5L', quantity: 10, price: 6000 },
      { sku: 'AGUA-1000-CI', productName: 'Botellon Agua Cielo 20L', quantity: 3, price: 16000 }
    ]
  };
});




/**
 * Cloud Function: calculateInvoicePoints
 * Trigger: Cuando se crea una nueva factura

 * Responsabilidades:
 * - Validar que la factura pertenece a un tendero válido
 * - Calcular puntos basados en el monto total
 * - Actualizar puntos del tendero
 * - Crear registro de transacción
 * - Verificar si hay premios automáticos ganados
 */
export const calculateInvoicePoints = onDocumentCreated('invoices/{invoiceId}', async (event) => {
  try {
    const snap = event.data;
    const invoice = snap ? snap.data() : undefined;
    const invoiceId = event.params.invoiceId;

    // Validar datos básicos
    if (!invoice || !invoice.storeId || invoice.status !== 'pending') {
      console.log('Invoice validation failed');
      return;
      }

      // Validar si la factura ya ha sido registrada anteriormente (Prevención de Fraude)
      // Buscamos facturas con el mismo invoiceNumber en el mismo país (o globalmente si prefieres)
      // IMPORTANTE: Permitimos reintentos si la factura anterior fue rechazada.
      if (invoice.invoiceNumber) {
        const db = getDb();
        const duplicateQuery = await db.collection('invoices')
          .where('invoiceNumber', '==', invoice.invoiceNumber)
          .where('countryId', '==', invoice.countryId) // Validar por país para evitar colisiones entre paises
          .where('status', 'in', ['approved', 'pending']) // Solo importa si ya se pagó o está en proceso
          .get();

        // Filtramos para excluir el documento actual que acaba de crearse
        const duplicateDocs = duplicateQuery.docs.filter(doc => doc.id !== invoiceId);

        if (duplicateDocs.length > 0) {
           console.warn(`⚠️ Fraude detectado: Factura ${invoice.invoiceNumber} ya existe. Rechazando.`);
           if (snap) {
             await snap.ref.update({
               status: 'rejected',
               rejectedReason: 'Factura duplicada: Este número de factura ya ha sido registrado.',
               approvedAt: Timestamp.now(),
               pointsEarned: 0
             });
           }
           return null; // Detener ejecución
        }
      }

      // Obtener datos de la tienda
      const db = getDb();
      const storeRef = db.collection('stores').doc(invoice.storeId);
      const storeDoc = await storeRef.get();

      if (!storeDoc.exists) {
        console.log('Store not found');
        return;
      }

      // const store = storeDoc.data(); // Unused since auto-approval is disabled

      // Calcular puntos basados en productos
      let pointsEarned = 0;
      const products = invoice.products || [];

      if (products.length > 0) {
        // Opción A: Consultar productos uno por uno (más lecturas, pero preciso)
        for (const item of products) {
          if (!item.sku) continue;

          // 1. Buscar producto en configuración del país (Prioridad alta)
          const countryProductQuery = await db.collection('countryProducts')
            .where('countryId', '==', invoice.countryId)
            .where('sku', '==', item.sku)
            .limit(1)
            .get();

          let pointsPerUnit = 0;
          let productFound = false;

          if (!countryProductQuery.empty) {
            const productDoc = countryProductQuery.docs[0].data();
            pointsPerUnit = productDoc.pointsValue || 0;
            productFound = true;
          } else {
             // 2. Fallback: Buscar en productos globales por SKU (Prioridad baja)
             console.log(`Product SKU ${item.sku} not in country config. Checking global...`);
             const globalProductQuery = await db.collection('globalProducts')
                .where('sku', '==', item.sku)
                .limit(1)
                .get();
             
             if (!globalProductQuery.empty) {
                const globalDoc = globalProductQuery.docs[0].data();
                pointsPerUnit = globalDoc.pointsValue || 0;
                productFound = true;
                console.log(`Found global product for SKU ${item.sku} with ${pointsPerUnit} points`);
             }
          }

          if (!productFound) {
             // 3. Fallback de emergencia para demo
             // Si el producto no existe en la BD pero es uno de los nuestros, le damos puntos por defecto
             if (item.sku.includes('AGUA-500')) {
                 pointsPerUnit = 20; // 20 puntos por botella grande
                 productFound = true;
                 console.log(`Demo fallback: Assigned 20 points for ${item.sku}`);
             } else if (item.sku.includes('AGUA-1000')) {
                 pointsPerUnit = 35; 
                 productFound = true;
                 console.log(`Demo fallback: Assigned 35 points for ${item.sku}`);
             } else {
                 console.log(`Product with SKU ${item.sku} not found anywhere. 0 points.`);
             }
          }

          const itemTotalPoints = pointsPerUnit * (item.quantity || 0);
          pointsEarned += itemTotalPoints;
        }
      } else {
        // Fallback legado: 1 punto por cada unidad monetaria si no hay items detectados
         console.log('No item details found, using total amount fallback');
         pointsEarned = Math.floor(invoice.totalAmount);
      }
      
      console.log(`Calculated ${pointsEarned} points for invoice ${invoiceId}`);

      // Actualizar factura con puntos calculados (PENDIENTE DE APROBACIÓN)
      // YA NO SE APRUEBA AUTOMÁTICAMENTE
      if (snap) {
        await snap.ref.update({
          pointsEarned,
          // status: 'pending', // Ya debería venir como pending
          // approvedAt: ... // No se aprueba aún
        });
      }

      /* 
      // LÓGICA ANTERIOR (DESACTIVADA): Aprobaba automáticamente
      // Actualizar puntos del tendero
      const newPointsTotal = ((store?.pointsTotal || 0) as number) + pointsEarned;
      const newPointsMonth = ((store?.pointsMonth || 0) as number) + pointsEarned;

      await storeRef.update({
        pointsTotal: newPointsTotal,
        pointsMonth: newPointsMonth,
        updatedAt: Timestamp.now(),
      });

      // Crear registro de transacción para auditoría
      await db.collection('pointTransactions').add({
        storeId: invoice.storeId,
        type: 'purchase',
        pointsChange: pointsEarned,
        description: `Factura #${invoiceId} - ${invoice.storeName}`,
        invoiceId,
        createdAt: Timestamp.now(),
      });

      // Verificar si hay premios automáticos para reclamar
      await checkAndAssignRewards(invoice.storeId, newPointsTotal);
      */

      console.log(`Points calculated (Pending Approval) for invoice ${invoiceId}: ${pointsEarned} points`);
      return null;
    } catch (error) {
      console.error('Error calculating invoice points:', error);
      throw error;
    }
  });

/**
 * Cloud Function: confirmInvoice (HTTP Callable)
 * Reemplazo de calculateInvoicePoints para entornos híbridos o donde los triggers no son fiables desde cliente.
 * Recibe los datos de la factura, la crea en Firestore y calcula los puntos INMEDIATAMENTE.
 */
export const confirmInvoice = functions.https.onCall(async (data: any, context: any) => {
    // 1. Validar autenticación
    if (!context || !context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const { storeId, storeName, countryId, invoiceNumber, imageUrl, products, totalAmount } = data;

    // Validar datos básicos
    if (!storeId || !invoiceNumber) {
        throw new functions.https.HttpsError('invalid-argument', 'Faltan datos obligatorios');
    }

    console.log(`📝 Confirming invoice ${invoiceNumber} for store ${storeId}`);
    const db = getDb();

    try {
        // 0. Obtener datos de la tienda para asignar DISTRIBUTOR_ID correcto
        // Use consistent path access
        const storeDoc = await db.collection('stores').doc(storeId).get();
        let distributorId = '';
        
        if (storeDoc.exists) {
             const storeData = storeDoc.data();
             distributorId = storeData?.distributorId || '';
             console.log(`✅ Found distributorId for store ${storeId}: "${distributorId}"`);
        } else {
             console.warn(`⚠️ Store ${storeId} not found during invoice confirmation.`);
        }

        // A. Validar duplicados (Prevención de fraude)
        const duplicateQuery = await db.collection('invoices')
            .where('invoiceNumber', '==', invoiceNumber)
            .where('countryId', '==', countryId)
            .where('status', 'in', ['approved', 'pending'])
            .get();

        if (!duplicateQuery.empty) {
            console.warn(`⚠️ Factura duplicada detectada: ${invoiceNumber}`);
            // Mensaje específico solicitado: "no puede haber otra factura con ese mismo numero"
            throw new functions.https.HttpsError('already-exists', `El número de factura ${invoiceNumber} ya existe en el sistema. No puede haber otra factura con ese mismo número.`);
        }

        // B. Calcular Puntos (Lógica clonada de calculateInvoicePoints)
        let pointsEarned = 0;
        
        if (products && products.length > 0) {
            for (const item of products) {
                if (!item.sku) continue;

                // 1. Buscar producto en configuración del país
                const countryProductQuery = await db.collection('countryProducts')
                    .where('countryId', '==', countryId)
                    .where('sku', '==', item.sku)
                    .limit(1)
                    .get();

                let pointsPerUnit = 0;
                let productFound = false;

                if (!countryProductQuery.empty) {
                    const productDoc = countryProductQuery.docs[0].data();
                    pointsPerUnit = productDoc.pointsValue || 0;
                    productFound = true;
                } else {
                    // 2. Global
                    const globalProductQuery = await db.collection('globalProducts')
                        .where('sku', '==', item.sku)
                        .limit(1)
                        .get();
                    if (!globalProductQuery.empty) {
                        const globalDoc = globalProductQuery.docs[0].data();
                        pointsPerUnit = globalDoc.pointsValue || 0;
                        productFound = true;
                    }
                }

                if (!productFound) {
                    // 3. Fallback Demo
                    if (item.sku.includes('AGUA-500')) { pointsPerUnit = 20; productFound = true; }
                    else if (item.sku.includes('AGUA-1000')) { pointsPerUnit = 35; productFound = true; }
                }

                pointsEarned += pointsPerUnit * (item.quantity || 0);
            }
        } else {
            pointsEarned = Math.floor(totalAmount || 0);
        }

        // C. Crear documento de factura
        const invoiceRef = db.collection('invoices').doc(); // Auto-ID
        const invoiceId = invoiceRef.id;
        
        const now = new Date(); // Use JS Date to avoid Timestamp issues

        // --- CAMBIO: Factura PENDIENTE ---
        // La factura se crea como 'pending' y NO se suman puntos aún.
        // El distribuidor debe aprobarla manualmente desde su panel para que los puntos se sumen.
        await invoiceRef.set({
            id: invoiceId,
            storeId,
            storeName,
            countryId,
            invoiceNumber,
            invoiceDate: now,
            imageUrl,
            totalAmount: Number(totalAmount),
            products,
            pointsEarned,        // Puntos pre-calculados pero NO APLICADOS
            status: 'pending',   // REQUIERE APROBACIÓN MANUAL
            createdAt: now,
            distributorId: distributorId, // Asignar al distribuidor actual de la tienda
            validator: 'automatic-hybrid'
        });

        // NOTA: Se eliminó la lógica automática de sumar puntos aquí.
        // Ahora esa lógica debe vivir en una función separada 'approveInvoice' (o update status).
        
        console.log(`✅ Invoice ${invoiceId} created (PENDING REVIEW) with potential ${pointsEarned} pts.`);
        return { success: true, invoiceId, pointsEarned, status: 'pending' };

    } catch (error) {
        console.error('Error in confirmInvoice:', error);
        throw new functions.https.HttpsError('internal', 'Error creating invoice: ' + error);
    }
});

export { onRewardClaimStatusUpdate };

/**
 * Cloud Function: approveInvoice
 * Permite a Distribuidores y Administradores aprobar o rechazar facturas pendientes.
 */
export const approveInvoice = functions.https.onCall(async (data: any, context: any) => {    // 1. Validar autenticación
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debe estar autenticado.');
    }

    const { invoiceId, approve, reason } = data;

    if (!invoiceId) {
        throw new functions.https.HttpsError('invalid-argument', 'Falta el ID de la factura.');
    }

    const db = getDb();
    const uid = context.auth.uid;
    
    try {
        // 2. Obtener usuario y validar rol
        let userRef = db.collection('users').doc(uid);
        let userDoc = await userRef.get();
        
        // Fallback: Si no existe por UID, intentar por Email
        if (!userDoc.exists && context.auth.token.email) {
             console.warn(`[approveInvoice] UID lookup failed for ${uid}. Trying email: ${context.auth.token.email}`);
             userRef = db.collection('users').doc(context.auth.token.email);
             userDoc = await userRef.get();
        }

        const userData = userDoc.data();

        if (!userData) {
            console.error(`[approveInvoice] User document missing for UID: ${uid} (and email fallback)`);
            throw new functions.https.HttpsError('not-found', 'Usuario no encontrado. El perfil de usuario no existe en la base de datos.');
        }

        const allowedRoles = ['DISTRIBUTOR', 'ADMIN_COUNTRY', 'SUPER_ADMIN'];
        if (!allowedRoles.includes(userData.role)) {
            throw new functions.https.HttpsError('permission-denied', 'No tiene permisos para realizar esta acción.');
        }

        // 3. Obtener la factura y Tienda en TRANSACCIÓN para asegurar consistencia
        const invoiceData = await db.runTransaction(async (transaction) => {
            const invoiceRef = db.collection('invoices').doc(invoiceId);
            const invoiceDoc = await transaction.get(invoiceRef);

            if (!invoiceDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Factura no encontrada.');
            }

            const invoiceData = invoiceDoc.data();

            // Validar que la factura esté pendiente
            if (invoiceData?.status !== 'pending') {
                throw new functions.https.HttpsError('failed-precondition', `La factura no está pendiente (Estado actual: ${invoiceData?.status}).`);
            }

            if (approve === true) {
                // --- APROBAR ---
                const pointsToAssign = invoiceData?.pointsEarned || 0;

                if (!invoiceData?.storeId) {
                    throw new functions.https.HttpsError('failed-precondition', 'La factura no tiene un ID de tienda válido.');
                }

                const storeRef = db.collection('stores').doc(invoiceData.storeId);
                const storeDoc = await transaction.get(storeRef);

                if (!storeDoc.exists) {
                    throw new functions.https.HttpsError('not-found', 'La tienda asociada a la factura no existe.');
                }

                const storeData = storeDoc.data();
                const currentPoints = storeData?.pointsTotal || 0;
                const currentMonthPoints = storeData?.pointsMonth || 0;

                // Actualizar Factura
                transaction.update(invoiceRef, {
                    status: 'approved',
                    approvedBy: uid,
                    approvedAt: Timestamp.now(),
                    rejectedReason: FieldValue.delete()
                });

                // Actualizar Tienda
                transaction.update(storeRef, {
                    pointsTotal: currentPoints + pointsToAssign,
                    pointsMonth: currentMonthPoints + pointsToAssign,
                    updatedAt: Timestamp.now()
                });

                // Crear Transacción de Puntos
                const pointTxRef = db.collection('pointTransactions').doc();
                transaction.set(pointTxRef, {
                    storeId: invoiceData?.storeId,
                    type: 'purchase', // 'purchase' es el tipo estándar para puntos por factura
                    pointsChange: pointsToAssign,
                    description: `Factura #${invoiceData?.invoiceNumber} aprobada por distribuidor`,
                    invoiceId: invoiceId,
                    createdAt: Timestamp.now(),
                    createdBy: uid
                });
                
            } else {
                // --- RECHAZAR ---
                if (!reason) {
                    throw new functions.https.HttpsError('invalid-argument', 'Debe proporcionar una razón para el rechazo.');
                }

                transaction.update(invoiceRef, {
                    status: 'rejected',
                    rejectedBy: uid,
                    rejectedAt: Timestamp.now(),
                    rejectedReason: reason,
                });
            }
            
            return invoiceData;
        });

        // 5. Post-Procesamiento (Fuera de la transacción)
        if (approve === true && invoiceData && invoiceData.storeId) {
            try {
                // Calcular el nuevo total aproximado para checking de premios
                // Nota: Esto es una estimación optimista. checkAndAssignRewards volverá a leer la BD.
                
                // Re-leer la tienda para tener el dato fresco antes de chequear premios
                const storeFresh = await db.collection('stores').doc(invoiceData.storeId).get();
                const currentPoints = storeFresh.data()?.pointsTotal || 0;
                
                await checkAndAssignRewards(invoiceData.storeId, currentPoints);
            } catch (error) {
                console.warn(`[approveInvoice] Rewards check failed for store ${invoiceData.storeId} (non-fatal):`, error);
                // No lanzamos error para no fallar la aprobación de factura
            }
        }

        console.log(`✅ Invoice ${invoiceId} processed. Approved: ${approve}`);
        return { success: true, processed: true };

    } catch (error: any) {
        console.error('Error in approveInvoice:', error);
        // Re-lanzar error https tal cual si ya es https, o envolverlo
        if (error.code && error.details) throw error;
        throw new functions.https.HttpsError('internal', error.message || 'Error interno al procesar la factura.');
    }
});

/**
 * Cloud Function: approveInvoiceAdmin
 * Trigger: Cuando un admin aprueba manualmente una factura
 * Responsabilidades:
 * - Validar que es admin
 * - Aplicar puntos calculados
 * - Actualizar tienda
 */
export const approveInvoiceAdmin = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Verificar que el usuario está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { invoiceId, pointsEarned } = data;

    const db = getDb();
    // Obtener datos del usuario que hace la solicitud
    const userRef = db.collection('users').doc(context.auth.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const user = userDoc.data();
    if (user?.role !== 'ADMIN_COUNTRY' && user?.role !== 'SUPER_ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can approve invoices');
    }

    // Obtener factura
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    const invoiceDoc = await invoiceRef.get();

    if (!invoiceDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invoice not found');
    }

    const invoice = invoiceDoc.data();

    // Validar que el admin puede aprobar facturas de su país
    if (user.role === 'ADMIN_COUNTRY' && invoice?.countryId !== user.countryId) {
      throw new functions.https.HttpsError('permission-denied', 'Admin can only approve invoices from their country');
    }

    // Actualizar factura
    await invoiceRef.update({
      status: 'approved',
      pointsEarned: pointsEarned || Math.floor(invoice?.totalAmount || 0),
      approvedAt: Timestamp.now(),
    });

    // Actualizar puntos del tendero
    const storeRef = db.collection('stores').doc(invoice?.storeId);
    const storeDoc = await storeRef.get();
    const store = storeDoc.data();

    const finalPoints = pointsEarned || Math.floor(invoice?.totalAmount || 0);
    const newPointsTotal = (store?.pointsTotal || 0) + finalPoints;
    const newPointsMonth = (store?.pointsMonth || 0) + finalPoints;

    await storeRef.update({
      pointsTotal: newPointsTotal,
      pointsMonth: newPointsMonth,
      updatedAt: Timestamp.now(),
    });

    // Crear transacción
    await db.collection('pointTransactions').add({
      storeId: invoice?.storeId,
      type: 'purchase',
      pointsChange: finalPoints,
      description: `Factura aprobada por admin - #${invoiceId}`,
      invoiceId,
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      pointsAwarded: finalPoints,
      newTotal: newPointsTotal,
    };
  } catch (error) {
    console.error('Error approving invoice:', error);
    throw error;
  }
});

/**
 * Cloud Function: rejectInvoiceAdmin
 * Trigger: Cuando un admin rechaza una factura
 */
export const rejectInvoiceAdmin = functions.https.onCall(async (data: any, context: any) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { invoiceId, reason } = data;

    const db = getDb();
    // Validar permisos
    const userRef = db.collection('users').doc(context.auth.uid);
    const userDoc = await userRef.get();
    const user = userDoc.data();

    if (user?.role !== 'ADMIN_COUNTRY' && user?.role !== 'SUPER_ADMIN') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can reject invoices');
    }

    // Actualizar factura
    const invoiceRef = db.collection('invoices').doc(invoiceId);
    await invoiceRef.update({
      status: 'rejected',
      rejectedReason: reason,
      approvedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error rejecting invoice:', error);
    throw error;
  }
});

/**
 * Función auxiliar: Verifica si hay premios automáticos y los asigna
 */
async function checkAndAssignRewards(storeId: string, totalPoints: number): Promise<void> {
  try {
    const db = getDb();
    const storeRef = db.collection('stores').doc(storeId);
    const storeDoc = await storeRef.get();
    const store = storeDoc.data();

    if (!store?.countryId) return;

    // Obtener premios disponibles para este país
    const rewardsQuery = db.collection('rewards')
      .where('countryId', 'in', [null, store.countryId])
      .where('pointsRequired', '<=', totalPoints);

    const rewardsSnapshot = await rewardsQuery.get();

    // Para cada premio que cumpla requisitos, crear un reclamo
    for (const rewardDoc of rewardsSnapshot.docs) {
      const reward = rewardDoc.data();

      // Verificar si el tendero ya reclamó este premio este mes
      const existingClaim = await db.collection('rewardClaims')
        .where('storeId', '==', storeId)
        .where('rewardId', '==', rewardDoc.id)
        .where('status', 'in', ['in_assignment', 'in_transit', 'delivered'])
        .limit(1)
        .get();

      if (existingClaim.empty) {
        // Crear nuevo reclamo
        await db.collection('rewardClaims').add({
          storeId,
          storeName: store.email,
          rewardId: rewardDoc.id,
          rewardName: reward.name,
          countryId: store.countryId,
          pointsDeducted: reward.pointsRequired,
          status: 'in_assignment',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Descontar puntos del tendero
        await storeRef.update({
          pointsTotal: totalPoints - reward.pointsRequired,
          updatedAt: Timestamp.now(),
        });
      }
    }
  } catch (error) {
    console.error('Error checking and assigning rewards:', error);
    // No lanzar error, solo registrar
  }
}

/**
 * Cloud Function: claimReward
 * Trigger: Cuando un tendero reclama un premio
 */
export const claimReward = functions.https.onCall(async (data:any, context:any) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { rewardId } = data;

    const db = getDb();
    // Obtener datos del tendero
    const storeRef = db.collection('stores').doc(context.auth.uid);
    const storeDoc = await storeRef.get();

    if (!storeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Store not found');
    }

    const store = storeDoc.data();

    // Obtener datos del premio
    const rewardRef = db.collection('rewards').doc(rewardId);
    const rewardDoc = await rewardRef.get();

    if (!rewardDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Reward not found');
    }

    const reward = rewardDoc.data();

    // Validar que el tendero tiene suficientes puntos
    if ((store?.pointsTotal || 0) < reward?.pointsRequired) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient points');
    }

    // Crear reclamo de premio
    const claimRef = await db.collection('rewardClaims').add({
      storeId: context.auth.uid,
      storeName: store?.email,
      rewardId,
      rewardName: reward?.name,
      countryId: store?.countryId,
      pointsDeducted: reward?.pointsRequired,
      status: 'in_assignment',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Descontar puntos
    const newPointsTotal = (store?.pointsTotal || 0) - reward?.pointsRequired;
    await storeRef.update({
      pointsTotal: newPointsTotal,
      updatedAt: Timestamp.now(),
    });

    // Crear transacción
    await db.collection('pointTransactions').add({
      storeId: context.auth.uid,
      type: 'reward_redemption',
      pointsChange: -reward?.pointsRequired,
      description: `Reclamo de premio: ${reward?.name}`,
      rewardClaimId: claimRef.id,
      createdAt: Timestamp.now(),
    });

    return {
      success: true,
      claimId: claimRef.id,
      pointsRemaining: newPointsTotal,
    };
  } catch (error) {
    console.error('Error claiming reward:', error);
    throw error;
  }
});

/**
 * Cloud Function: assignCountryAdmin
 * Callable: Desde SuperAdmin Dashboard
 * Responsabilidades:
 * - Asignar una persona como ADMIN_COUNTRY (sin crear contraseña)
 * - La persona debe registrarse ella misma con el email
 * - El sistema valida en el registro que ya es admin
 * - El CORAZÓN DEL SISTEMA - sin esto, no hay tenderos
 */
export const assignCountryAdmin = functions.https.onCall(async (data:any, context:any) => {
  try {
    // Verificar que está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Debe estar autenticado para asignar admins'
      );
    }

    const db = getDb();
    // Verificar que es SUPER_ADMIN consultando Firestore
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'SUPER_ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Solo SUPER_ADMIN puede asignar admins de país'
      );
    }

    const { email, name, phone, countryId } = data;

    // Validar datos
    if (!email || !name || !countryId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Falta email, name o countryId'
      );
    }

    // Verificar que el país existe
    const countryDoc = await db.collection('countries').doc(countryId).get();
    if (!countryDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'El país no existe'
      );
    }

    // Verificar que no existe ya un admin para ese país (ACTIVO, no pendiente)
    const existingAdmin = await db.collection('users')
      .where('role', '==', 'ADMIN_COUNTRY')
      .where('countryId', '==', countryId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existingAdmin.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Este país ya tiene un admin asignado'
      );
    }

    // Verificar que el email no está usado en otro país admin
    const emailExists = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!emailExists.empty) {
      throw new functions.https.HttpsError(
        'already-exists',
        'Este email ya está registrado en el sistema'
      );
    }

    // Crear documento en Firestore con status 'pending_registration'
    // El UID será temporal hasta que la persona se registre
    const tempUID = 'admin_pending_' + countryId + '_' + Date.now();
    
    await db.collection('users').doc(tempUID).set({
      uid: tempUID,
      email,
      name,
      phone: phone || '',
      role: 'ADMIN_COUNTRY',
      countryId,
      status: 'pending_registration', // Estado especial: asignado pero no registrado aún
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ Admin de país asignado: ${email} para país ${countryId} (pendiente de registro)`);

    return {
      success: true,
      email,
      countryId,
      message: `Admin asignado correctamente. Esta persona debe registrarse con el email: ${email}`,
    };
  } catch (error: any) {
    console.error('Error assigning country admin:', error);
    throw error;
  }
});

/**
 * Cloud Function: deleteCountryAdmin
 * Callable: Desde SuperAdmin Dashboard
 * Responsabilidades:
 * - Eliminar admin de país de Firestore
 * - Si está registrado, también eliminar de Firebase Auth
 * - ⚠️ CUIDADO: Los tenderos de ese país quedarán huérfanos
 */
export const deleteCountryAdmin = functions.https.onCall(async (data:any, context:any) => {
  try {
    // Verificar que está autenticado
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Debe estar autenticado para eliminar admins'
      );
    }

    const db = getDb();
    // Verificar que es SUPER_ADMIN consultando Firestore
    const superAdminDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!superAdminDoc.exists || superAdminDoc.data()?.role !== 'SUPER_ADMIN') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Solo SUPER_ADMIN puede eliminar admins de país'
      );
    }

    const { userId } = data;

    if (!userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Falta userId'
      );
    }

    // Obtener el documento del usuario
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Usuario no encontrado'
      );
    }

    const user = userDoc.data();
    if (user?.role !== 'ADMIN_COUNTRY') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Este usuario no es un admin de país'
      );
    }

    // Si está registrado (no es pending), eliminar de Firebase Auth
    if (!userId.startsWith('admin_pending_')) {
      try {
        await admin.auth().deleteUser(userId);
      } catch (authError: any) {
        // Si el usuario no existe en Auth (solo en Firestore), continuar
        console.log(`⚠️ Usuario no encontrado en Firebase Auth: ${userId}`);
      }
    }

    // Eliminar de Firestore
    await db.collection('users').doc(userId).delete();

    console.log(`⚠️ Admin de país eliminado: ${user?.email}`);

    return {
      success: true,
      message: `Admin ${user?.email} eliminado. Los tenderos de su país quedarán sin admin.`,
    };
  } catch (error: any) {
    console.error('Error deleting country admin:', error);
    throw error;
  }
});

/**
 * Cloud Function: registerStore
 * Callable: PÚBLICO (No requiere auth previo)
 * Responsabilidades:
 * - Validar código de tendero (Atomic Transaction)
 * - Validar existencia de Admin de país
 * - Crear usuario en Firebase Auth
 * - Crear documentos en Firestore
 * - Garantizar unicidad de código
 */
export const registerStore = functions.https.onCall(async (data:any) => {
  const { email, password, storeCode, phone, countryId, ownerName } = data;

  // Validaciones básicas
  if (!email || !password || !storeCode || !countryId) {
    throw new functions.https.HttpsError('invalid-argument', 'Faltan datos obligatorios');
  }

  const db = getDb();
  const code = storeCode.toUpperCase();

  try {
    // 1. Verificar Admin de País (Corazón del Sistema)
    const adminQuery = await db.collection('users')
      .where('role', '==', 'ADMIN_COUNTRY')
      .where('countryId', '==', countryId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (adminQuery.empty) {
      throw new functions.https.HttpsError('failed-precondition', 'No hay admin asignado en este país.');
    }

    // A. Pre-verificación: Verificar si el código ya está usado (lectura rápida)
    // Esto evita crear el usuario Auth si el código ya sabemos que está usado.
    const tenderoRefInfo = db.collection('tenderos_validos').doc(code);
    const tenderoSnap = await tenderoRefInfo.get();
    
    if (!tenderoSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'El código de tendero no existe.');
    }
    const tData = tenderoSnap.data();
    if (tData?.utilizado) {
      throw new functions.https.HttpsError('already-exists', 'Este código ya ha sido registrado.');
    }

    // B. Crear usuario Auth FUERA de la transacción
    let userId: string;
    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: ownerName,
        phoneNumber: phone.length > 5 ? phone : undefined
      });
      userId = userRecord.uid;
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
          throw new functions.https.HttpsError('already-exists', 'El email ya está registrado.');
      }
      throw new functions.https.HttpsError('invalid-argument', 'Error al crear usuario: ' + authError.message);
    }

    try {
      // C. Transacción: Asignar código al usuario recién creado
      await db.runTransaction(async (transaction) => {
        const tenderoRef = db.collection('tenderos_validos').doc(code);
        const tenderoDoc = await transaction.get(tenderoRef);

        if (!tenderoDoc.exists) {
           throw new functions.https.HttpsError('not-found', 'El código de tendero no existe.');
        }

        const tenderoData = tenderoDoc.data();
        if (!tenderoData?.activo) {
           throw new functions.https.HttpsError('failed-precondition', 'Código inactivo.');
        }
        
        // Verificación CRÍTICA FINAL dentro de transacción
        if (tenderoData?.utilizado) {
           throw new functions.https.HttpsError('already-exists', 'Este código ya ha sido registrado.');
        }

        // Preparar escrituras
        // 1. Marcar código
        transaction.update(tenderoRef, {
          utilizado: true,
          registeredStoreId: userId,
          registeredAt: new Date()
        });

        // 2. Crear User Doc
        const userRef = db.collection('users').doc(userId);
        transaction.set(userRef, {
          uid: userId,
          email,
          phone,
          name: ownerName,
          role: 'STORE',
          storeId: userId,
          storeCode: code,
          countryId,
          city: tenderoData.ciudad || '',
          distributorId: tenderoData.distribuidorId || '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // 3. Crear Store Doc
        const storeRef = db.collection('stores').doc(userId);
        transaction.set(storeRef, {
          id: userId,
          storeCode: code,
          countryId,
          city: tenderoData.ciudad || '',
          regionId: tenderoData.ciudad || '',
          distributorId: tenderoData.distribuidorId || '',
          name: ownerName,
          ownerName,
          phone,
          address: '',
          level: 'bronze',
          pointsTotal: 0,
          pointsMonth: 0,
          monthStart: new Date(),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }); // Fin transacción

      console.log(`✅ Tienda registrada exitosamente: ${email} (${code})`);
      return { success: true, userId };

    } catch (transactionError) {
      // ⚠️ Si falla la transacción (ej: código usado por otro en el intermedio),
      // debemos ELIMINAR el usuario Auth creado para no dejar basura.
      console.warn(`⚠️ Transacción fallida, eliminando usuario Auth creado: ${userId}`, transactionError);
      try {
        await admin.auth().deleteUser(userId);
        console.log(`🗑️ Usuario Auth eliminado correctamente: ${userId}`);
      } catch (cleanupError) {
        console.error(`❌ ERROR CRÍTICO: No se pudo eliminar usuario Auth tras fallo: ${userId}`, cleanupError);
      }
      
      throw transactionError; // Re-lanzar error original al cliente
    }

  } catch (error: any) {
    console.error('Error in registerStore:', error);
    throw error;
  }
});

// ------------------------------------------------------------------
// TRIGGERS: SINCRONIZACIÓN Y LIMPIEZA
// ------------------------------------------------------------------

/**
 * Trigger: onPointTransactionDeleted
 * Si se elimina una transacción de puntos (manual o automáticamente), 
 * actualizar el saldo de la tienda restando el valor eliminado.
 */
export const onPointTransactionDeleted = functions.firestore
  .document('pointTransactions/{transactionId}')
  .onDelete(async (snap) => {
    const data = snap.data();
    if (!data) return;

    const { storeId, pointsChange } = data;
    // Validar que hay storeId y que pointsChange es un número
    if (!storeId || typeof pointsChange !== 'number') return;

    console.log(`♻️ Detectada eliminación de tx ${snap.id}. Reajustando ${pointsChange} puntos a tienda ${storeId}...`);

    const db = getDb(); // Usar helper getDb()
    const storeRef = db.collection('stores').doc(storeId);

    try {
      await db.runTransaction(async (t) => {
        const storeDoc = await t.get(storeRef);
        if (!storeDoc.exists) return;

        const currentTotal = storeDoc.data()?.pointsTotal || 0;
        const currentMonth = storeDoc.data()?.pointsMonth || 0;

        // Revertir los puntos
        // - Si added 100 puntos (pointsChange=100), restamos 100.
        // - Math.max(0, ...) para evitar negativos si hubo reseteo parcial
        t.update(storeRef, {
          pointsTotal: currentTotal - pointsChange,
          pointsMonth: currentMonth - pointsChange, 
          updatedAt: new Date()
        });
      });
      console.log(`✅ Puntos revertidos exitosamente.`);
    } catch (error) {
      console.error('❌ Error al revertir puntos en trigger:', error);
    }
  });

/**
 * Trigger: onInvoiceDeleted
 * Si se elimina una factura, buscar y eliminar su transacción de puntos asociada.
 * Al eliminar la transacción, se disparará onPointTransactionDeleted para ajustar el saldo automáticamente.
 */
export const onInvoiceDeleted = functions.firestore
  .document('invoices/{invoiceId}')
  .onDelete(async (snap) => {
    const invoiceId = snap.id;
    console.log(`🗑️ Factura eliminada: ${invoiceId}. Buscando transacciones huérfanas...`);
    
    const db = getDb();

    try {
      const txSnapshot = await db.collection('pointTransactions')
        .where('invoiceId', '==', invoiceId)
        .get();

      if (txSnapshot.empty) {
        console.log(`ℹ️ No se encontraron transacciones para la factura ${invoiceId}.`);
        return;
      }

      const batch = db.batch();
      txSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(`✅ ${txSnapshot.size} transacciones eliminadas. Esto disparará reajuste de saldos.`);
    } catch (error) {
      console.error('❌ Error al limpiar relaciones de factura:', error);
    }
  });
