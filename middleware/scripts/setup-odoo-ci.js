import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';

dotenv.config();
const OdooJSONRpc = OdooModule.default || OdooModule;

const config = {
  baseUrl: process.env.ODOO_BASE_URL || 'http://localhost',
  port: Number(process.env.ODOO_PORT) || 8069,
  db: process.env.ODOO_DB || 'postgres',
  username: process.env.ODOO_USERNAME || 'odoo',
  password: process.env.ODOO_PASSWORD || 'admin'
};

console.log('🔧 Configuración de Odoo:', {
  baseUrl: config.baseUrl,
  port: config.port,
  db: config.db,
  username: config.username
});

async function waitForOdoo() {
  console.log('🔍 Esperando que Odoo esté completamente listo...');
  
  const maxAttempts = 60; // 5 minutos máximo
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const testClient = new OdooJSONRpc(config);
      await testClient.connect();
      console.log('✅ Odoo está listo y accesible');
      return;
    } catch (error) {
      attempts++;
      console.log("ERROR",error)
      console.log(`⏳ Intento ${attempts}/${maxAttempts} - Esperando Odoo...`);
      
      if (attempts >= maxAttempts) {
        throw new Error(`Timeout: Odoo no estuvo listo después de ${maxAttempts} intentos`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function setupTestData() {
  console.log('🎭 Configurando datos de prueba...');
  
  const client = new OdooJSONRpc(config);
  await client.connect();
  
  try {
    // Crear categorías
    const categories = ['Cuadros Abstractos', 'Paisajes', 'Retratos'];
    const categoryIds = [];
    
    for (const catName of categories) {
      const existing = await client.searchRead('product.category', [['name', '=', catName]], ['id']);
      
      if (existing.length > 0) {
        categoryIds.push(existing[0].id);
        console.log(`♻️ Categoría existente: ${catName}`);
      } else {
        const catId = await client.create('product.category', { name: catName });
        categoryIds.push(catId);
        console.log(`✅ Categoría creada: ${catName}`);
      }
    }
    
    // Crear productos de prueba
    const products = [
      { name: 'Cuadro Test 1', list_price: 100, categ_id: categoryIds[0] || 1 },
      { name: 'Cuadro Test 2', list_price: 200, categ_id: categoryIds[1] || 1 },
      { name: 'Cuadro Test 3', list_price: 300, categ_id: categoryIds[2] || 1 }
    ];
    
    for (const product of products) {
      const existing = await client.searchRead('product.product', [['name', '=', product.name]], ['id']);
      
      if (existing.length === 0) {
        await client.create('product.product', { ...product, type: 'product', sale_ok: true });
        console.log(`✅ Producto creado: ${product.name}`);
      } else {
        console.log(`♻️ Producto existente: ${product.name}`);
      }
    }
    
    const totalProducts = await client.searchCount('product.product', []);
    console.log(`📦 Total productos: ${totalProducts}`);
    
  } catch (error) {
    console.error('❌ Error configurando datos:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando configuración de Odoo para CI...');
    
    await waitForOdoo();
    await setupTestData();
    
    console.log('🎉 Configuración completada exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();