# BACKUP - FIRESTORE RULES HISTÓRICAS

⚠️ **ARCHIVO DESACTUALIZADO**

Las reglas completas y definitivas están en: **`firestore.rules`**

Este archivo es solo para referencia histórica de la arquitectura anterior.

## Cambios Realizados

### Versión Final (Actual)
- ✅ Todos los usuarios creados por load/script
- ✅ SUPER_ADMIN puesto manualmente
- ✅ ADMIN_COUNTRY crea distribuidores desde su panel
- ✅ Reglas COMPLETAS SOLO en `firestore.rules`
- ✅ NO repetidas en markdown

### Estructura Jerárquica (Antigua)
```
Super Admin (hectorcobea03@gmail.com)
├── Distributors (DIST-ECU-01, DIST-MEX-02, etc.)
│   └── Stores/Tenderos (ECU-TEN-0001, MEX-TEN-0005, etc.)
└── Platform Data (tenderos_validos, ocrTrainingData, etc.)
```

### Nueva Estructura
```
SUPER_ADMIN
├── ADMIN_COUNTRY (por país)
│   ├── Crea distribuidores desde panel
│   └── DISTRIBUTOR
│       └── STORE
└── Platform Data
```

---

**USAR: `firestore.rules` PARA LAS REGLAS COMPLETAS**
