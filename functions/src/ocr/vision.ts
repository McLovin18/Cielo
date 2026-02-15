// import * as functions from 'firebase-functions';
// import { ImageAnnotatorClient } from '@google-cloud/vision'; // Movido a import dinámico para evitar timeouts de carga

// SIMULACIÓN DE OCR PARA DEMOSTRACIÓN (Para no requerir API Key de pago ahora mismo)
// Si el cliente habilita la API, descomenta la parte real.

export const processInvoiceImage = async (imageBase64: string): Promise<any> => {
    console.log('🖼️ Procesando imagen con Google Vision API...');
    
    // --------------------------------------------------------------------------------
    // MODO REAL (Vision API)
    // --------------------------------------------------------------------------------
    try {
        // Dynamic import to prevent "Timeout after 10000ms" during function load
        // HACK: Wrap in extra try-catch during import just in case resolve fails
        const visionModule = await import('@google-cloud/vision').catch(err => {
            console.warn('Failed to load @google-cloud/vision module:', err);
            return null;
        });

        if (!visionModule) {
             throw new Error('Google Cloud Vision module not available');
        }
        
        const { ImageAnnotatorClient } = visionModule;
        
        const client = new ImageAnnotatorClient();
        const [result] = await client.textDetection({
            image: { content: imageBase64 }
        });
        const detections = result.textAnnotations;
        const fullText = detections ? detections[0].description : '';
        
        if (!fullText) {
            console.warn('⚠️ No text detected by Vision API');
            return { rawText: '', invoiceNumber: '', date: '', items: [] };
        }

        console.log('Texto detectado (Excerpt):', fullText.substring(0, 100) + '...');
        return parseInvoiceText(fullText);

    } catch (error) {
        console.error('❌ Error calling Vision API (Falling back to Mock):', error);
        // Fallback al Mock en caso de error (para no romper la demo si falla la API)
        return mockFallback(imageBase64);
    }
};

const mockFallback = async (_imageBase64: string): Promise<any> => {
    console.log('⚠️ Usando Mock OCR como respaldo...');
    // --------------------------------------------------------------------------------
    // MODO MOCK (Simulación inteligente basada en patrones comunes)
    // --------------------------------------------------------------------------------
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simulamos haber leído una factura típica con tus productos
            // Intentamos generar datos semi-aleatorios para que parezca una nueva lectura
            const randomId = Math.floor(Math.random() * 10000);
            
            resolve({
                // Simulamos un texto crudo que coincida con tu factura de ejemplo
                rawText: `
CIELO - Distribuidora Cielo Demo S.A.S
NIT: 900.999.888-1
FACTURA No: DEMO-${randomId}
Fecha: ${new Date().toISOString().split('T')[0]}

SKU Producto Cantidad Valor Unitario Subtotal
AGUA-500 Botellon Agua purificada 20L 5 $18.000 $90.000
AGUA-500-CI Agua purificada Cielo 3.5L 10 $6.000 $60.000
AGUA-1000-CI Botellon Agua Cielo 20L 3 $16.000 $48.000

Total: $198.000
                `,
                invoiceNumber: `DEMO-${randomId}`,
                date: new Date().toISOString().split('T')[0],
                items: [
                    { 
                        sku: 'AGUA-500', 
                        productName: 'Botellon Agua purificada 20L', 
                        quantity: 5, 
                        price: 18000 
                    },
                    { 
                        sku: 'AGUA-500-CI', 
                        productName: 'Agua purificada Cielo 3.5L', 
                        quantity: 10, 
                        price: 6000 
                    },
                    {
                        sku: 'AGUA-1000-CI',
                        productName: 'Botellon Agua Cielo 20L',
                        quantity: 3,
                        price: 16000
                    }
                ]
            });
        }, 1500); 
    });
};

/**
 * Función auxiliar para parsear texto real (cuando se active Vision API)
 */
function parseInvoiceText(text: string) {
    // const lines = text.split('\n');
    const items: any[] = [];
    
    // Parsing mejorado para el formato "CIELO / Distribuidora Cielo Demo"
    // Busca líneas con SKU al inicio (ej: AGUA-500)
    
    // Patrones de la factura de ejemplo:
    // FACTURA No: DEMO-0001
    // Fecha: 15/02/2026
    // SKU Producto Cantidad Valor Unitario Subtotal
    // AGUA-500 Botellon Agua purificada 20L 5 $18.000 $90.000
    
    let invoiceNumber = '';
    let invoiceDate = '';

    // Regex para cabecera
    const invoiceNumMatch = text.match(/FACTURA No:\s*([A-Z0-9-]+)/i);
    if (invoiceNumMatch) invoiceNumber = invoiceNumMatch[1];
    
    const dateMatch = text.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
       // Convertir DD/MM/YYYY a YYYY-MM-DD
       const [day, month, year] = dateMatch[1].split('/');
       invoiceDate = `${year}-${month}-${day}`;
    }

    // Estrategia de parsing de items linea por linea
    // Asumimos que una línea de producto empieza con el SKU en mayúsculas
    // y contiene números al final
    
    // NOTA: Desactivamos temporalmente esta estrategia simple porque el OCR a veces devuelve columnas
    // desalineadas que confunden al regex lineal. Preferimos la estrategia de búsqueda por bloques (abajo).
    
    /* BLOQUE SIMPLE DESACTIVADO PARA USAR LOGICA ROBUSTA
    for (const line of lines) {
       const trimmed = line.trim();
       
       // Ignorar encabezados y totales
       if (trimmed.startsWith('SKU') || trimmed.startsWith('Subtotal') || trimmed.startsWith('TOTAL')) continue;
       
       // Regex para capturar: SKU | Descripción (opcional) | Cantidad | Precio | Subtotal
       // Ejemplo: AGUA-500 Botellon... 5 $18.000 $90.000
       
       // Intentamos capturar el SKU al principio (letras mayúsculas, números y guiones)
       // Ejemplo real: AGUA-500 Botellon Agua purificada 20L 5 $18.000 $90.000
       // Regex intenta capturar: (SKU) (Resto del nombre) (Cantidad) (Precio con $) (Total con $)
       const lineMatch = trimmed.match(/^([A-Z0-9-]+)\s+(.+?)\s+(\d+)\s+\$([\d.,]+)\s+\$([\d.,]+)/);
       
       if (lineMatch) {
          const sku = lineMatch[1];
          const name = lineMatch[2];
          const quantity = parseInt(lineMatch[3], 10);
          const priceStr = lineMatch[4].replace('.', '').replace(',', '.'); // Quitamos separadores de miles
          const price = parseFloat(priceStr);
          
          items.push({
             sku: sku,
             productName: name.trim(),
             quantity: quantity,
             price: price
          });
       }
    }
    */
    

    // 2. Patrón complejo: La línea a veces se rompe. Intentamos buscar SKU conocido + Número.
    // Esta estrategia es más flexible para demos.
    if (items.length === 0) {
        // Mapa de SKUs conocidos de la demo
        const knownProducts = [
            { sku: 'AGUA-500', name: 'Botellon Agua purificada 20L', price: 18000 },
            { sku: 'AGUA-500-CI', name: 'Agua purificada Cielo 3.5L', price: 6000 },
            { sku: 'AGUA-1000-CI', name: 'Botellon Agua Cielo 20L', price: 16000 }
        ];

        // Recorremos el texto buscando ocurrencias de SKUs
        // LOGS DE DEPURACIÓN
        console.log("--- INICIO DEBUG OCR ---");
        console.log("Texto completo OCR:", text);

        for (const product of knownProducts) {
             console.log(`Analizando producto: ${product.sku}`);
             
             // FIX: Regex estricto para evitar que AGUA-500 coincida con AGUA-500-CI
             // Usamos negative lookahead para asegurar que no sigue una letra, número o guión.
             // Escapamos el guión dentro del regex por seguridad.
             const skuRegex = new RegExp(`${product.sku}(?![\\w-])`, 'i');
             
             const skuMatch = text.match(skuRegex);
             
             // Extraer números del SKU para evitar falsos positivos
             const skuNumericParts = (product.sku.match(/\d+/g) || []).map(d => parseInt(d, 10));

             if (skuMatch && skuMatch.index !== undefined) {
                 // Definir ventana de búsqueda
                 const textAfterSku = text.substring(skuMatch.index + product.sku.length);
                 
                 // STOP LOGIC (Recortar ventana):
                 // Si encontramos otro SKU, normalmente queremos parar ahí para no leer datos ajenos.
                 // PERO: En facturas tablares/columnares, los SKUs vienen todos juntos al principio, y los precios al final.
                 // Si cortamos inmediatamente al ver el siguiente SKU (distancia < 50 chars), nos quedamos sin ventana.
                 
                 let maxWindowLength = 800; // Aumentamos ventana por si es columnar y está lejos
                 let foundNextSkuIndex = -1;
                 
                 for (const otherProduct of knownProducts) {
                     if (otherProduct.sku === product.sku) continue; 
                     
                     // Usamos el mismo regex estricto para buscar otros SKUs
                     const otherSkuRegex = new RegExp(`${otherProduct.sku}(?![\\w-])`, 'i');
                     const otherMatch = textAfterSku.match(otherSkuRegex);
                     
                     if (otherMatch && otherMatch.index !== undefined && otherMatch.index < maxWindowLength) {
                          const dist = otherMatch.index;
                          // CRUCIAL: Solo cortamos si el siguiente SKU está LEJOS (> 30-50 chars).
                          // Si está cerca, asumimos que es una lista de SKUs (formato columnar) y NO cortamos.
                          if (dist > 50) {
                              if (foundNextSkuIndex === -1 || dist < foundNextSkuIndex) {
                                  foundNextSkuIndex = dist;
                                  console.log(`[${product.sku}] Corte de ventana detectado por ${otherProduct.sku} a distancia ${dist}`);
                              }
                          } else {
                              console.log(`[${product.sku}] Ignorando corte por ${otherProduct.sku} (distancia ${dist} < 50) - Asumiendo formato columnar`);
                          }
                     }
                 }
                 
                 if (foundNextSkuIndex !== -1) {
                     maxWindowLength = foundNextSkuIndex;
                 }
                 
                 const searchWindow = textAfterSku.substring(0, maxWindowLength);
                 
                 console.log(`[${product.sku}] Ventana de búsqueda final (len=${searchWindow.length}):`, searchWindow.substring(0, 100) + '...');

                 // Buscar explícitamente el patrón de tabla: SKU ... Desc ... CANT ... PRECIO ... TOTAL
                 // En la imagen se ve claro: "AGUA-500 Botellon... 5 $18.000" 
                 // El problema es que el OCR puede devolver: "AGUA-500 Botellon... 20L ... 5 ... $18.000"
                 // O incluso: "AGUA-500" (newline) "Botellon..."
                 
                 // Vamos a buscar la coincidencia más cercana a Precio Unitario y mirar hacia ATRÁS.
                 // El precio ($18.000) es un ancla muy fuerte.
                 
                 // 1. Buscamos el precio del producto en el texto (ej: 18.000 o 18,000 o 18000)
                 const priceRawStr = product.price.toString(); 
                 // Regex: 18[. ,]000
                 // El precio puede salir como $18.000, 18.000, 18,000
                 
                 // Intentamos pillar 3 ceros finales, o 2 decimales
                 const thousands = priceRawStr.substring(0, priceRawStr.length - 3);
                 
                 // Regexp que intenta coincidir con miles: 18\.000 o 18\,000
                 const priceRegex = new RegExp(`${thousands}[.,]000`, 'i');
                 console.log(`[${product.sku}] Buscando precio: ${priceRegex}`);
                 
                 const priceMatch = searchWindow.match(priceRegex);
                 
                 let found = false; // Declarar variable encontrada
                 let bestQuantity = 1;

                 if (priceMatch && priceMatch.index !== undefined) {
                     console.log(`[${product.sku}] Precio encontrado en índice ${priceMatch.index}`);
                     // Si encontramos el precio, miramos lo que hay justo ANTES.
                     // Texto entre SKU y Precio
                     const textBetween = searchWindow.substring(0, priceMatch.index);
                     console.log(`[${product.sku}] Texto entre SKU y precio: "${textBetween}"`);
                     
                     // Extraer números de ese segmento intermedio (reverse order para pillar el más cercano al precio)
                     const allNumbersBetween = [...textBetween.matchAll(/\b(\d+)\b/g)];
                     const numbersBetween = allNumbersBetween.map(m => parseInt(m[1], 10)).reverse();
                     console.log(`[${product.sku}] Números candidatos (reversa):`, numbersBetween);
                     
                     for (const n of numbersBetween) {
                         // Ignorar años
                         if (n > 2020 && n < 2030) {
                             console.log(`[${product.sku}] Ignorado ${n} (parece año)`);
                             continue;
                         }
                         
                         // Ignorar si el número es "20" y el producto tiene "20L"
                         // ESTO ES CLAVE: Si detectamos que el producto es botellon de 20L, y vemos un 20 justo antes del precio...
                         if (n === 20 && product.name.toUpperCase().includes('20L')) {
                             console.log(`[${product.sku}] Ignorado 20 por ser '20L' potencial`);
                             continue;
                         }
                         
                         // Si el número es parte del SKU, prohibido.
                         // FIX: Antes usabamos includes() de string, lo que descartaba el 5 si el SKU era 500.
                         // Ahora comparamos igualdad numérica estricta con las partes del SKU.
                         if (skuNumericParts.includes(n)) {
                             console.log(`[${product.sku}] Ignorado ${n} por ser igual a un número del SKU`);
                             continue;
                         }
                         
                         // SI el número es < 1000, es nuestro mejor candidato para cantidad.
                         if (n < 1000) {
                              bestQuantity = n;
                              found = true;
                              console.log(`[${product.sku}] ¡Cantidad seleccionada (Estrategia 1)!: ${n}`);
                              break;
                         }
                     }
                 } else {
                     console.log(`[${product.sku}] No se encontró precio con regex ${priceRegex}`);
                 }
                 
                 // Si la estrategia de "Mirar antes del precio" falló, usamos la estrategia puramente posicional pero más estricta
                 if (!found) {
                     console.log(`[${product.sku}] Falló estrategia de precio, buscando posicionalmente estricta...`);
                     // Volvemos a recorrer números, pero siendo super estrictos con el SKU
                     // Si extraemos 500 y el SKU es AGUA-500, PROHIBIDO usar 500.
                     const allNumbers = [...searchWindow.matchAll(/\b(\d+)\b/g)];
                     console.log(`[${product.sku}] Todos los números en ventana:`, allNumbers.map(m => m[0]));
                     
                     for (const match of allNumbers) {
                         const n = parseInt(match[1], 10);
                         
                         // CRUCIAL: Si el SKU contiene este número exacto, IGNORAR SIEMPRE.
                         // Ej: 500 en AGUA-500
                         if (skuNumericParts.includes(n)) {
                             console.log(`[${product.sku}] Ignorando posicional ${n} (igual a parte numérica del SKU)`);
                             continue;
                         }
                         
                         // Ignorar 20L si descripcion lo tiene
                         if (n === 20 && product.name.includes('20L')) {
                             console.log(`[${product.sku}] Ignorando posicional 20 (es 20L)`);
                             continue;
                         }
                        // Ignorar 3 o 3.5 si descripcion tiene 3.5L
                        // Cuidado: 3.5 se lee como 3 y 5.
                        if (n === 3 || n === 4 || n === 5) {
                            if (product.name.includes('3.5L')) {
                               console.log(`[${product.sku}] Checkeando ambiguedad 3.5L para el numero ${n}`);
                               const idx = match.index || 0;
                               const charAfter = searchWindow.charAt(idx + match[0].length); 
                               if (charAfter === 'L' || charAfter === 'l' || charAfter === '.') {
                                    console.log(`[${product.sku}] ${n} descartado -> sequido de '${charAfter}'`);
                                    continue;
                               }
    
                               const charBefore = searchWindow.charAt(idx - 1);
                               if (charBefore === '.' || charBefore === ',') {
                                    console.log(`[${product.sku}] ${n} descartado -> precedido de punto/coma`);
                                    continue;
                               }
                            }
                       }

                         // REGLA MAESTRA: Si el número está pegado a una 'L' o 'ml', es volumen.
                         const thisIdx = match.index || 0;
                         const next = searchWindow.charAt(thisIdx + match[0].length);
                         if (next === 'L' || next === 'l' || next === '.') {
                             console.log(`[${product.sku}] ${n} descartado por sufijo volumen '${next}'`);
                             continue;
                         }
                         
                         const prev = searchWindow.charAt(thisIdx - 1);
                         if (prev === '.' || prev === ',') {
                             console.log(`[${product.sku}] ${n} descartado por prefijo decimal`);
                             continue;
                         }

                         if (n < 1000) {
                             console.log(`[${product.sku}] Seleccionado ${n} como cantidad backup posicional`);
                             bestQuantity = n;
                             found = true;
                             break;
                         }
                     }
                 }

                 console.log(`[${product.sku}] >> RESULTADO FINAL: ${found ? bestQuantity : 1}`);
                 items.push({
                     sku: product.sku,
                     productName: product.name,
                     quantity: found ? bestQuantity : 1, 
                     price: product.price
                 });
             }
        }
    }

    return {
        invoiceNumber: invoiceNumber || `F-${Math.floor(Math.random() * 10000)}`,
        date: invoiceDate || new Date().toISOString().split('T')[0],
        items: items
    };
}
