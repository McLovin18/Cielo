
const admin = require('firebase-admin');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-service-account.json'); // Asegúrate de tener este archivo o usa credenciales por defecto

// Inicializar app si no existe
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = getFirestore();

async function seedRewards() {
  console.log('🌱 Iniciando carga de premios de prueba...');

  try {
    // 1. Crear Premios Globales
    const globalRewards = [
      {
        id: 'global_rwd_001',
        name: 'Pack Agua Cielo 600ml x 12',
        description: 'Pack de 12 botellas de agua purificada Cielo.',
        imageUrl: 'https://placehold.co/400x300?text=Agua+Cielo+Pack',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        id: 'global_rwd_002',
        name: 'Nevera Exhibidora Pequeña',
        description: 'Nevera vertical para exhibición de productos, 1 puerta.',
        imageUrl: 'https://placehold.co/400x300?text=Nevera+Cielo',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        id: 'global_rwd_003',
        name: 'Kit Publicitario Básico',
        description: 'Incluye afiche, cenal para estantería y rompetráfico.',
        imageUrl: 'https://placehold.co/400x300?text=Kit+Merch',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    for (const reward of globalRewards) {
      await db.collection('globalRewards').doc(reward.id).set(reward);
      console.log(`✅ Global Reward creado: ${reward.name}`);
    }

    // 2. Crear Premios por País (Ejemplo: Colombia 'CO')
    // Asignamos puntos específicos para este mercado
    const countryRewardsCO = [
      {
        globalRewardId: 'global_rwd_001',
        countryId: 'CO',
        name: 'Pack Agua Cielo 600ml x 12 (CO)',
        description: 'Pack de 12 botellas de agua purificada Cielo.',
        pointsRequired: 500, // 500 puntos
        imageUrl: 'https://placehold.co/400x300?text=Agua+Cielo+Pack',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        globalRewardId: 'global_rwd_002',
        countryId: 'CO',
        name: 'Nevera Exhibidora Branding Cielo (CO)',
        description: 'Nevera vertical oficial de la marca. Capacidad 100L.',
        pointsRequired: 15000, // 15,000 puntos
        imageUrl: 'https://placehold.co/400x300?text=Nevera+Cielo',
        status: 'active',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        // Premio exclusivo local que no tiene global padre (opcional)
        globalRewardId: null, 
        countryId: 'CO',
        name: 'Entrada Partido Selección Colombia',
        description: 'Entrada regular para el próximo partido de eliminatorias.',
        pointsRequired: 5000,
        imageUrl: 'https://placehold.co/400x300?text=Entrada+Futbol',
        status: 'active', // 'active'
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];

    for (const reward of countryRewardsCO) {
      // Dejamos que Firestore genere el ID, o usamos uno determinista si queremos
      const docRef = await db.collection('countryRewards').add(reward);
      console.log(`✅ Country Reward (CO) creado: ${reward.name} (ID: ${docRef.id})`);
    }

    console.log('🎉 Carga de premios completada exitosamente.');

  } catch (error) {
    console.error('❌ Error cargando premios:', error);
  }
}

seedRewards();
