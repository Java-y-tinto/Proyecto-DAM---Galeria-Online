// @ts-ignore
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import { LRUCache } from 'lru-cache';
import dotenv from 'dotenv';

dotenv.config();
const OdooJSONRpc = (OdooModule as any).default || OdooModule;

// Interfaces
export interface CartOperationResult {
    success: boolean;
    message: string;
    order_id?: number;
    line_id?: number;
    order_name?: string;
}

export interface CartLine {
    id: number;
    product_id: [number, string];
    display_name: string;
    product_uom_qty: number;
    price_unit: number;
    price_subtotal: number;
    is_sold?: boolean;
    status?: string;
}

export interface CartOrder {
    id: number;
    name: string;
    amount_total: number;
    amount_tax: number;
    amount_untaxed: number;
    access_url: string;
}

export interface Cart {
    order: CartOrder;
    lines: CartLine[];
}

// Configuración escalable por entorno
const CACHE_CONFIG = {
    development: {
        MAX_USERS_PER_PRODUCT: 2,
        MAX_PRODUCTS_PER_USER: 5,
        CACHE_MAX_SIZE: 100,
        CACHE_TTL: 30 * 1000 // 30 segundos
    },
    production: {
        MAX_USERS_PER_PRODUCT: 3,
        MAX_PRODUCTS_PER_USER: 10,
        CACHE_MAX_SIZE: 1500, // Para 600+ productos con margen
        CACHE_TTL: 60 * 1000 // 60 segundos
    }
};

const getConfig = () => process.env.NODE_ENV === 'production' 
    ? CACHE_CONFIG.production 
    : CACHE_CONFIG.development;

const productCache = new LRUCache<number, {
    inCarts: number;
    isSold: boolean;
}>({
    max: getConfig().CACHE_MAX_SIZE,
    ttl: getConfig().CACHE_TTL,
    allowStale: false, // No devolver datos expirados
    updateAgeOnGet: true, // Refrescar al acceder
    updateAgeOnHas: true
});

const userCartCache = new LRUCache<number, number>({
    max: 500, // Cache para 500 usuarios
    ttl: 30 * 1000, // 30 segundos
});


const getOdooConfig = () => {
    const baseConfig = {
        baseUrl: process.env.ODOO_BASE_URL,
        port: Number(process.env.ODOO_PORT),
        db: process.env.ODOO_DB,
        username: process.env.ODOO_USERNAME,
    };

    // En CI/testing usar contraseña, en producción usar API Key
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
        console.log('🧪 Modo testing: usando autenticación por contraseña');
        return {
            ...baseConfig,
            password: process.env.ODOO_PASSWORD
        };
    } else {
        console.log('🔐 Modo producción: usando autenticación por API Key');
        return {
            ...baseConfig,
            apiKey: process.env.ODOO_API_KEY
        };
    }
};

const odooClient = new OdooJSONRpc(getOdooConfig());

export const connectOdoo = async () => {
    try {
        const config = getOdooConfig();
        console.log('🔌 Conectando a Odoo...');
        console.log(`📍 URL: ${config.baseUrl}:${config.port}`);
        console.log(`🗄️ DB: ${config.db}`);
        console.log(`👤 Usuario: ${config.username}`);
        if ('apiKey' in config){
            console.log(`🔐 Método: API Key`);
        } else{
            console.log(`🔐 Método: Password`);
        }
        
        // Intentar conectar con retry para CI
        let retries = 0;
        const maxRetries = process.env.CI ? 5 : 1;
        
        while (retries < maxRetries) {
            try {
                await odooClient.connect();
                console.log(' Conexión a Odoo exitosa');
                
                // Verificar que realmente podemos hacer queries
                if (process.env.NODE_ENV === 'test' || process.env.CI) {
                    console.log('🧪 Verificando conectividad con query de prueba...');
                    const testQuery = await odooClient.searchRead('res.users', [['id', '=', 1]], ['id', 'name']);
                    console.log(' Query de prueba exitosa:', testQuery.length > 0 ? 'Usuario admin encontrado' : 'Sin resultados');
                }
                
                return;
            } catch (error) {
                retries++;
                console.error(`❌ Intento ${retries}/${maxRetries} falló:`, error.message);
                
                if (retries < maxRetries) {
                    console.log(`⏳ Reintentando en 5 segundos...`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('❌ ERROR al conectar con Odoo:', error);
        console.error('💡 Verifica que Odoo esté corriendo y las credenciales sean correctas');
        
        // En CI, proporcionar más información de debug
        if (process.env.CI) {
            console.error('🔍 Información de debug para CI:');
            console.error('- ODOO_BASE_URL:', process.env.ODOO_BASE_URL);
            console.error('- ODOO_PORT:', process.env.ODOO_PORT);
            console.error('- ODOO_DB:', process.env.ODOO_DB);
            console.error('- ODOO_USERNAME:', process.env.ODOO_USERNAME);
            console.error('- ODOO_PASSWORD está definido:', !!process.env.ODOO_PASSWORD);
            console.error('- NODE_ENV:', process.env.NODE_ENV);
        }
        
        throw error;
    }
};

// Función para obtener estado del producto (con cache)
const getProductStatus = async (productId: number) => {
    let status = productCache.get(productId);
    
    if (!status) {
        console.log(`📊 Cache miss para producto ${productId}`);
        
        const [isSold, inCartsCount] = await Promise.all([
            isProductSold(productId),
            getProductInCartsCount(productId)
        ]);
        
        status = { inCarts: inCartsCount, isSold };
        productCache.set(productId, status);
        
        console.log(`💾 Producto ${productId} añadido al cache: ${JSON.stringify(status)}`);
    }
    
    return status;
};

// Función para contar items en carrito de usuario (con cache)
const getUserCartCount = async (uid: number): Promise<number> => {
    let count = userCartCache.get(uid);
    
    if (count === undefined) {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return 0;

        count = await odooClient.searchRead(
            'sale.order.line',
            [
                ['order_id.partner_id', '=', partner_id],
                ['order_id.state', '=', 'draft']
            ]
        ) || 0;
        
        userCartCache.set(uid, count);
    }
    
    return count;
};

//  Función para contar productos en carritos
const getProductInCartsCount = async (productId: number): Promise<number> => {
    try {
        return await odooClient.searchRead(
            'sale.order.line',
            [
                ['product_id', '=', productId],
                ['order_id.state', '=', 'draft']
            ]
        ) || 0;
    } catch (error) {
        console.error('❌ Error contando carritos:', error);
        return 0;
    }
};

//  Obtener todos los productos (filtrados por vendidos)
export const getProducts = async () => {
    try {
        const productsData = await odooClient.searchRead(
            'product.product',
            [],
            ['id', 'name', 'description_sale', 'list_price', 'image_1920'],
        );
        
        const soldProductIds = await getSoldProducts();
        const availableProducts = productsData.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        console.log(`📦 Total productos: ${productsData.length}, Disponibles: ${availableProducts.length}, Vendidos: ${soldProductIds.length}`);
        
        return availableProducts;
    } catch (error) {
        console.error('❌ Error en getProducts:', error);
        return [];
    }
};

//  Obtener producto por ID (con verificación de vendido)
export const getProductById = async (id: string) => {
    try {
        console.log(`🔍 Buscando producto con ID: ${id}`);
        
        const productIdNumber = parseInt(id);
        const isSold = await isProductSold(productIdNumber);
        
        if (isSold) {
            console.log(`❌ Producto ${id} está vendido - no disponible`);
            return null;
        }
        
        const products = await odooClient.searchRead(
            'product.product',
            [['id', '=', id]],
            ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512', 'product_tmpl_id']
        );
        
        if (!products || products.length === 0) {
            console.log(`❌ Producto ${id} no encontrado`);
            return null;
        }
        
        const product = products[0];
        console.log(` Producto ${id} disponible:`, product.name);
        
        // Obtener atributos del producto
        if (product.product_tmpl_id) {
            const templateId = product.product_tmpl_id[0];
            
            const attributeLines = await odooClient.searchRead(
                'product.template.attribute.line',
                [['product_tmpl_id', '=', templateId]],
                ['attribute_id', 'value_ids']
            );
            
            let attributes = [];
            for (const line of attributeLines) {
                const attributeId = line.attribute_id[0];
                
                const attributeDetails = await odooClient.searchRead(
                    'product.attribute',
                    [['id', '=', attributeId]],
                    ['name', 'display_type']
                );
                
                const valueIds = line.value_ids;
                const attributeValues = await odooClient.searchRead(
                    'product.attribute.value',
                    [['id', 'in', valueIds]],
                    ['name', 'html_color']
                );
                
                attributes.push({
                    id: attributeId,
                    name: attributeDetails[0].name,
                    display_type: attributeDetails[0].display_type,
                    values: attributeValues.map(val => ({
                        id: val.id,
                        name: val.name,
                        html_color: val.html_color || null
                    }))
                });
            }
            
            product.attributes = attributes;
            
            const variantAttributeValues = await odooClient.searchRead(
                'product.template.attribute.value',
                [['product_tmpl_id', '=', templateId]],
                ['product_attribute_value_id', 'price_extra']
            );
            
            product.variant_attributes = variantAttributeValues;
        }
        
        return [product];
    } catch (error) {
        console.error("❌ Error en getProductById:", error);
        throw error;
    }
};

//  Obtener productos por categoría (filtrados por vendidos)
export const getProductsByCategory = async (categoryName: string) => {
    try {
        const category = await odooClient.searchRead(
            'product.category',
            [['name', '=', categoryName]],
            ['id']
        );

        if (category.length === 0) return [];

        const categoryId = category[0].id;
        
        const products = await odooClient.searchRead(
            'product.product',
            [['categ_id', '=', categoryId]],
            ['name','product_tmpl_id', 'list_price', 'categ_id', 'image_1920', 'image_512']
        );
        // Obtener atributos de los productos
        for (const product of products) {
             if (product.product_tmpl_id) {
            const templateId = product.product_tmpl_id[0];
            
            const attributeLines = await odooClient.searchRead(
                'product.template.attribute.line',
                [['product_tmpl_id', '=', templateId]],
                ['attribute_id', 'value_ids']
            );
            
            let attributes = [];
            for (const line of attributeLines) {
                const attributeId = line.attribute_id[0];
                
                const attributeDetails = await odooClient.searchRead(
                    'product.attribute',
                    [['id', '=', attributeId]],
                    ['name', 'display_type']
                );
                
                const valueIds = line.value_ids;
                const attributeValues = await odooClient.searchRead(
                    'product.attribute.value',
                    [['id', 'in', valueIds]],
                    ['name', 'html_color']
                );
                
                attributes.push({
                    id: attributeId,
                    name: attributeDetails[0].name,
                    display_type: attributeDetails[0].display_type,
                    values: attributeValues.map(val => ({
                        id: val.id,
                        name: val.name,
                        html_color: val.html_color || null
                    }))
                });
            }
            
            product.attributes = attributes;
            
            const variantAttributeValues = await odooClient.searchRead(
                'product.template.attribute.value',
                [['product_tmpl_id', '=', templateId]],
                ['product_attribute_value_id', 'price_extra']
            );
            
            product.variant_attributes = variantAttributeValues;
        }
        }
        const soldProductIds = await getSoldProducts();
        const availableProducts = products.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        console.log(`📂 Categoría "${categoryName}": ${products.length} total, ${availableProducts.length} disponibles`);
        
        return availableProducts;
        
    } catch (error) {
        console.error("❌ Error en getProductsByCategory:", error);
        return [];
    }
};


// Obtener productos destacados (excluyendo los vendidos)
export const getFeaturedProducts = async () => {
    try{
        const products = await odooClient.searchRead(
            'product.product',
            [['x_featured', '=', true]],
            ['id', 'name', 'list_price', 'image_1920', 'image_512','categ_id']
        );
        
        const soldProductIds = await getSoldProducts();
        const availableProducts = products.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        // Obtener todas las categorias unicas de los productos obtenidos
        const categoryIds = new Set(availableProducts.map(product => product.categ_id[0]));

        // Traer todas las categorias de producto
        const categories = await odooClient.searchRead(
            'product.category',
            [['id','in', [...categoryIds]]],
            ['id', 'name']
        )

        // Crear un Map ID/Nombre para busqueda rapida
        const categoryMap = new Map();
        categories.forEach(category => {
            categoryMap.set(category.id, category.name);
        });
        
        // Añadir categorias a productos
        const enrichedProducts = availableProducts.map(product => ({
            ...product,
            category: product.categ_id 
                ? categoryMap.get(product.categ_id[0]) || 'Sin categoría'
                : 'Sin categoría'
        }));

        
        return enrichedProducts;
    } catch (error) {
        console.error("❌ Error en getFeaturedProducts:", error);
        return [];
    }
}
//  Obtener productos más nuevos (por fecha de creación, excluyendo los vendidos)
export const getNewestProducts = async () => {
    try {
        console.log('🆕 [getNewestProducts] Iniciando consulta de productos más nuevos...');
        
        // Primero, verificar que tenemos productos
        const totalProductsCount = await odooClient.read('product.product', []);
        console.log(`📊 [getNewestProducts] Total de productos en sistema: ${totalProductsCount}`);
        
        if (totalProductsCount === 0) {
            console.log('⚠️ [getNewestProducts] No hay productos en el sistema');
            return [];
        }
        
        // Obtener productos ordenados por fecha de creación
        console.log('🔍 [getNewestProducts] Consultando productos ordenados por fecha...');
        const products = await odooClient.searchRead(
            'product.product',
            [], // Sin filtros específicos, queremos todos los productos
            ['id', 'name', 'list_price', 'image_1920', 'image_512', 'categ_id', 'create_date'],
            0, // offset
            50, // límite mayor para asegurar que tengamos suficientes después de filtrar vendidos
            'create_date DESC' // ordenar por fecha de creación descendente
        );
        
        console.log(`📦 [getNewestProducts] Productos obtenidos de Odoo: ${products.length}`);
        if (products.length > 0) {
            console.log(`📅 [getNewestProducts] Rango de fechas: ${products[products.length - 1]?.create_date} hasta ${products[0]?.create_date}`);
        }
        
        // Filtrar productos vendidos
        const soldProductIds = await getSoldProducts();
        console.log(`🚫 [getNewestProducts] Productos vendidos: ${soldProductIds.length}`);
        
        const availableProducts = products.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        console.log(` [getNewestProducts] Productos disponibles después de filtrar: ${availableProducts.length}`);
        
        // Limitar a los 8 más nuevos
        const newestProducts = availableProducts.slice(0, 8);
        
        if (newestProducts.length === 0) {
            console.log('⚠️ [getNewestProducts] No hay productos nuevos disponibles después de filtrar vendidos');
            
            // Para debugging: mostrar algunos productos sin filtrar
            if (products.length > 0) {
                console.log('🔍 [getNewestProducts] DEBUG - Primeros 3 productos sin filtrar:', 
                    products.slice(0, 3).map(p => ({ id: p.id, name: p.name, create_date: p.create_date }))
                );
            }
            
            return [];
        }
        
        // Obtener categorías si es necesario
        const categoryIds = new Set(
            newestProducts
                .map(product => product.categ_id ? product.categ_id[0] : null)
                .filter(id => id !== null)
        );

        let enrichedProducts = newestProducts;
        
        if (categoryIds.size > 0) {
            console.log(`🏷️ [getNewestProducts] Obteniendo ${categoryIds.size} categorías...`);
            
            const categories = await odooClient.searchRead(
                'product.category',
                [['id', 'in', [...categoryIds]]],
                ['id', 'name']
            );

            const categoryMap = new Map();
            categories.forEach(category => {
                categoryMap.set(category.id, category.name);
            });
            
            enrichedProducts = newestProducts.map(product => ({
                ...product,
                category: product.categ_id 
                    ? categoryMap.get(product.categ_id[0]) || 'Sin categoría'
                    : 'Sin categoría'
            }));
        }

        console.log(` [getNewestProducts] Devolviendo ${enrichedProducts.length} productos más nuevos`);
        return enrichedProducts;
        
    } catch (error) {
        console.error("❌ [getNewestProducts] Error detallado:", error);
        console.error("❌ [getNewestProducts] Stack trace:", error.stack);
        return [];
    }
};

//  Obtener partner ID de un usuario
export const getOdooPartnerId = async (uid: number) => {
    try {
        const user = await odooClient.searchRead(
            'res.users',
            [['id', '=', uid]],
            ['partner_id']
        );
        
        if (user.length > 0) {
            return user[0].partner_id[0];
        }
        return null;
    } catch (error) {
        console.error('❌ Error obteniendo partner ID:', error);
        return null;
    }
};

//  Añadir producto al carrito (con control de concurrencia)
export const addToCart = async (uid: number, productId: number): Promise<CartOperationResult> => {
    try {
        console.log(`🛒 [addToCart] Iniciando para usuario ${uid}, producto ${productId}`);
        
        const config = getConfig();
        const partner_id = await getOdooPartnerId(uid);
        
        console.log(`👤 [addToCart] Partner ID obtenido: ${partner_id}`);
        if (!partner_id) {
            console.error(`❌ [addToCart] Usuario ${uid} no tiene partner_id`);
            return { success: false, message: 'Usuario no encontrado' };
        }

        // 1. Verificar límite de productos por usuario
        const userCartCount = await getUserCartCount(uid);
        console.log(`📊 [addToCart] Productos en carrito del usuario: ${userCartCount}/${config.MAX_PRODUCTS_PER_USER}`);
        
        if (userCartCount >= config.MAX_PRODUCTS_PER_USER) {
            return {
                success: false,
                message: `Límite alcanzado (${config.MAX_PRODUCTS_PER_USER} productos máximo)`
            };
        }

        // 2. Verificar disponibilidad del producto
        console.log(`🔍 [addToCart] Verificando disponibilidad del producto ${productId}`);
        const productStatus = await getProductStatus(productId);
        console.log(`📋 [addToCart] Estado del producto:`, productStatus);
        
        if (productStatus.isSold) {
            return { success: false, message: 'Este cuadro ya ha sido vendido.' };
        }

        if (productStatus.inCarts >= config.MAX_USERS_PER_PRODUCT) {
            return {
                success: false,
                message: `Cuadro muy solicitado (${productStatus.inCarts} personas). Inténtalo después.`
            };
        }

        // 3. Obtener/crear carrito
        console.log(`🛍️ [addToCart] Buscando órdenes de venta para partner ${partner_id}`);
        const orders = await odooClient.searchRead(
            'sale.order',
            [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
            ['id', 'name']
        );
        console.log(`📋 [addToCart] Órdenes encontradas:`, orders);

        let order_id: number;
        if (orders.length === 0) {
            console.log(`➕ [addToCart] Creando nueva orden de venta para partner ${partner_id}`);
            try {
                order_id = await odooClient.create('sale.order', {
                    partner_id,
                    state: 'draft',
                });
                console.log(` [addToCart] Orden creada con ID: ${order_id}`);
            } catch (createOrderError) {
                console.error(`❌ [addToCart] Error creando orden:`, createOrderError);
                throw createOrderError;
            }
        } else {
            order_id = orders[0].id;
            console.log(`♻️ [addToCart] Usando orden existente: ${order_id}`);
        }

        // 4. Verificar si ya está en MI carrito
        console.log(`🔍 [addToCart] Verificando si producto ${productId} ya está en orden ${order_id}`);
        const existingInMyCart = await odooClient.searchRead(
            'sale.order.line',
            [['order_id', '=', order_id], ['product_id', '=', productId]],
            ['id']
        );

        if (existingInMyCart.length > 0) {
            console.log(`⚠️ [addToCart] Producto ${productId} ya está en el carrito`);
            return { success: false, message: 'Ya tienes este cuadro en tu carrito.' };
        }

        // 5. Añadir al carrito
        console.log(`➕ [addToCart] Creando línea de orden para producto ${productId} en orden ${order_id}`);
        try {
            const lineId = await odooClient.create('sale.order.line', {
                order_id,
                product_id: productId,
                product_uom_qty: 1,
            });
            console.log(` [addToCart] Línea creada con ID: ${lineId}`);

            // 6. Invalidar caches relevantes
            productCache.delete(productId);
            userCartCache.delete(uid);

            // 7. Mensaje según competencia
            const totalInterested = productStatus.inCarts + 1;
            const competitionMsg = productStatus.inCarts > 0 
                ? ` ⚠️ ${totalInterested} personas interesadas. ¡Completa tu compra!`
                : '';

            console.log(` Usuario ${uid} añadió producto ${productId} al carrito. Competencia: ${productStatus.inCarts}`);

            return {
                success: true,
                message: `Cuadro añadido al carrito.${competitionMsg}`,
                order_id,
                line_id: lineId
            };
        } catch (createLineError) {
            console.error(`❌ [addToCart] Error creando línea de orden:`, createLineError);
            throw createLineError;
        }

    } catch (error) {
        console.error('❌ [addToCart] Error detallado:', error);
        console.error('❌ [addToCart] Stack trace:', error.stack);
        
        // Proporcionar mensaje más específico basado en el error
        let specificMessage = 'Error al añadir al carrito';
        if (error.message) {
            if (error.message.includes('permission') || error.message.includes('access')) {
                specificMessage = 'Error de permisos al añadir al carrito';
            } else if (error.message.includes('create')) {
                specificMessage = 'Error al crear la orden de carrito';
            } else {
                specificMessage = `Error: ${error.message}`;
            }
        }
        
        return { success: false, message: specificMessage };
    }
};

//  Remover producto del carrito
export const removeFromCart = async (uid: number, lineId: number): Promise<CartOperationResult> => {
    try {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return { success: false, message: 'Usuario no encontrado' };

        const lines = await odooClient.searchRead(
            'sale.order.line',
            [['id', '=', lineId]],
            ['order_id', 'product_id']
        );

        if (lines.length === 0) {
            return { success: false, message: 'Producto no encontrado en el carrito' };
        }

        const line = lines[0];
        const orderId = line.order_id[0];
        const productId = line.product_id[0];

        // Verificar autorización
        const orders = await odooClient.searchRead(
            'sale.order',
            [['id', '=', orderId], ['partner_id', '=', partner_id], ['state', '=', 'draft']],
            ['id']
        );

        if (orders.length === 0) {
            return { success: false, message: 'No autorizado' };
        }

        // Eliminar línea
        console.log(`🗑️ Eliminando línea ${lineId} del carrito`);
        await odooClient.delete('sale.order.line', lineId);

        // Invalidar caches
        productCache.delete(productId);
        userCartCache.delete(uid);

        console.log(` Línea ${lineId} eliminada exitosamente`);
        return { success: true, message: 'Producto eliminado del carrito' };
        
    } catch (error) {
        console.error('❌ Error al eliminar del carrito:', error);
        return { success: false, message: 'Error al eliminar del carrito' };
    }
};

//  Vaciar carrito completo
export const clearCart = async (uid: number): Promise<CartOperationResult> => {
    try {
        console.log(`🗑️ [clearCart] Iniciando limpieza de carrito para usuario ${uid}`);
        
        const partner_id = await getOdooPartnerId(uid);
        console.log(`👤 [clearCart] Partner ID: ${partner_id}`);
        
        if (!partner_id) {
            console.error(`❌ [clearCart] Usuario ${uid} no tiene partner_id`);
            return { success: false, message: 'Usuario no encontrado' };
        }

        const orders = await odooClient.searchRead(
            'sale.order',
            [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
            ['id', 'name']
        );
        
        console.log(`📋 [clearCart] Órdenes encontradas: ${orders.length}`);

        if (orders.length === 0) {
            console.log(`ℹ️ [clearCart] No hay órdenes draft para el usuario`);
            return { success: true, message: 'El carrito ya está vacío' };
        }

        const orderId = orders[0].id;
        console.log(`🛒 [clearCart] Procesando orden ${orderId}`);
        
        const lines = await odooClient.searchRead(
            'sale.order.line',
            [['order_id', '=', orderId]],
            ['id', 'product_id']
        );
        
        console.log(`📄 [clearCart] Líneas encontradas: ${lines.length}`);

        if (lines.length > 0) {
            const lineIds = lines.map(line => line.id);
            const productIds = lines.map(line => line.product_id[0]);
            
            console.log(`🗑️ [clearCart] Eliminando ${lineIds.length} líneas:`, lineIds);
            
            try {
                lineIds.forEach(async (lineId) => {
                    await odooClient.delete('sale.order.line', lineId);
                })
                console.log(` [clearCart] Líneas eliminadas exitosamente`);
                
                // Invalidar caches de productos afectados
                productIds.forEach(productId => productCache.delete(productId));
            } catch (unlinkError) {
                console.error(`❌ [clearCart] Error eliminando líneas:`, unlinkError);
                throw unlinkError;
            }
        }

        userCartCache.delete(uid);
        console.log(` [clearCart] Carrito limpiado exitosamente para usuario ${uid}`);

        return { success: true, message: 'Carrito vaciado' };
        
    } catch (error) {
        console.error('❌ [clearCart] Error detallado:', error);
        console.error('❌ [clearCart] Stack trace:', error.stack);
        
        let specificMessage = 'Error al vaciar el carrito';
        if (error.message) {
            if (error.message.includes('permission') || error.message.includes('access')) {
                specificMessage = 'Error de permisos al vaciar el carrito';
            } else {
                specificMessage = `Error: ${error.message}`;
            }
        }
        
        return { success: false, message: specificMessage };
    }
};
//  Obtener carrito del usuario
export const getUserCart = async (uid: number): Promise<Cart | null> => {
    try {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return null;
        
        const orders = await odooClient.searchRead(
            'sale.order',
            [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
            ['id', 'name', 'amount_total', 'amount_tax', 'amount_untaxed', 'access_url']
        );

        if (orders.length === 0) return null;

        const order = orders[0];
        const lines = await odooClient.searchRead(
            'sale.order.line',
            [['order_id', '=', order.id]],
            ['product_id', 'display_name', 'product_uom_qty', 'price_unit', 'price_subtotal']
        );
        
        // Enriquecer líneas con información de disponibilidad
        const enrichedLines = await Promise.all(lines.map(async (line) => {
            const productId = line.product_id[0];
            const isSold = await isProductSold(productId);
            
            return {
                ...line,
                is_sold: isSold,
                status: isSold ? 'VENDIDO' : 'DISPONIBLE'
            };
        }));

        return {
            order,
            lines: enrichedLines,
        };
    } catch (error) {
        console.error('❌ Error obteniendo carrito:', error);
        return null;
    }
};

//  Buscar usuario por email
export const findUserbyEmail = async (email: string) => {
    try {
        const users = await odooClient.searchRead(
            'res.users',
            [['email', '=', email]],
            ['id']
        );
        return users.length > 0 ? users : null;
    } catch (error) {
        console.error('❌ Error buscando usuario por email:', error);
        return null;
    }
};

//  Crear cliente de usuario
export const createUserClient = async (username: string, password: string) => {
    try {
        const config = {
            url: process.env.ODOO_URL,
            db: process.env.ODOO_DB,
            username,
            password,
            port: Number(process.env.ODOO_PORT),
        };
        const client = new OdooJSONRpc(config);
        return client;
    } catch (error) {
        console.error('❌ Error creando cliente de usuario:', error);
        return null;
    }
};

//  Obtener productos vendidos
export const getSoldProducts = async (): Promise<number[]> => {
    try {
        console.log('🔍 Consultando productos vendidos...');
        
        const soldOrderLines = await odooClient.searchRead(
            'sale.order.line',
            [
                ['order_id.state', 'in', ['sale', 'done']]
            ],
            ['product_id']
        );
        
        const soldProductIds = [...new Set(
            soldOrderLines
                .map(line => line.product_id[0])
                .filter(id => id)
        )];
        
        console.log(` Encontrados ${soldProductIds.length} productos vendidos`);
        return soldProductIds as number[];
        
    } catch (error) {
        console.error('❌ Error consultando productos vendidos:', error);
        return [];
    }
};

//  Verificar si un producto está vendido
export const isProductSold = async (productId: number): Promise<boolean> => {
    try {
        const soldOrderLines = await odooClient.searchRead(
            'sale.order.line',
            [
                ['product_id', '=', productId],
                ['order_id.state', 'in', ['sale', 'done']]
            ],
            ['id']
        );
        
        const isSold = soldOrderLines.length > 0;
        console.log(`🔍 Producto ${productId} ${isSold ? 'ESTÁ' : 'NO está'} vendido`);
        return isSold;
        
    } catch (error) {
        console.error(`❌ Error verificando si producto ${productId} está vendido:`, error);
        return false;
    }
};

//  Función para obtener estadísticas del cache (debugging)
export const getCacheStats = () => {
    return {
        environment: process.env.NODE_ENV || 'development',
        config: getConfig(),
        productCache: {
            size: productCache.size,
            max: productCache.max,
            calculatedSize: productCache.calculatedSize
        },
        userCartCache: {
            size: userCartCache.size,
            max: userCartCache.max,
            calculatedSize: userCartCache.calculatedSize
        }
    };
};

//  Buscar productos por nombre (filtrados por vendidos)
export const searchProducts = async (searchTerm: string) => {
    try {
        console.log(`🔍 Buscando productos con término: "${searchTerm}"`);
        
        // Buscar productos cuyo nombre contenga el término de búsqueda (case insensitive)
        const productsData = await odooClient.searchRead(
            'product.product',
            [['name', 'ilike', searchTerm]], // 'ilike' es case-insensitive en Odoo
            ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512']
        );
        
        // Filtrar productos vendidos
        const soldProductIds = await getSoldProducts();
        const availableProducts = productsData.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        console.log(`🔍 Búsqueda "${searchTerm}": ${productsData.length} encontrados, ${availableProducts.length} disponibles, ${productsData.length - availableProducts.length} vendidos`);
        
        return availableProducts;
        
    } catch (error) {
        console.error('❌ Error al buscar productos:', error);
        return [];
    }
};

export const getRelatedProducts = async (productId: string, limit: number = 4) => {
    try {
        console.log(`🔍 Buscando productos relacionados para ID: ${productId}`);
        
        // 1. Obtener el producto base
        const baseProducts = await getProductById(productId);
        if (!baseProducts || baseProducts.length === 0) {
            console.log('❌ Producto base no encontrado');
            return [];
        }
        
        const baseProduct = baseProducts[0];
        console.log(`📦 Producto base: ${baseProduct.name}`);
        
        let relatedProducts = [];
        
        // 2. Si el producto tiene atributos (estilo, medidas), buscar por similitud
        if (baseProduct.attributes && baseProduct.attributes.length > 0) {
            console.log(`🎨 Buscando por atributos similares...`);
            
            // Obtener IDs de valores de atributos del producto base
            const baseAttributeValues = baseProduct.attributes.flatMap(attr => 
                attr.values.map(val => val.id)
            );
            
            if (baseAttributeValues.length > 0) {
                // Buscar productos con atributos similares
                const templateId = baseProduct.product_tmpl_id[0];
                
                // Buscar otras variantes de la misma plantilla o plantillas con atributos similares
                const relatedTemplateLines = await odooClient.searchRead(
                    'product.template.attribute.line',
                    [['value_ids', 'in', baseAttributeValues]],
                    ['product_tmpl_id']
                );
                
                const relatedTemplateIds = [...new Set(
                    relatedTemplateLines
                        .map(line => line.product_tmpl_id[0])
                        .filter(id => id !== templateId) // Excluir la plantilla del producto actual
                )];
                
                if (relatedTemplateIds.length > 0) {
                    relatedProducts = await odooClient.searchRead(
                        'product.product',
                        [
                            ['product_tmpl_id', 'in', relatedTemplateIds],
                            ['id', '!=', parseInt(productId)] // Excluir el producto actual
                        ],
                        ['id', 'name', 'list_price', 'image_512'],
                        0, // offset
                        limit + 2 // obtener algunos extras por si algunos están vendidos
                    );
                }
            }
        }
        
        // 3. Si no encontramos suficientes por atributos, buscar por categoría
        if (relatedProducts.length < limit && baseProduct.categ_id) {
            console.log(`📂 Complementando con productos de la misma categoría...`);
            
            const categoryId = baseProduct.categ_id[0];
            const categoryProducts = await odooClient.searchRead(
                'product.product',
                [
                    ['categ_id', '=', categoryId],
                    ['id', '!=', parseInt(productId)]
                ],
                ['id', 'name', 'list_price', 'image_512'],
                0,
                limit + 2
            );
            
            // Combinar resultados, evitando duplicados
            const existingIds = new Set(relatedProducts.map(p => p.id));
            const additionalProducts = categoryProducts.filter(p => !existingIds.has(p.id));
            relatedProducts = [...relatedProducts, ...additionalProducts];
        }
        
        // 4. Filtrar productos vendidos
        const soldProductIds = await getSoldProducts();
        const availableRelatedProducts = relatedProducts.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        // 5. Limitar resultados
        const finalResults = availableRelatedProducts.slice(0, limit);
        
        console.log(` Encontrados ${finalResults.length} productos relacionados disponibles`);
        return finalResults;
        
    } catch (error) {
        console.error('❌ Error obteniendo productos relacionados:', error);
        return [];
    }
};


// Actualizar producto
export const updateProduct = async (productId: number, updateData: any) => {
    try {
        console.log(`✏️ [updateProduct] Actualizando producto ${productId} con datos:`, updateData);
        
        // Verificar que el producto existe
        const existingProduct = await odooClient.searchRead(
            'product.product',
            [['id', '=', productId]],
            ['id', 'name', 'product_tmpl_id']
        );
        
        if (existingProduct.length === 0) {
            console.error(`❌ [updateProduct] Producto ${productId} no encontrado`);
            return {
                success: false,
                message: 'Producto no encontrado',
                product_id: null,
                product: null
            };
        }
        
        const product = existingProduct[0];
        const templateId = product.product_tmpl_id[0];
        
        // Preparar datos para actualizar
        const productUpdateData: any = {};
        const templateUpdateData: any = {};
        
        // Campos que van en product.product
        if (updateData.name !== undefined) {
            productUpdateData.name = updateData.name;
            templateUpdateData.name = updateData.name; // También actualizar en template
        }
        
        // Campos que van en product.template
        if (updateData.list_price !== undefined) {
            templateUpdateData.list_price = updateData.list_price;
        }
        if (updateData.image_1920 !== undefined) {
            templateUpdateData.image_1920 = updateData.image_1920;
        }
        if (updateData.x_featured !== undefined) {
            templateUpdateData.x_featured = updateData.x_featured;
        }
        
        // Actualizar product.template
        if (Object.keys(templateUpdateData).length > 0) {
            console.log(`🔄 [updateProduct] Actualizando template ${templateId}:`, templateUpdateData);
            await odooClient.create('product.template', [templateId], templateUpdateData);
        }
        
        // Actualizar product.product si hay datos
        if (Object.keys(productUpdateData).length > 0) {
            console.log(`🔄 [updateProduct] Actualizando producto ${productId}:`, productUpdateData);
            await odooClient.create('product.product', [productId], productUpdateData);
        }
        
        // Invalidar cache
        productCache.delete(productId);
        
        // Obtener el producto actualizado
        const updatedProduct = await getProductById(productId.toString());
        
        console.log(`✅ [updateProduct] Producto ${productId} actualizado exitosamente`);
        
        return {
            success: true,
            message: 'Producto actualizado correctamente',
            product_id: productId,
            product: updatedProduct ? updatedProduct[0] : null
        };
        
    } catch (error) {
        console.error('❌ [updateProduct] Error actualizando producto:', error);
        return {
            success: false,
            message: `Error al actualizar producto: ${error.message}`,
            product_id: null,
            product: null
        };
    }
};

// Crear producto nuevo
export const createProduct = async (productData: any) => {
    try {
        console.log(`➕ [createProduct] Creando nuevo producto con datos:`, productData);
        
        // Validaciones básicas
        if (!productData.name || productData.list_price === undefined) {
            return {
                success: false,
                message: 'Nombre y precio son requeridos',
                product_id: null,
                product: null
            };
        }
        
        // Preparar datos para product.template (el producto base)
        const templateData: any = {
            name: productData.name,
            list_price: productData.list_price,
            type: productData.type || 'consu', // Producto consumible por defecto
            sale_ok: productData.sale_ok !== undefined ? productData.sale_ok : true,
        };
        
        // Campos opcionales
        if (productData.image_1920) {
            templateData.image_1920 = productData.image_1920;
        }
        if (productData.x_featured !== undefined) {
            templateData.x_featured = productData.x_featured;
        }
        if (productData.categ_id) {
            templateData.categ_id = productData.categ_id;
        }
        
        console.log(`🛠️ [createProduct] Creando product.template:`, templateData);
        
        // Crear el product.template
        const templateId = await odooClient.create('product.template', templateData);
        console.log(`✅ [createProduct] Template creado con ID: ${templateId}`);
        
        // Odoo automáticamente crea una variante (product.product) cuando se crea un template
        // Buscar la variante creada
        const variants = await odooClient.searchRead(
            'product.product',
            [['product_tmpl_id', '=', templateId]],
            ['id']
        );
        
        if (variants.length === 0) {
            console.error(`❌ [createProduct] No se encontró variante para template ${templateId}`);
            return {
                success: false,
                message: 'Error: No se creó la variante del producto',
                product_id: null,
                product: null
            };
        }
        
        const productId = variants[0].id;
        console.log(`✅ [createProduct] Variante creada con ID: ${productId}`);
        
        // Obtener el producto completo creado
        const createdProduct = await getProductById(productId.toString());
        
        console.log(`🎉 [createProduct] Producto creado exitosamente con ID: ${productId}`);
        
        return {
            success: true,
            message: 'Producto creado correctamente',
            product_id: productId,
            product: createdProduct ? createdProduct[0] : null
        };
        
    } catch (error) {
        console.error('❌ [createProduct] Error creando producto:', error);
        
        let errorMessage = 'Error al crear producto';
        if (error.message) {
            if (error.message.includes('duplicate') || error.message.includes('unique')) {
                errorMessage = 'Ya existe un producto con ese nombre';
            } else if (error.message.includes('permission') || error.message.includes('access')) {
                errorMessage = 'Sin permisos para crear productos';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
        }
        
        return {
            success: false,
            message: errorMessage,
            product_id: null,
            product: null
        };
    }
};

export const deleteProduct = async (id: number) => {
    try {
        console.log(`🗑️ [deleteProduct] Eliminando producto ${id}`);
        
        // Verificar que el producto existe
        const existingProduct = await odooClient.searchRead(
            'product.product',
            [['id', '=', id]],
            ['id', 'name', 'product_tmpl_id']
        );
        
        if (existingProduct.length === 0) {
            console.error(`❌ [deleteProduct] Producto ${id} no encontrado`);
            return {
                success: false,
                message: 'Producto no encontrado',
                product_id: null
            };
        }
        
        const product = existingProduct[0];
        const templateId = product.product_tmpl_id[0];
        
        console.log(`🔍 [deleteProduct] Producto encontrado: ${product.name}, Template ID: ${templateId}`);
        
        // Verificar si el producto está en algún carrito o ha sido vendido
        const inCartLines = await odooClient.searchRead(
            'sale.order.line',
            [['product_id', '=', id]],
            ['id', 'order_id']
        );
        
        if (inCartLines.length > 0) {
            console.warn(`⚠️ [deleteProduct] Producto ${id} tiene ${inCartLines.length} líneas de venta asociadas`);
            return {
                success: false,
                message: 'No se puede eliminar: el producto tiene órdenes de venta asociadas',
                product_id: id
            };
        }
        
        // Verificar si hay otras variantes del mismo template
        const otherVariants = await odooClient.searchRead(
            'product.product',
            [['product_tmpl_id', '=', templateId], ['id', '!=', id]],
            ['id']
        );
        
        console.log(`🔍 [deleteProduct] Otras variantes del template: ${otherVariants.length}`);
        
        // Eliminar el producto (variante)
        console.log(`🗑️ [deleteProduct] Eliminando product.product ${id}`);
        await odooClient.delete('product.product', id);
        
        // Solo eliminar el template si no hay otras variantes
        if (otherVariants.length === 0) {
            console.log(`🗑️ [deleteProduct] Eliminando product.template ${templateId} (no hay otras variantes)`);
            await odooClient.delete('product.template', templateId);
        } else {
            console.log(`ℹ️ [deleteProduct] Manteniendo product.template ${templateId} (tiene otras variantes)`);
        }
        
        // Invalidar cache
        productCache.delete(id);
        
        console.log(`✅ [deleteProduct] Producto ${id} eliminado exitosamente`);
        
        return {
            success: true,
            message: 'Producto eliminado correctamente',
            product_id: id
        };
        
    } catch (error) {
        console.error('❌ [deleteProduct] Error eliminando producto:', error);
        
        let errorMessage = 'Error al eliminar producto';
        if (error.message) {
            if (error.message.includes('foreign key') || error.message.includes('constraint')) {
                errorMessage = 'No se puede eliminar: el producto tiene datos relacionados';
            } else if (error.message.includes('permission') || error.message.includes('access')) {
                errorMessage = 'Sin permisos para eliminar productos';
            } else {
                errorMessage = `Error: ${error.message}`;
            }
        }
        
        return {
            success: false,
            message: errorMessage,
            product_id: id
        };
    }
};

export { odooClient };