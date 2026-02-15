# 🏆 Estrategia y Arquitectura: Sistema de Fidelización y Recompensas (Cielo Promo)

## 1. 🎯 Objetivo Central
**"Incentivar la compra recurrente transformando facturas en beneficios tangibles, entregados por su distribuidor de confianza."**

El ciclo de valor es: `Compra` ➡️ `Sube Factura` ➡️ `Gana Puntos` ➡️ `Canjea Premio` ➡️ `Recibe en Próximo Pedido`.

---

## 2. 🏗️ Estructura de Datos (Firestore)

Para soportar este flujo, necesitamos expandir la base de datos con estas colecciones:

### A. Catálogo de Recompensas (`/rewards`)
Gestionado por `ADMIN_COUNTRY` (o `SUPER_ADMIN` para globales).
```typescript
interface Reward {
  id: string;
  name: string;             // Ej: "Pack 12 Botellas Gratis"
  description: string;
  pointsCost: number;       // Ej: 500 puntos
  imageUrl: string;
  countryId: string;        // Disponible solo para este país
  stock: number;            // Control de inventario general
  validUntil: Date;         // Vencimiento de la promo
  active: boolean;
}
```

### B. Solicitudes de Canje (`/redemptions`)
El nexo entre el deseo del tendero y la acción del distribuidor.
```typescript
interface Redemption {
  id: string;
  storeId: string;          // ¿Quién reclamó?
  rewardId: string;         // ¿Qué reclamó?
  distributorId: string;    // 🔑 CLAVE: ¿Quién debe entregarlo?
  
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  
  pointsSpent: number;      // Puntos gastados en ese momento
  createdAt: Date;
  deliveredAt?: Date;
  
  // Evidencia de entrega
  deliveryProof?: string;   // URL foto o firma
}
```

---

## 3. 🤝 El Rol del Distribuidor
El distribuidor no es solo un repartidor, es el **Facilitador del Éxito**.
En el sistema actual, cada `Store` (Tendero) tiene un campo `distributorId` en su perfil (`users/{uid}`).

**Flujo de Conexión:**
1.  **Validación de Origen:** El sistema sabe quién atiende al tendero (`store.distributorId`).
2.  **Canje Inteligente:** Al momento de solicitar un premio, el sistema crea el documento `redemption` y copia automáticamente el `distributorId` del perfil del tendero.
3.  **Visibilidad:** El Distribuidor ve en su panel (`/distributor/deliveries`) solo las `redimciones` donde `distributorId == auth.uid`.

---

## 4. 🚀 Lógica de Incentivo (Gamificación)

Para que el tendero compre más, el sistema debe ser proactivo, no pasivo.

### Niveles de Lealtad (Tier System)
Calculado dinámicamente basado en puntos acumulados en el último mes.
*   🥉 **Bronce:** 1x Puntos.
*   🥈 **Plata:** 1.2x Puntos (Requiere compras > $X).
*   🥇 **Oro:** 1.5x Puntos + Acceso a recompensas "Premium" (Requiere compras > $Y).

Esto fuerza al tendero a mantener un volumen de compra alto para no perder su status "Oro".

---

## 5. 🗺️ Roadmap de Implementación

### Fase 1: El Ciclo Básico (MVP)
1.  **Admin:** Interfaz para CRUD de `/rewards`.
2.  **Store:**
    *   Ver "Mis Puntos" (Header/Dashboard).
    *   Catálogo de premios (`/store/rewards`).
    *   Botón "Canjear" (Crea doc en `/redemptions`).
3.  **Distributor:**
    *   Lista de entregas pendientes (`/distributor/deliveries`).
    *   Botón "Marcar Entregado" (Actualiza status a `DELIVERED`).

### Fase 2: Validación y Seguridad
*   Cloud Function (`onRedemptionCreate`):
    *   Verificar que el usuario tenga puntos suficientes.
    *   Restar puntos atómicamente (Transaction).
    *   Enviar notificación Push al Distribuidor.

### Fase 3: Logística Avanzada
*   Si el tendero NO tiene `distributorId`, el sistema asigna una tarea a un `ADMIN_COUNTRY` para asignar uno manual, o usa Geo-location para sugerir el más cercano.

---

## 6. 🔌 Integración Técnica (Resumen)

*   **Frontend (Store):** `src/app/store/rewards/page.tsx` para el catálogo.
*   **Frontend (Distributor):** `src/app/distributor/deliveries/page.tsx` para logística.
*   **Backend (Rules):** Asegurar que un distribuidor solo pueda editar `redemptions` asignadas a él.
