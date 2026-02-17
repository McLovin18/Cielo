import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, db, functions } from '@/lib/firebase';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { User, Store, Distributor, ValidStore } from '@/types';

export const authService = {
  // ===== HELPER: Verificar si existe admin en un país =====
  // El admin es el CORAZÓN: sin admin, no hay tenderos ni distribuidores
  async hasCountryAdmin(countryId: string): Promise<boolean> {
    try {
      console.log(`🔍 Buscando admin activo para país: ${countryId}`);
      // Buscar admin ACTIVO (no pendiente) para el país
      const adminQuery = query(
        collection(db, 'users'),
        where('role', '==', 'ADMIN_COUNTRY'),
        where('countryId', '==', countryId),
        where('status', '==', 'active')  // Solo admins activos, no pendientes
      );
      const snapshot = await getDocs(adminQuery);
      console.log(`📊 Query result: ${snapshot.docs.length} admins encontrados`);
      if (!snapshot.empty) {
        snapshot.docs.forEach((doc, idx) => {
          console.log(`  [${idx}] Admin: ${doc.data().email}, status: ${doc.data().status}, role: ${doc.data().role}`);
        });
      }
      return !snapshot.empty;
    } catch (error) {
      console.error('❌ Error checking country admin:', error);
      return false;
    }
  },

  // ===== REGISTRAR TENDERO =====
  async registerStore(
    email: string,
    password: string,
    storeCode: string,
    phone: string,
    countryId: string,
    ownerName: string,
    distribuidorId?: string
  ): Promise<{ userId: string; storeId: string }> {
    try {
      console.log(`📝 Calling Backend: registerStore function`);
      
      const registerFn = httpsCallable(functions, 'registerStore');
      const result: any = await registerFn({
        email,
        password,
        storeCode, // Enviaremos el código para que el backend lo valide y marque
        phone,
        countryId,
        ownerName,
        distribuidorId
      });
      
      const userId = result.data.userId;
      console.log(`✅ Backend registration success. UserID: ${userId}`);

      // Auto-Sign In después del registro exitoso
      await signInWithEmailAndPassword(auth, email, password);
      console.log(`✅ Auto-login success`);
      
      return { userId, storeId: userId };
    } catch (error: any) {
      console.error('❌ Error al registrar tendero (Backend):', error.message || error);
      
      // Mapeo básico de errores backend a mensajes amigables
      const msg = error.message || '';
      const code = error.code || '';

      // Si el código existe, el backend envía "already-exists"
      if (code === 'already-exists' || msg.includes('already-exists') || msg.includes('ya ha sido registrado')) {
         throw new Error('Este código de tienda ya ha sido registrado por otro usuario.');
      }

      if (msg.includes('email-already-exists') || msg.includes('El email ya está registrado')) {
        throw new Error('Este email ya está registrado en el sistema.');
      }
      
      if (msg.includes('not-found') || msg.includes('no existe')) {
        throw new Error('El código de tienda no es válido.');
      }
      
      if (msg.includes('failed-precondition') || msg.includes('inactivo')) {
        throw new Error('El código de tienda está inactivo o no hay administrador en el país.');
      }

      if (msg === 'INTERNAL') {
        throw new Error('Error interno del servidor. Por favor verifica que el código y tus datos sean correctos e intenta de nuevo.');
      }
      
      throw error;
    }
  },


  // ===== REGISTRAR USUARIO SIN CÓDIGO (ADMIN/DISTRIBUIDOR) =====
  async registerUserWithoutCode(
    email: string,
    password: string,
    phone: string,
    countryId: string,
    name: string
  ): Promise<{ userId: string }> {
    try {
      console.log(`📝 Registrando usuario sin código de tendero...`);

      // PASO 0: Verificar si este email ya está asignado como admin de país
      console.log(`🔍 Verificando si el email es admin de país...`);
      const adminQuery = query(
        collection(db, 'users'),
        where('email', '==', email),
        where('role', '==', 'ADMIN_COUNTRY')
      );
      const adminSnapshot = await getDocs(adminQuery);

      let assignedAsAdminCountryId: string | null = null;
      let adminDocId: string | null = null;
      
      if (!adminSnapshot.empty) {
        const adminDoc = adminSnapshot.docs[0];
        const adminData = adminDoc.data();
        assignedAsAdminCountryId = adminData.countryId;
        adminDocId = adminDoc.id;
        console.log(`✅ Email asignado como admin para país: ${assignedAsAdminCountryId}`);
      } else {
        // Si NO es admin, validar que existe admin en el país (para tenderos/distribuidores)
        // El admin es el CORAZÓN: sin admin, no hay tenderos ni distribuidores
        console.log(`❤️  Verificando si existe admin en el país: ${countryId}`);
        const hasAdmin = await this.hasCountryAdmin(countryId);
        
        if (!hasAdmin) {
          const error = new Error(
            `No hay admin asignado en este país. Solicita al SuperAdmin que designe un administrador.`
          );
          (error as any).code = 'NO_ADMIN_IN_COUNTRY';
          throw error;
        }
        console.log(`✅ Admin verificado para el país: ${countryId}`);
      }

      // PASO 1: Crear cuenta Firebase Auth
      console.log(`🔐 Creando cuenta Firebase...`);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      console.log(`✅ Cuenta Firebase creada: ${userId}`);

      // PASO 2: Establecer persistencia
      await setPersistence(auth, browserLocalPersistence);
      console.log(`✅ Persistencia establecida`);

      // PASO 3: Crear documento de usuario
      console.log(`📋 Creando documento de usuario...`);
      let userRole: 'STORE' | 'ADMIN_COUNTRY' | 'DISTRIBUTOR' = 'STORE';
      let userCountryId = countryId;
      let existingUserData: any = null;

      // Verificar si el email ya existe en users (búsqueda por email)
      // Importante: Buscar por query, no por ID
      console.log(`🔍 Verificando si el email ya existe en users...`);
      try {
        const existingQuery = query(
          collection(db, 'users'),
          where('email', '==', email)
        );
        const existingDocs = await getDocs(existingQuery);
        if (!existingDocs.empty) {
          // Si existe, NO permitir duplicado
          throw new Error(
            `El correo ${email} ya está registrado en el sistema. Por favor usa otro correo o contacta a soporte.`
          );
        }
      } catch (error: any) {
        // Si es nuestro error de duplicado, lanzar
        if (error.message.includes('ya está registrado')) {
          throw error;
        }
        // Otros errores no son críticos en validación
        console.warn(`⚠️ No se pudo validar duplicado de email: ${error.message}`);
      }

      // Si fue asignado como admin de país, usar ese rol
      if (assignedAsAdminCountryId && adminDocId) {
        userRole = 'ADMIN_COUNTRY';
        userCountryId = assignedAsAdminCountryId;
        console.log(`✅ Usuario será admin de país: ${userCountryId}`);
      }

      const userData: User = {
        uid: userId,
        email: email,
        name: name,
        phone: phone,
        countryId: userCountryId,
        role: userRole,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Usuario nuevo: guardar con UID como ID (SIEMPRE)
      // No usar email como ID para evitar duplicados
      await setDoc(doc(db, 'users', userId), userData);
      console.log(`✅ Usuario creado en colección /users con rol: ${userRole}`);

      // PASO 4: Si fue asignado como admin, actualizar el documento admin_pending
      if (adminDocId && userRole === 'ADMIN_COUNTRY') {
        console.log(`🔄 Actualizando documento admin pendiente...`);
        await updateDoc(doc(db, 'users', adminDocId), {
          uid: userId, // Reemplazar UID temporal con el real
          status: 'active',
          updatedAt: Timestamp.now(),
        });
        console.log(`✅ Admin de país activado`);
      }

      console.log(`✅ ¡Usuario registrado exitosamente!`);
      return { userId };
    } catch (error: any) {
      console.error('❌ Error al registrar usuario:', error.message || error);

      // Limpiar error genérico de Firebase
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este email ya está registrado en el sistema.');
      }
      if (error.code === 'auth/weak-password') {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error('El email no es válido.');
      }

      throw error;
    }
  },
  async registerCountryAdmin(
    email: string,
    password: string,
    name: string,
    phone: string,
    countryId: string
  ): Promise<{ userId: string }> {
    try {
      // Crear cuenta
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      const userData: User = {
        uid: userId,
        email: email,
        phone: phone,
        name: name,
        role: 'ADMIN_COUNTRY',
        countryId: countryId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'users', userId), userData);

      console.log(`✅ Admin de país creado: ${name} (${countryId})`);
      return { userId };
    } catch (error) {
      console.error('❌ Error al registrar admin de país:', error);
      throw error;
    }
  },

  // ===== REGISTRAR DISTRIBUIDOR =====
  async registerDistributor(
    email: string,
    password: string,
    name: string,
    phone: string,
    countryId: string,
    cities: string[],
    distributorId?: string
  ): Promise<{ userId: string; distributorId: string }> {
    try {
      // Crear cuenta
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      // Usar distributorId proporcionado o generar uno
      const finalDistributorId = distributorId || userId;

      // Crear usuario
      const userData: User = {
        uid: userId,
        email: email,
        phone: phone,
        name: name,
        role: 'DISTRIBUTOR',
        countryId: countryId,
        distributorId: finalDistributorId,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'users', userId), userData);

      // Crear distribuidor
      const distributorData: Distributor = {
        id: userId,
        distributorId: finalDistributorId,
        countryId: countryId,
        name: name,
        email: email,
        phone: phone,
        cities: cities,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'distributors', userId), distributorData);

      console.log(`✅ Distribuidor creado: ${name}`);
      return { userId, distributorId: finalDistributorId };
    } catch (error) {
      console.error('❌ Error al registrar distribuidor:', error);
      throw error;
    }
  },

  // ===== LOGIN =====
  async login(email: string, password: string): Promise<{ userId: string }> {
    try {
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`✅ Usuario iniciado: ${email}`);
      return { userId: userCredential.user.uid };
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      throw error;
    }
  },

  // ===== LOGOUT =====
  async logout(): Promise<void> {
    try {
      await signOut(auth);
      console.log('✅ Usuario desconectado');
    } catch (error) {
      console.error('❌ Error al desconectar:', error);
      throw error;
    }
  },

  // ===== OBTENER USUARIO =====
  async getUser(uid: string): Promise<User | null> {
    try {
      let docSnap = await getDoc(doc(db, 'users', uid));
      
      // Si no encuentra por UID, intentar por email (para distribuidores)
      if (!docSnap.exists()) {
        console.log(`⚠️ Usuario no encontrado por UID: ${uid}`);
        // No podemos buscar por email sin el email, así que solo retornamos null
      }
      
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (error) {
      console.error('❌ Error al obtener usuario:', error);
      throw error;
    }
  },

  // ===== OBTENER USUARIO POR EMAIL =====
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const snapshot = await getDocs(usersQuery);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].data() as User;
      }
      return null;
    } catch (error) {
      console.error('❌ Error al obtener usuario por email:', error);
      throw error;
    }
  },

  // ===== VALIDAR CÓDIGO DE TENDERO =====
  async validateStoreCode(storeCode: string): Promise<{
    valid: boolean;
    message: string;
    country?: string;
    city?: string;
  }> {
    try {
      const tenderoRef = doc(db, 'tenderos_validos', storeCode.toUpperCase());
      const tenderoSnap = await getDoc(tenderoRef);

      if (!tenderoSnap.exists()) {
        return {
          valid: false,
          message: 'Código no válido',
        };
      }

      const tenderoData = tenderoSnap.data() as ValidStore & {
        utilizado: boolean;
      };

      if (!tenderoData.activo) {
        return {
          valid: false,
          message: 'Código inactivo',
        };
      }

      if (tenderoData.utilizado) {
        return {
          valid: false,
          message: 'Código ya registrado',
        };
      }

      return {
        valid: true,
        message: 'Código válido',
        country: tenderoData.pais,
        city: tenderoData.ciudad,
      };
    } catch (error) {
      console.error('❌ Error validando código:', error);
      return {
        valid: false,
        message: 'Error al validar código',
      };
    }
  },

  // ===== ASIGNAR ROL A USUARIO =====
  async assignUserRole(userId: string, role: 'SUPER_ADMIN' | 'ADMIN_COUNTRY' | 'DISTRIBUTOR' | 'STORE'): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role });
      console.log(`✅ Rol "${role}" asignado a usuario ${userId}`);
    } catch (error) {
      console.error('❌ Error al asignar rol:', error);
      throw error;
    }
  },

  // ===== VERIFICAR SI ES SUPER ADMIN =====
  // El super admin se verifica por email en las Firestore Rules
  // No se usa colección, solo validación por email: hectorcobea03@gmail.com

  // ===== VERIFICAR USUARIO ACTUAL =====
  async getCurrentUserRole(): Promise<string | null> {
    try {
      if (!auth.currentUser) return null;
      
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data().role || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo rol:', error);
      return null;
    }
  },

  // ===== OBTENER DATOS DE TENDERO =====
  async getStoreData(storeId: string): Promise<Store | null> {
    try {
      const storeRef = doc(db, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      
      if (storeSnap.exists()) {
        return { id: storeSnap.id, ...storeSnap.data() } as Store;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo datos de tienda:', error);
      return null;
    }
  },

  // ===== CAMBIAR DISTRIBUIDOR =====
  async changeDistributor(
    storeUserId: string,
    newDistributorId: string
  ): Promise<boolean> {
    try {
      // Actualizar en colección /users
      const userRef = doc(db, 'users', storeUserId);
      await updateDoc(userRef, {
        distributorId: newDistributorId,
        updatedAt: new Date(),
      });
      console.log(`✅ Distribuidor actualizado en /users`);

      // Actualizar en colección /stores (usando el mismo ID)
      const storeRef = doc(db, 'stores', storeUserId);
      await updateDoc(storeRef, {
        distributorId: newDistributorId,
        updatedAt: new Date(),
      });
      console.log(`✅ Distribuidor actualizado en /stores`);

      console.log(`✅ Distribuidor cambiado a: ${newDistributorId}`);
      return true;
    } catch (error) {
      console.error('❌ Error al cambiar distribuidor:', error);
      throw error;
    }
  },
};

