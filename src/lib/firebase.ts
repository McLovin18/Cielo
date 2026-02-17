import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Reemplaza con tus credenciales de Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Conectar a emuladores si estamos en desarrollo local
if (process.env.NODE_ENV === 'development') {
    // Nota: 'localhost' funciona en la mayoría de entornos. 
    // Si usas contenedores o WSL, a veces se requiere '127.0.0.1'
    
    // Descomenta las líneas siguientes para activar los emuladores:
    // connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    // connectFirestoreEmulator(db, '127.0.0.1', 8080);
    // connectStorageEmulator(storage, '127.0.0.1', 9199);
    
    // SOLO Functions Emulator (el resto conectará a Producción)
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
    console.log('🔧 Conectado a Firebase Functions Emulator (Auth/Firestore/Storage en Producción)');
}

export default app;
