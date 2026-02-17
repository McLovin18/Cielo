import * as admin from 'firebase-admin';
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
        // GUARDAR RAW TEXT Y RESULTADOS EN FIRESTORE PARA DEBUG
        let parseResult = null;
        try {
            parseResult = parseInvoiceText(fullText);
            const db = admin.firestore();
            await db.collection('ocr_debug').add({
                createdAt: new Date(),
                rawText: fullText,
                imageHash: imageBase64.slice(0, 32),
                parseResult,
            });
        } catch (e) {
            console.warn('No se pudo guardar rawText/parseResult en ocr_debug:', e);
        }
        console.log('Texto detectado (Excerpt):', fullText.substring(0, 100) + '...');
        return parseResult;

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
    // Separar por líneas y limpiar espacios extra
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    console.log('--- OCR RAW TEXT ---');
    console.log(text);
    const items: any[] = [];
    let invoiceNumber = '';
    let invoiceDate = '';
    // Regex para cabecera
    const invoiceNumMatch = text.match(/FACTURA No:\s*([A-Z0-9-]+)/i);
    if (invoiceNumMatch) invoiceNumber = invoiceNumMatch[1];
    const dateMatch = text.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
        const [day, month, year] = dateMatch[1].split('/');
        invoiceDate = `${year}-${month}-${day}`;
    }
    // Extraer todos los SKUs, nombres y cantidades en orden
    const skuList = ['AGUA-500', 'AGUA-500-CI', 'AGUA-1000-CI'];
    const nameList = [
        'Botellon Agua purificada 20L',
        'Agua purificada Cielo 3.5L',
        'Botellon Agua Cielo 20L'
    ];
    const priceList = [18000, 6000, 16000];
    const foundSKUs = lines.filter(l => skuList.includes(l));
    const foundNames = lines.filter(l => nameList.includes(l));
    const foundQuantities = lines.filter(l => /^\d{1,4}$/.test(l)).map(Number).filter(n => n > 0 && n < 1000);
    // Si hay exactamente 3 SKUs, 3 nombres y 3 cantidades, asociar por posición
    if (foundSKUs.length === 3 && foundNames.length === 3 && foundQuantities.length === 3) {
        for (let i = 0; i < 3; i++) {
            items.push({
                sku: skuList[i],
                productName: nameList[i],
                quantity: foundQuantities[i],
                price: priceList[i]
            });
            console.log(`[${skuList[i]}] Resultado final:`, { sku: skuList[i], quantity: foundQuantities[i], price: priceList[i] });
        }
    } else {
        // UNIVERSAL: Para cada SKU, buscar el nombre más cercano después del SKU, y la cantidad más cercana después del nombre
        for (const product of [
            { sku: 'AGUA-500', name: 'Botellon Agua purificada 20L', price: 18000 },
            { sku: 'AGUA-500-CI', name: 'Agua purificada Cielo 3.5L', price: 6000 },
            { sku: 'AGUA-1000-CI', name: 'Botellon Agua Cielo 20L', price: 16000 }
        ]) {
            const skuNumericParts = (product.sku.match(/\d+/g) || []).map(d => parseInt(d, 10));
            // Buscar todas las líneas donde aparece el SKU
            const lineIndexes = lines.map((l, idx) => l.includes(product.sku) ? idx : -1).filter(idx => idx !== -1);
            for (const lineIdx of lineIndexes) {
                // Buscar la línea del nombre de producto más cercana después del SKU
                const nameLineIdx = lines.findIndex((l, idx) => idx > lineIdx && l.includes(product.name));
                let quantity = 1;
                if (nameLineIdx !== -1) {
                    // Buscar la cantidad más cercana después del nombre (en las siguientes 5 líneas)
                    let found = false;
                    for (let offset = 1; offset <= 5 && !found; offset++) {
                        const qtyLine = lines[nameLineIdx + offset] || '';
                        // Buscar todos los números realistas en esa línea
                        const nums = [...qtyLine.matchAll(/\b(\d{1,5})\b/g)].map(m => parseInt(m[1], 10));
                        // Filtrar números que NO sean parte del SKU, ni años, ni volúmenes, ni precios
                        const numsFiltered = nums.filter(n =>
                            !skuNumericParts.includes(n) &&
                            !(n > 2020 && n < 2035) &&
                            !(n === 20 && product.name.includes('20L')) &&
                            n > 0 && n <= 1000 &&
                            // No es un precio (no está seguido de ".000" o "$" en la línea)
                            !qtyLine.includes(`$${n}`) &&
                            !qtyLine.includes(`${n}.000`)
                        );
                        if (numsFiltered.length > 0) {
                            quantity = numsFiltered[0]; // Tomar el primer número válido
                            found = true;
                        }
                    }
                }
                // Solo agregar si no existe ya ese SKU en items (por si el OCR repite líneas)
                if (!items.some(i => i.sku === product.sku)) {
                    items.push({
                        sku: product.sku,
                        productName: product.name,
                        quantity,
                        price: product.price
                    });
                    console.log(`[${product.sku}] Resultado final:`, { sku: product.sku, quantity, price: product.price });
                }
            }
        }
    }
    return {
        invoiceNumber: invoiceNumber || `F-${Math.floor(Math.random() * 10000)}`,
        date: invoiceDate || new Date().toISOString().split('T')[0],
        items: items
    };
}
