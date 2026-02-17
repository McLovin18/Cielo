import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getDb } from './index';
import { FieldValue } from 'firebase-admin/firestore';

// Trigger: Al actualizar un rewardClaim a 'assigned', 'in_transit' o 'delivered', descuenta stock del distribuidor
export const onRewardClaimStatusUpdate = onDocumentUpdated('rewardClaims/{claimId}', async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    // Solo actuar si el status cambió a 'delivered' y antes no era 'delivered'
    if (!before || !after) return;
    if (before.status === after.status) return;
    if (after.status !== 'delivered') return;
    if (before.status === 'delivered') return;

    const distributorId = after.distributorId;
    const rewardId = after.rewardId;
    const countryId = after.countryId;
    if (!distributorId || !rewardId || !countryId) return;

    const db = getDb();
    // Buscar el stock del distribuidor para ese premio
    const stockSnap = await db.collection('distributorRewardStock')
      .where('distributorId', '==', distributorId)
      .where('rewardId', '==', rewardId)
      .where('countryId', '==', countryId)
      .limit(1)
      .get();
    if (stockSnap.empty) {
      console.warn(`[onRewardClaimStatusUpdate] No stock found for distributor ${distributorId}, reward ${rewardId}`);
      return;
    }
    const stockRef = stockSnap.docs[0].ref;
    // Descontar 1 del stock (quantity) y sumar 1 a reserved
    await stockRef.update({
      quantity: FieldValue.increment(-1),
      reserved: FieldValue.increment(1),
      updatedAt: new Date(),
    });
    console.log(`[onRewardClaimStatusUpdate] Stock updated for distributor ${distributorId}, reward ${rewardId}`);
  });
