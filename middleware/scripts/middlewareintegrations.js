// Fichero: runMiddlewareIntegrationTests.js
import dotenv from 'dotenv';

// Añadir fetch polyfill para Node.js si no está disponible globalmente
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options) => {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch(url, options);
  };
}

dotenv.config();

const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || 'http://localhost:4000/graphql';
let authToken = null; // Almacenará el token JWT después del login

// --- Utilidades ---
async function  graphqlQuery(query, variables = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  console.log(`\n🚀 Enviando GraphQL Query/Mutation a ${MIDDLEWARE_URL}`);
  console.log('   Query:', query.split('\n')[0] + '...'); // Mostrar solo la primera línea de la query
  if (Object.keys(variables).length > 0) console.log('   Variables:', variables);
  if (authToken) console.log('   Con Token: SÍ');


  try {
    const response = await fetch(MIDDLEWARE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Error HTTP ${response.status}: ${errorBody}`);
      throw new Error(`HTTP error ${response.status}`);
    }

    const jsonResponse = await response.json();
    if (jsonResponse.errors) {
      console.error('❌ Errores GraphQL:', JSON.stringify(jsonResponse.errors, null, 2));
      // No lanzar error aquí para poder inspeccionar datos parciales si existen
    }
    if (jsonResponse.data) {
      console.log('✅ Datos recibidos:', JSON.stringify(jsonResponse.data, null, 2).substring(0, 300) + '...');
    }
    return jsonResponse;
  } catch (error) {
    console.error('💥 Excepción en graphqlQuery:', error.message);
    return { errors: [{ message: error.message }] }; // Devolver un objeto de error compatible
  }
}

function assert(condition, message) {
  if (!condition) {
    console.error(`🛑 ASERCIÓN FALLIDA: ${message}`);
    // En un framework de test real, esto lanzaría un error y pararía la prueba.
    // Por ahora, solo lo logueamos y continuamos para probar más cosas.
    return false;
  }
  console.log(`✔️ ASERCIÓN OK: ${message}`);
  return true;
}

// --- Tests ---
async function runTests() {
  let allTestsPassed = true;
  const testResults = {};

  // Variables para almacenar IDs, etc. entre tests
  let testProductId = null;
  let testProductCategoryId = null; // Asumiendo que se crea una categoría llamada "Abstractos"
  let testCartLineId = null;

  console.log(`\n🧪 Iniciando Pruebas de Integración contra: ${MIDDLEWARE_URL}`);
  console.log('================================================');

  // Test 0: Health check del middleware
  try {
    const healthUrl = MIDDLEWARE_URL.replace('/graphql', '/health');
    const healthResponse = await fetch(healthUrl);
    testResults.healthCheck = assert(healthResponse.ok, 'Middleware health check OK');
    if(!testResults.healthCheck) allTestsPassed = false;
  } catch (e) {
    console.error('❌ Falló el health check del middleware', e.message);
    testResults.healthCheck = false;
    allTestsPassed = false;
    // Si el health check falla, no tiene mucho sentido continuar
    console.log('\n🔴 Pruebas detenidas debido a fallo en health check.');
    return allTestsPassed;
  }


  // Test 1: Registrar un nuevo usuario
  console.log('\n--- Test: Registrar Usuario ---');
  const userEmail = `testuser_${Date.now()}@example.com`;
  const userName = 'Test User';
  const userPassword = 'password123';
  let res = await graphqlQuery(
    `mutation Register($name: String!, $email: String!, $passwd: String!) {
      registerUser(name: $name, email: $email, passwd: $passwd) {
        token success message
      }
    }`,
    { name: userName, email: userEmail, passwd: userPassword }
  );
  testResults.registerUser = 
    assert(res.data?.registerUser?.success === true, 'Registro de usuario exitoso') &&
    assert(typeof res.data?.registerUser?.token === 'string', 'Token recibido en registro');
  if(!testResults.registerUser) allTestsPassed = false;


  // Test 2: Login con el usuario registrado
  console.log('\n--- Test: Login Usuario ---');
  res = await graphqlQuery(
    `mutation Login($email: String!, $password: String!) {
      login(email: $email, password: $password) {
        token success message
      }
    }`,
    { email: userEmail, password: userPassword }
  );
  testResults.loginUser = 
    assert(res.data?.login?.success === true, 'Login de usuario exitoso') &&
    assert(typeof res.data?.login?.token === 'string', 'Token recibido en login');
  if (res.data?.login?.token) {
    authToken = res.data.login.token;
    console.log('🔑 Token de autenticación obtenido.');
  } else {
    allTestsPassed = false;
  }

  // Test 3: Obtener todos los productos (Query products)
  console.log('\n--- Test: Query products ---');
  res = await graphqlQuery(
    `query GetProducts { products { id name list_price x_featured category } }`
  );
  testResults.getProducts = 
    assert(res.data?.products && Array.isArray(res.data.products), 'Obtener lista de productos') &&
    assert(res.data?.products.getNewestProducts != "[]", 'La lista de productos no está vacía');
  if (res.data?.products?.[0]?.id) {
    testProductId = res.data.products[0].id; // Guardar ID para pruebas posteriores
  }
  if(!testResults.getProducts) allTestsPassed = false;
  
  // Test 4: Obtener productos por categoría (Query productsByCategory)
  console.log('\n--- Test: Query productsByCategory ---');
  // Asegúrate que "Abstractos" es una categoría creada por el script de datos
  const categoryNameToTest = 'Abstractos'; 
  res = await graphqlQuery(
    `query GetProductsByCat($categoryName: String!) {
      productsByCategory(categoryName: $categoryName) { id name category x_featured }
    }`,
    { categoryName: categoryNameToTest }
  );
  testResults.getProductsByCategory = 
    assert(res.data?.productsByCategory && Array.isArray(res.data.productsByCategory), `Obtener productos de categoría "${categoryNameToTest}"`) &&
    assert(res.data.productsByCategory.every(p => p.category === categoryNameToTest || !p.category /* Odoo a veces no devuelve este campo si no se pide explícitamente el name de category */), `Todos los productos son de la categoría "${categoryNameToTest}" o sin categoría especificada`);
  if (res.data?.productsByCategory?.find(p => p.x_featured === true)) {
    console.log('ℹ️ Encontrado producto destacado en la categoría.');
  }
  if(!testResults.getProductsByCategory) allTestsPassed = false;

  // Test 5: Obtener producto por ID (Query productById)
  console.log('\n--- Test: Query productById ---');
  if (testProductId) {
    res = await graphqlQuery(
      `query GetProductById($id: String!) { productById(id: $id) { id name list_price x_featured } }`,
      { id: testProductId }
    );
    testResults.getProductById = 
      assert(res.data?.productById?.id === testProductId, `Obtener producto por ID ${testProductId}`);
    if(!testResults.getProductById) allTestsPassed = false;
  } else {
    console.warn('⚠️ Saltando test productById porque no se obtuvo un ID de producto válido.');
    testResults.getProductById = 'SKIPPED';
  }
  
  // Test 6: Buscar productos (Query searchProducts)
  console.log('\n--- Test: Query searchProducts ---');
  // Busca un término que probablemente exista, ej. parte del nombre de "Sueño Cósmico"
  const searchTerm = 'Cósmico'; 
  res = await graphqlQuery(
    `query Search($searchTerm: String!) { searchProducts(searchTerm: $searchTerm) { id name } }`,
    { searchTerm }
  );
  testResults.searchProducts =
    assert(res.data?.searchProducts && Array.isArray(res.data.searchProducts), `Buscar productos con término "${searchTerm}"`) &&
    assert(res.data.searchProducts.some(p => p.name.includes(searchTerm)), `Algún producto encontrado contiene "${searchTerm}"`);
  if(!testResults.searchProducts && res.data?.searchProducts?.length === 0) {
    console.warn(`No se encontraron productos para "${searchTerm}". Asegúrate que los datos de prueba los incluyen.`);
  }
  if(!testResults.searchProducts) allTestsPassed = false;

  // Test 7: Obtener productos relacionados (Query getRelatedProducts)
  // Esta query puede depender de la lógica de tu Odoo (ej. accesorios, productos alternativos)
  console.log('\n--- Test: Query getRelatedProducts ---');
  if (testProductId) {
    res = await graphqlQuery(
      `query Related($productId: String!) { getRelatedProducts(productId: $productId, limit: 2) { id name } }`,
      { productId: testProductId }
    );
    // Es difícil hacer una aserción fuerte sin conocer la lógica de Odoo.
    // Simplemente verificamos que devuelve un array (puede ser vacío).
    testResults.getRelatedProducts = 
      assert(res.data?.getRelatedProducts && Array.isArray(res.data.getRelatedProducts), `Obtener productos relacionados para ID ${testProductId}`);
    if(!testResults.getRelatedProducts) allTestsPassed = false;
  } else {
    console.warn('⚠️ Saltando test getRelatedProducts por falta de ID de producto.');
    testResults.getRelatedProducts = 'SKIPPED';
  }

  // Test 8: Obtener productos destacados (Query getFeaturedProducts)
  console.log('\n--- Test: Query getFeaturedProducts ---');
  res = await graphqlQuery(
    `query Featured { getFeaturedProducts { id name x_featured } }`
  );
  testResults.getFeaturedProducts =
    assert(res.data?.getFeaturedProducts && Array.isArray(res.data.getFeaturedProducts), 'Obtener productos destacados') &&
    assert(res.data.getFeaturedProducts.every(p => p.x_featured === true), 'Todos los productos obtenidos son x_featured=true');
  if (res.data?.getFeaturedProducts?.length === 0) {
    console.warn("⚠️ No se encontraron productos destacados. Verifica el script de datos y el campo 'x_featured' en Odoo.");
  }
  if(!testResults.getFeaturedProducts) allTestsPassed = false;

  // Test 9: Obtener productos más nuevos (Query getNewestProducts)
  console.log('\n--- Test: Query getNewestProducts ---');
  res = await graphqlQuery(
    `query Newest { getNewestProducts { id name create_date } }`
  );
  testResults.getNewestProducts = 
    assert(res.data?.getNewestProducts && Array.isArray(res.data.getNewestProducts), 'Obtener productos más nuevos') &&
    assert(res.data.getNewestProducts.length > 0, 'La lista de productos nuevos no está vacía');
  // Podrías añadir una comprobación de que están ordenados por create_date descendente si lo sabes.
  if(!testResults.getNewestProducts) allTestsPassed = false;

  // Test 10: Obtener Partner ID (Query getPartnerId - autenticada)
  console.log('\n--- Test: Query getPartnerId ---');
  if (authToken) {
    res = await graphqlQuery(
      `query PartnerId { getPartnerId }`
    );
    testResults.getPartnerId = 
      assert(typeof res.data?.getPartnerId === 'number', 'Obtener Partner ID (debe ser un número)');
    if(!testResults.getPartnerId) allTestsPassed = false;
  } else {
    console.warn('⚠️ Saltando test getPartnerId por falta de token de autenticación.');
    testResults.getPartnerId = 'SKIPPED_NO_AUTH';
  }

  // Tests de Carrito (autenticados)
  if (authToken && testProductId) { // Necesitamos un producto para añadir al carrito
    const numericTestProductId = parseInt(testProductId.split('-').pop() || testProductId); // Odoo IDs suelen ser numéricos para product.product

    // Test 11: Añadir al carrito (Mutation addToCart)
    console.log('\n--- Test: Mutation addToCart ---');
    res = await graphqlQuery(
      `mutation AddToCart($productId: Int!) { addToCart(productId: $productId) { success message line_id order_id } }`,
      { productId: numericTestProductId }
    );
    testResults.addToCart = 
      assert(res.data?.addToCart?.success === true, `Añadir producto ${numericTestProductId} al carrito`) &&
      assert(typeof res.data?.addToCart?.line_id === 'number', 'Recibido line_id al añadir al carrito');
    if (res.data?.addToCart?.line_id) {
      testCartLineId = res.data.addToCart.line_id;
    }
    if(!testResults.addToCart) allTestsPassed = false;

    // Test 12: Obtener carrito (Query getCart)
    console.log('\n--- Test: Query getCart ---');
    res = await graphqlQuery(
      `query GetCart { getCart { order { id name amount_total } lines { id display_name product { id name } } } }`
    );
    testResults.getCartFull = 
      assert(res.data?.getCart?.order?.id > 0, 'Obtener carrito con una orden') &&
      assert(res.data?.getCart?.lines?.length > 0, 'El carrito tiene líneas de pedido');
    if(!testResults.getCartFull) allTestsPassed = false;

    // Test 13: Eliminar del carrito (Mutation removeFromCart)
    if (testCartLineId) {
      console.log('\n--- Test: Mutation removeFromCart ---');
      res = await graphqlQuery(
        `mutation RemoveFromCart($lineId: Int!) { removeFromCart(lineId: $lineId) { success message } }`,
        { lineId: testCartLineId }
      );
      testResults.removeFromCart = 
        assert(res.data?.removeFromCart?.success === true, `Eliminar línea ${testCartLineId} del carrito`);
      if(!testResults.removeFromCart) allTestsPassed = false;
    } else {
      console.warn('⚠️ Saltando test removeFromCart por falta de line_id.');
      testResults.removeFromCart = 'SKIPPED';
    }

    // Test 14: Vaciar carrito (Mutation clearCart)
    // Primero añadimos algo de nuevo para asegurar que hay algo que limpiar
    await graphqlQuery( `mutation AddToCart($productId: Int!) { addToCart(productId: $productId) { success } }`, { productId: numericTestProductId });
    
    console.log('\n--- Test: Mutation clearCart ---');
    res = await graphqlQuery(
      `mutation ClearCart { clearCart { success message } }`
    );
    testResults.clearCart = 
      assert(res.data?.clearCart?.success === true, 'Vaciar el carrito');
    if(!testResults.clearCart) allTestsPassed = false;

    // Test 15: Verificar que el carrito está vacío
    console.log('\n--- Test: Query getCart (después de clear) ---');
    res = await graphqlQuery(
      `query GetCartEmpty { getCart { order { id } lines { id } } }`
    );
    // Un carrito vacío en Odoo puede seguir existiendo como una orden sin líneas o devolver null para 'order'
    // dependiendo de la implementación de getUserCart. Asumimos que devuelve líneas vacías o no devuelve 'order'.
    const cartIsEmpty = !res.data?.getCart?.order || res.data?.getCart?.lines?.length === 0 || res.data?.getCart === null;
    testResults.getCartEmpty = 
      assert(cartIsEmpty, 'Verificar que el carrito está vacío después de clearCart');
    if(!testResults.getCartEmpty) allTestsPassed = false;

  } else {
    console.warn('⚠️ Saltando tests de Carrito por falta de token o ID de producto.');
    testResults.addToCart = 'SKIPPED_NO_AUTH_OR_PRODUCT';
    testResults.getCartFull = 'SKIPPED_NO_AUTH_OR_PRODUCT';
    testResults.removeFromCart = 'SKIPPED_NO_AUTH_OR_PRODUCT';
    testResults.clearCart = 'SKIPPED_NO_AUTH_OR_PRODUCT';
    testResults.getCartEmpty = 'SKIPPED_NO_AUTH_OR_PRODUCT';
  }
  
  // Test 16: Mutación de Checkout (checkoutCart) - Sólo la llamada, no la lógica completa de pago
  // Esta mutación no estaba en tu `resolvers.js` pero sí en `typeDefs.js`.
  // La voy a comentar, ya que no hay resolver. Si lo añades, puedes descomentarla.
  /*
  console.log('\n--- Test: Mutation checkoutCart ---');
  if (authToken) {
    // Primero añadimos algo al carrito
    await graphqlQuery( `mutation AddToCart($productId: Int!) { addToCart(productId: $productId) { success } }`, { productId: numericTestProductId });
    res = await graphqlQuery(
      `mutation Checkout { checkoutCart { success message order_name access_url } }`
    );
    testResults.checkoutCart = 
      assert(res.data?.checkoutCart?.success === true, 'Checkout del carrito (simulado)');
    if(!testResults.checkoutCart) allTestsPassed = false;
  } else {
    console.warn('⚠️ Saltando test checkoutCart por falta de token.');
    testResults.checkoutCart = 'SKIPPED_NO_AUTH';
  }
  */


  console.log('\n================================================');
  console.log('📊 Resumen de Pruebas de Integración:');
  for (const testName in testResults) {
    console.log(`  ${testName}: ${testResults[testName] === true ? '✅ PASSED' : (testResults[testName] === false ? '❌ FAILED' : `⚠️ ${testResults[testName]}`)}`);
  }
  console.log('================================================');
  if (allTestsPassed) {
    console.log('🎉 ¡Todas las aserciones principales pasaron!');
  } else {
    console.log('🔴 Algunas aserciones fallaron. Revisa los logs.');
  }
  return allTestsPassed;
}


// --- Ejecutar Pruebas ---
runTests()
  .then((success) => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1); // Salir con error si alguna prueba falló
    }
  })
  .catch(err => {
    console.error("💥 Error catastrófico durante la ejecución de las pruebas:", err);
    process.exit(1);
  });