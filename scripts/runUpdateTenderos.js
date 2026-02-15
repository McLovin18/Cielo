#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

/**
 * Script auxiliar para ejecutar updateTenderosValidos.js con detección automática de credenciales
 * Uso: node scripts/runUpdateTenderos.js
 */

console.log('🔍 Detectando credenciales de Firebase...\n');

// Verificar si firebase-admin está instalado
try {
  require.resolve('firebase-admin');
} catch (error) {
  console.error('❌ firebase-admin no está instalado');
  console.log('\nInstala las dependencias:');
  console.log('  npm install\n');
  process.exit(1);
}

// Opción 1: Usar Firebase CLI (si está autenticado)
const firebaseRc = path.join(process.cwd(), '.firebaserc');
if (fs.existsSync(firebaseRc)) {
  console.log('✅ Detectado: Proyecto Firebase CLI');
  console.log('   Usando credenciales de Firebase CLI\n');
  
  // Ejecutar el script
  require('./updateTenderosValidos.js');
  process.exit(0);
}

// Opción 2: Buscar archivo de credenciales JSON
const credentialPaths = [
  path.join(process.cwd(), 'firebaseServiceAccountKey.json'),
  path.join(process.cwd(), 'serviceAccountKey.json'),
  path.join(process.env.HOME || process.env.USERPROFILE, '.firebase', 'serviceAccountKey.json'),
];

for (const credPath of credentialPaths) {
  if (fs.existsSync(credPath)) {
    console.log(`✅ Detectado: ${credPath}`);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
    console.log('   Usando archivo de credenciales JSON\n');
    
    require('./updateTenderosValidos.js');
    process.exit(0);
  }
}

// Opción 3: Buscar variable de entorno
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(`✅ Detectado: Variable de entorno GOOGLE_APPLICATION_CREDENTIALS`);
  console.log(`   ${process.env.GOOGLE_APPLICATION_CREDENTIALS}\n`);
  
  require('./updateTenderosValidos.js');
  process.exit(0);
}

// Si no encuentra nada, mostrar instrucciones
console.log('⚠️  No se detectaron credenciales de Firebase\n');
console.log('📋 SOLUCIONES:\n');

console.log('1️⃣  OPCIÓN: Usa Firebase CLI (Si estás logueado)');
console.log('   firebase login');
console.log('   node scripts/updateTenderosValidos.js\n');

console.log('2️⃣  OPCIÓN: Descarga el archivo de credenciales');
console.log('   - Ve a: https://console.firebase.google.com');
console.log('   - Proyecto → Settings → Service Accounts');
console.log('   - "Generate New Private Key"');
console.log('   - Guarda como: firebaseServiceAccountKey.json');
console.log('   - Ejecuta: node scripts/updateTenderosValidos.js\n');

console.log('3️⃣  OPCIÓN: Configura variable de entorno (Windows PowerShell)');
console.log('   $env:GOOGLE_APPLICATION_CREDENTIALS="./firebaseServiceAccountKey.json"');
console.log('   node scripts/updateTenderosValidos.js\n');

console.log('3️⃣  OPCIÓN: Configura variable de entorno (macOS/Linux)');
console.log('   export GOOGLE_APPLICATION_CREDENTIALS="./firebaseServiceAccountKey.json"');
console.log('   node scripts/updateTenderosValidos.js\n');

process.exit(1);
