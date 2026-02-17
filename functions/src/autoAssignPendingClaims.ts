import { getDb } from './index';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Script/Function: autoAssignPendingClaims
 * Busca reclamos 'pending' y los asigna a distribuidor si hay stock disponible.
 * Actualiza el estado a 'in_assignment', descuenta stock y marca como reservado.
 */
export async function autoAssignPendingClaims() {
  const db = getDb();
  const pendingClaimsSnap = await db.collection('rewardClaims')
    .where('status', '==', 'pending')
    .get();

  if (pendingClaimsSnap.empty) {
    console.log('No hay reclamos pendientes.');
    return;
  }

  let assignedCount = 0;

  for (const claimDoc of pendingClaimsSnap.docs) {
    const claim = claimDoc.data();
    const { distributorId, rewardId } = claim;
    if (!distributorId || !rewardId) continue;

    // Buscar stock del distribuidor para ese reward
    const stockSnap = await db.collection('distributorRewardStock')
      .where('distributorId', '==', distributorId)
      .where('rewardId', '==', rewardId)
      .limit(1)
      .get();
    if (stockSnap.empty) continue;
    const stockDoc = stockSnap.docs[0];
    const stock = stockDoc.data();
    const available = (stock.quantity || 0) - (stock.reserved || 0);
    if (available <= 0) continue;

    // Asignar reclamo y reservar stock
    await db.runTransaction(async (t) => {
      const freshStockDoc = await t.get(stockDoc.ref);
      const freshStock = freshStockDoc.data();
      if (!freshStock) return;
      const freshAvailable = (freshStock.quantity || 0) - (freshStock.reserved || 0);
      if (freshAvailable <= 0) return;
      t.update(claimDoc.ref, {
        status: 'in_assignment',
        assignedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      t.update(stockDoc.ref, {
        reserved: (freshStock.reserved || 0) + 1,
        updatedAt: Timestamp.now(),
      });
    });
    assignedCount++;
  }
  console.log(`Reclamos asignados: ${assignedCount}`);
}
