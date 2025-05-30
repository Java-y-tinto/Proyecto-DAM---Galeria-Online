// Fichero: setupOdooTestData.js
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';

// Añadir fetch polyfill para Node.js si no está disponible globalmente
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options) => {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch(url, options);
  };
}

dotenv.config();
const OdooJSONRpc = OdooModule.default || OdooModule;

const config = {
  baseUrl: process.env.ODOO_BASE_URL || 'http://localhost',
  port: Number(process.env.ODOO_PORT) || 8069,
  db: process.env.ODOO_DB_NAME || 'odoo_test', // Usar la DB creada en CI
  username: process.env.ODOO_USERNAME || 'admin', // Usuario admin de Odoo
  password: process.env.ODOO_PASSWORD || 'admin', // Contraseña admin de Odoo
};

console.log('🔧 Configuración de Odoo para datos de prueba:', {
  baseUrl: config.baseUrl,
  port: config.port,
  db: config.db,
  username: config.username,
  isCI: !!process.env.CI,
});

async function checkOdooAvailability() {
  console.log('🔍 Verificando disponibilidad de Odoo HTTP...');
  const maxAttempts = 12; // 2 minutos máximo (10 segundos * 12)
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${config.baseUrl}:${config.port}/web/database/selector`);
      if (response.ok || response.status === 303) { // 303 es común si redirige a /web/login
        console.log(`✅ Odoo responde HTTP (status: ${response.status})`);
        return true;
      }
      throw new Error(`Respuesta HTTP no OK: ${response.status}`);
    } catch (error) {
      attempts++;
      console.log(`⏳ Intento ${attempts}/${maxAttempts} - Esperando Odoo HTTP... (${error.message})`);
      if (attempts >= maxAttempts) {
        console.error('❌ Timeout: Odoo no estuvo disponible vía HTTP.');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
    }
  }
}

async function connectToOdoo() {
  console.log(`🔗 Intentando conectar a Odoo DB: ${config.db}...`);
  const maxAttempts = 12; // 2 minutos máximo
  let attempts = 0;
  let client;

  while (attempts < maxAttempts) {
    try {
      client = new OdooJSONRpc(config);
      await client.connect();
      console.log('✅ Conexión exitosa a Odoo y su base de datos.');
      console.log("Cliente:",client);
      return client;
    } catch (error) {
      attempts++;
      console.log(`⏳ Intento de conexión a DB ${attempts}/${maxAttempts} - Error: ${error.message}`);
      if (attempts >= maxAttempts) {
        console.error('❌ No se pudo conectar a la base de datos de Odoo después de múltiples intentos.');
        console.error('Detalles de configuración usados:');
        console.error(`  Base URL: ${config.baseUrl}:${config.port}`);
        console.error(`  Database: ${config.db}`);
        console.error(`  Username: ${config.username}`);
        console.error('Asegúrate que la base de datos está inicializada y accesible.');
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 10000)); // Esperar 10 segundos
    }
  }
}

async function createOrUpdateField(client) {
  console.log('🔍 Verificando la capacidad de leer product.template (sin campos custom)...');
  try {
    const products = await client.searchRead(
      'product.template', // Modelo estándar
      [],                 // Dominio vacío (traer cualquiera)
      {
        fields: ['id', 'name'], // Solo campos estándar que seguro existen
        limit: 1
      }
    );
    console.log('✅ Lectura de product.template exitosa (sin campos custom):', products);
    if (products.length === 0) {
      console.log('ℹ️ No se encontraron product.template, pero la llamada fue exitosa.');
    }
  } catch (error) {
    console.error(`❌ Error al intentar leer product.template (sin campos custom): ${error.message}`);
    if (error.message && error.message.includes('404')) {
        console.error('   ↪️ Esto es muy inesperado. searchRead de un modelo estándar con campos estándar no debería dar 404.');
    }
    // Para diagnóstico, vamos a relanzar el error aquí para detener el script si falla.
    throw error;
  }
}

async function setupTestData(client) {
  console.log('🎭 Configurando datos de prueba...');

  // Paso 1: Crear/Verificar campo x_featured (informativo)

  // Paso 2: Crear categorías de productos
  const categoriesData = [
    { name: 'Abstractos', parent_id: false },
    { name: 'Paisajes', parent_id: false },
    { name: 'Retratos', parent_id: false },
    { name: 'Arte Digital', parent_id: false },
  ];
  const categoryIds = {};

  console.log('📂 Creando categorías...');
  for (const catData of categoriesData) {
    let existingCat = await client.searchRead('product.category', [['name', '=', catData.name]], { fields: ['id'], limit: 1 });
    if (existingCat.length > 0) {
      categoryIds[catData.name] = existingCat[0].id;
      console.log(`♻️ Categoría existente: ${catData.name} (ID: ${categoryIds[catData.name]})`);
    } else {
      try {
        const catId = await client.create('product.category', catData);
        categoryIds[catData.name] = catId;
        console.log(`✅ Categoría creada: ${catData.name} (ID: ${catId})`);
      } catch (error) {
         console.error(`❌ Error creando categoría ${catData.name}: ${error.message}`);
      }
    }
  }

  // Paso 3: Crear productos de prueba
  // Usamos product.product porque es el modelo vendible que puede tener variantes.
  // Los campos de product.template (como x_featured si se añade ahí) son heredados.
  const productsData = [
    { name: 'Sueño Cósmico', list_price: 150.00, categ_id: categoryIds['Abstractos'], type: 'product', sale_ok: true,  },
    { name: 'Atardecer en la Montaña', list_price: 220.00, categ_id: categoryIds['Paisajes'], type: 'product', sale_ok: true,  },
    { name: 'Mirada Enigmática', list_price: 300.00, categ_id: categoryIds['Retratos'], type: 'product', sale_ok: true,  },
    { name: 'Ciudad de Neón', list_price: 180.00, categ_id: categoryIds['Arte Digital'], type: 'product', sale_ok: true,  },
    { name: 'Explosión de Color', list_price: 165.00, categ_id: categoryIds['Abstractos'], type: 'product', sale_ok: true,  },
    { name: 'Bosque Sereno', list_price: 250.00, categ_id: categoryIds['Paisajes'], type: 'product', sale_ok: true,  },
  ];

  console.log('🖼️ Creando productos...');
  for (const prodData of productsData) {
    // Asegurarse que categ_id existe, si no, omitirlo o usar uno por defecto
    if (!prodData.categ_id) {
        console.warn(`⚠️ Categoría no encontrada para producto "${prodData.name}", se creará sin categoría específica.`);
        delete prodData.categ_id; // O asignar un ID de categoría por defecto si es necesario
    }

    let existingProd = await client.searchRead('product.product', [['name', '=', prodData.name]], { fields: ['id'], limit: 1 });
    if (existingProd.length > 0) {
      console.log(`♻️ Producto existente: ${prodData.name} (ID: ${existingProd[0].id})`);
      // Opcional: Actualizarlo si es necesario, por ejemplo, para el campo x_featured
      // await client.write('product.product', [existingProd[0].id], { x_featured: prodData.x_featured });
    } else {
      try {
        const productId = await client.create('product.product', prodData);
        console.log(`✅ Producto creado: ${prodData.name} (ID: ${productId}) (Destacado: ${!!prodData.x_featured})`);
      } catch (error) {
         console.error(`❌ Error creando producto ${prodData.name}: ${error.message}`);
         if (error.message && error.message.includes('x_featured')) {
            console.error('   ↪️ Esto puede ser porque el campo "x_featured" no existe en el modelo "product.template".');
         }
      }
    }
  }

  const totalProducts = await client.searchCount('product.product', []);
  const featuredProducts = await client.searchCount('product.product', [['x_featured', '=', true]]);
  console.log(`📊 Total de productos en Odoo: ${totalProducts}`);
  console.log(`⭐ Total de productos destacados: ${featuredProducts}`);
}
async function simpleAuthenticatedCall(client) {
  console.log('🧪 Intentando llamada autenticada simple: leer nombre de usuario actual...');
  try {
    const loggedInUid = client.auth_response?.uid; // Usar el UID del auth_response
    console.log(`ℹ️ Usando UID: ${loggedInUid} para la llamada read.`);

    if (!loggedInUid) {
      console.error('❌ No se pudo obtener un UID válido desde auth_response.');
      throw new Error('UID no disponible para la llamada read.');
    }

    // La firma de read es: read(model, ids, fields = [], kwargs = {})
    const userInfo = await client.read('res.users', [loggedInUid], ['name', 'login']); 
    
    console.log('✅ Información del usuario obtenida:', userInfo);
    if (userInfo && userInfo.length > 0 && userInfo[0].id === loggedInUid) {
      console.log(`✅ Lectura de usuario ${userInfo[0].login} (ID: ${userInfo[0].id}) exitosa.`);
    } else {
      // Esto es una advertencia, no necesariamente un error fatal para la conexión.
      console.warn('⚠️ La lectura del usuario devolvió datos inesperados o vacíos. Respuesta:', userInfo);
    }
    return true;
  } catch (error) {
    console.error('❌ Error en llamada autenticada simple:', error.message);
    if (error.data && error.data.debug) {
        console.error('🐛 Debug Info Odoo:', error.data.debug);
    }
    throw error; // Relanzar para que el main() lo capture si es crítico
  }
}
async function main() {
  try {
    console.log('🚀 Iniciando script de configuración de datos de prueba para Odoo...');
    console.log(`🌏 Entorno: ${process.env.CI ? 'CI/GitHub Actions' : 'Local'}`);

    await checkOdooAvailability();
    const client = await connectToOdoo();
   // await setupTestData(client);
   await createOrUpdateField(client);
    await simpleAuthenticatedCall(client);
    console.log('🎉 Configuración de datos de prueba completada exitosamente!');
  } catch (error) {
    console.error('❌ Error crítico durante la configuración de datos de prueba:', error.message);
    if (error.data && error.data.debug) { // La librería odoo-jsonrpc puede añadir info de debug
        console.error('🐛 Debug Info Odoo:', error.data.debug);
    }
    process.exit(1);
  }
}

main();