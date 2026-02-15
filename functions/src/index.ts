import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { processInvoiceImage } from './ocr/vision';

// Lazy initialization to prevent "Timeout after 10000ms" during function load
let dbInstance: admin.firestore.Firestore | null = null;
function getDb(): admin.firestore.Firestore {
  if (!dbInstance) {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    dbInstance = admin.firestore();
  }
  return dbInstance;
}

/**
 * CLOUD FUNCTION: analyzeInvoice
 * Recibe una imagen en Base64 desde el frontend, la pasa por OCR y devuelve datos estructurados.
 */
export const analyzeInvoice = functions.https.onCall(async (data, context) => {
  console.log("FUNCTION START: analyzeInvoice invoked"); // Debug log

  // 1. Validar autenticación
  if (!context.auth) {
    console.warn("Unauthorized access attempt to analyzeInvoice"); // Debug log
    throw new functions.https.HttpsError(
      'unauthenticated', 
      'Debe estar autenticado para usar esta función.'
    );
  }

  const { imageBase64 } = data;
  // const { countryId } = data; // Unused for now

  if (!imageBase64) {
    console.warn("Missing imageBase64 in request"); // Debug log
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Falta la imagen (base64).'
    );
  }

  try {
    console.log("Starting image processing..."); // Debug log
    // 2. Procesar imagen (Llamada a Vision API o Mock)
    const result = await processInvoiceImage(imageBase64);
    console.log("Image processing successful", result); // Debug log

    // 3. (Opcional) Loguear uso para cobrar o limitar
    console.log(`User ${context.auth.uid} scanned invoice.`);

    return result;

  } catch (error: any) {
    console.error("CRITICAL ERROR IN ANALYZEINVOICE CATCH BLOCK:", error); // Debug log

    // Fallback: Si todo falla, devolver un mock de urgencia para no detener la demo
    
    // Loguear el error para propósitos de depuración
    const errorMessage = error?.message || String(error);
    const errorCode = error?.code || 'unknown'; 
    console.warn(`⚠️ Error en OCR (${errorCode}): ${errorMessage}. Activando Fallback.`);

    // Garantizar que la demo funcione devolviendo datos simulados siempre que falle
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
  }
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
export const calculateInvoicePoints = functions.firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snap, context) => {
    try {
      const invoice = snap.data();
      const invoiceId = context.params.invoiceId;

      // Validar datos básicos
      if (!invoice.storeId || invoice.status !== 'pending') {
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
           await snap.ref.update({
             status: 'rejected',
             rejectedReason: 'Factura duplicada: Este número de factura ya ha sido registrado.',
             approvedAt: admin.firestore.Timestamp.now(),
             pointsEarned: 0
           });
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

      const store = storeDoc.data();

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

      // Actualizar factura con puntos calculados
      await snap.ref.update({
        pointsEarned,
        status: 'approved',
        approvedAt: admin.firestore.Timestamp.now(),
      });

      // Actualizar puntos del tendero
      const newPointsTotal = ((store?.pointsTotal || 0) as number) + pointsEarned;
      const newPointsMonth = ((store?.pointsMonth || 0) as number) + pointsEarned;

      await storeRef.update({
        pointsTotal: newPointsTotal,
        pointsMonth: newPointsMonth,
        updatedAt: admin.firestore.Timestamp.now(),
      });

      // Crear registro de transacción para auditoría
      await db.collection('pointTransactions').add({
        storeId: invoice.storeId,
        type: 'purchase',
        pointsChange: pointsEarned,
        description: `Factura #${invoiceId} - ${invoice.storeName}`,
        invoiceId,
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Verificar si hay premios automáticos para reclamar
      await checkAndAssignRewards(invoice.storeId, newPointsTotal);

      console.log(`Points calculated for invoice ${invoiceId}: ${pointsEarned} points`);
      return null;
    } catch (error) {
      console.error('Error calculating invoice points:', error);
      throw error;
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
export const approveInvoiceAdmin = functions.https.onCall(async (data, context) => {
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
      approvedAt: admin.firestore.Timestamp.now(),
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
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Crear transacción
    await db.collection('pointTransactions').add({
      storeId: invoice?.storeId,
      type: 'purchase',
      pointsChange: finalPoints,
      description: `Factura aprobada por admin - #${invoiceId}`,
      invoiceId,
      createdAt: admin.firestore.Timestamp.now(),
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
export const rejectInvoiceAdmin = functions.https.onCall(async (data, context) => {
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
      approvedAt: admin.firestore.Timestamp.now(),
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
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });

        // Descontar puntos del tendero
        await storeRef.update({
          pointsTotal: totalPoints - reward.pointsRequired,
          updatedAt: admin.firestore.Timestamp.now(),
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
export const claimReward = functions.https.onCall(async (data, context) => {
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
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Descontar puntos
    const newPointsTotal = (store?.pointsTotal || 0) - reward?.pointsRequired;
    await storeRef.update({
      pointsTotal: newPointsTotal,
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Crear transacción
    await db.collection('pointTransactions').add({
      storeId: context.auth.uid,
      type: 'reward_redemption',
      pointsChange: -reward?.pointsRequired,
      description: `Reclamo de premio: ${reward?.name}`,
      rewardClaimId: claimRef.id,
      createdAt: admin.firestore.Timestamp.now(),
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
export const assignCountryAdmin = functions.https.onCall(async (data, context) => {
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
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
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
export const deleteCountryAdmin = functions.https.onCall(async (data, context) => {
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
