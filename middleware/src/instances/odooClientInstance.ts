// @ts-ignore
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import { LRUCache } from 'lru-cache';
import dotenv from 'dotenv';

dotenv.config();
const OdooJSONRpc = (OdooModule as any).default || OdooModule;

// ✅ Interfaces
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

// ✅ Configuración escalable por entorno
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


const odooClient = new OdooJSONRpc({
    baseUrl: process.env.ODOO_BASE_URL,
    port: Number(process.env.ODOO_PORT),
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    apiKey: process.env.ODOO_API_KEY,
});




// ✅ Conexión a Odoo
export const connectOdoo = async () => {
    try {
        
        const versionInfo = await odooClient;
        
    } catch (error) {
        
    }
};

// ✅ Función para obtener estado del producto (con cache)
const getProductStatus = async (productId: number) => {
    let status = productCache.get(productId);
    
    if (!status) {
        
        
        const [isSold, inCartsCount] = await Promise.all([
            isProductSold(productId),
            getProductInCartsCount(productId)
        ]);
        
        status = { inCarts: inCartsCount, isSold };
        productCache.set(productId, status);
        
        
    }
    
    return status;
};

// ✅ Función para contar items en carrito de usuario (con cache)
const getUserCartCount = async (uid: number): Promise<number> => {
    let count = userCartCache.get(uid);
    
    if (count === undefined) {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return 0;

        count = await odooClient.searchCount(
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

// ✅ Función para contar productos en carritos
const getProductInCartsCount = async (productId: number): Promise<number> => {
    try {
        return await odooClient.searchCount(
            'sale.order.line',
            [
                ['product_id', '=', productId],
                ['order_id.state', '=', 'draft']
            ]
        ) || 0;
    } catch (error) {
        
        return 0;
    }
};

// ✅ Obtener todos los productos (filtrados por vendidos)
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
        
        
        
        return availableProducts;
    } catch (error) {
        
        return [];
    }
};

// ✅ Obtener producto por ID (con verificación de vendido)
export const getProductById = async (id: string) => {
    try {
        
        
        const productIdNumber = parseInt(id);
        const isSold = await isProductSold(productIdNumber);
        
        if (isSold) {
            
            return null;
        }
        
        const products = await odooClient.searchRead(
            'product.product',
            [['id', '=', id]],
            ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512', 'product_tmpl_id']
        );
        
        if (!products || products.length === 0) {
            
            return null;
        }
        
        const product = products[0];
        
        
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
        
        throw error;
    }
};

// ✅ Obtener productos por categoría (filtrados por vendidos)
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
        
        
        
        return availableProducts;
        
    } catch (error) {
        
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
        
        return [];
    }
}
// ✅ Obtener productos más nuevos (por fecha de creación, excluyendo los vendidos)
export const getNewestProducts = async () => {
    try {
        
        
        const products = await odooClient.searchRead(
            'product.product',
            [], // Sin filtros específicos, queremos todos los productos
            ['id', 'name', 'list_price', 'image_1920', 'image_512', 'categ_id', 'create_date'],
            0, // offset
            20, // límite mayor por si algunos están vendidos
            'create_date DESC' // ordenar por fecha de creación descendente (más nuevos primero)
        );
        
        const soldProductIds = await getSoldProducts();
        const availableProducts = products.filter(product => 
            !soldProductIds.includes(product.id)
        );
        
        // Limitar a los 8 más nuevos
        const newestProducts = availableProducts.slice(0, 8);
        
        if (newestProducts.length === 0) {
            
            return [];
        }
        
        // Obtener todas las categorías únicas de los productos obtenidos
        const categoryIds = new Set(
            newestProducts
                .map(product => product.categ_id ? product.categ_id[0] : null)
                .filter(id => id !== null)
        );

        // Traer todas las categorías de producto
        const categories = await odooClient.searchRead(
            'product.category',
            [['id', 'in', [...categoryIds]]],
            ['id', 'name']
        );

        // Crear un Map ID/Nombre para búsqueda rápida
        const categoryMap = new Map();
        categories.forEach(category => {
            categoryMap.set(category.id, category.name);
        });
        
        // Añadir categorías a productos
        const enrichedProducts = newestProducts.map(product => ({
            ...product,
            category: product.categ_id 
                ? categoryMap.get(product.categ_id[0]) || 'Sin categoría'
                : 'Sin categoría'
        }));

        
        
        
        return enrichedProducts;
    } catch (error) {
        
        return [];
    }
};

// ✅ Obtener partner ID de un usuario
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
        
        return null;
    }
};

// ✅ Añadir producto al carrito (con control de concurrencia)
export const addToCart = async (uid: number, productId: number): Promise<CartOperationResult> => {
    try {
        const config = getConfig();
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return { success: false, message: 'Usuario no encontrado' };

        // 1. Verificar límite de productos por usuario
        const userCartCount = await getUserCartCount(uid);
        if (userCartCount >= config.MAX_PRODUCTS_PER_USER) {
            return {
                success: false,
                message: `Límite alcanzado (${config.MAX_PRODUCTS_PER_USER} productos máximo)`
            };
        }

        // 2. Verificar disponibilidad del producto
        const productStatus = await getProductStatus(productId);
        
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
        const orders = await odooClient.searchRead(
            'sale.order',
            [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
            ['id']
        );

        let order_id: number;
        if (orders.length === 0) {
            order_id = await odooClient.create('sale.order', {
                partner_id,
                state: 'draft',
            });
        } else {
            order_id = orders[0].id;
        }

        // 4. Verificar si ya está en MI carrito
        const existingInMyCart = await odooClient.searchRead(
            'sale.order.line',
            [['order_id', '=', order_id], ['product_id', '=', productId]],
            ['id']
        );

        if (existingInMyCart.length > 0) {
            return { success: false, message: 'Ya tienes este cuadro en tu carrito.' };
        }

        // 5. Añadir al carrito
        const lineId = await odooClient.create('sale.order.line', {
            order_id,
            product_id: productId,
            product_uom_qty: 1,
        });

        // 6. Invalidar caches relevantes
        productCache.delete(productId);
        userCartCache.delete(uid);

        // 7. Mensaje según competencia
        const totalInterested = productStatus.inCarts + 1;
        const competitionMsg = productStatus.inCarts > 0 
            ? ` ⚠️ ${totalInterested} personas interesadas. ¡Completa tu compra!`
            : '';

        

        return {
            success: true,
            message: `Cuadro añadido al carrito.${competitionMsg}`,
            order_id,
            line_id: lineId
        };

    } catch (error) {
        
        return { success: false, message: 'Error al añadir al carrito' };
    }
};

// ✅ Remover producto del carrito
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
        
        await odooClient.delete('sale.order.line', lineId);

        // Invalidar caches
        productCache.delete(productId);
        userCartCache.delete(uid);

        
        return { success: true, message: 'Producto eliminado del carrito' };
        
    } catch (error) {
        
        return { success: false, message: 'Error al eliminar del carrito' };
    }
};

// ✅ Vaciar carrito completo
export const clearCart = async (uid: number): Promise<CartOperationResult> => {
    try {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id) return { success: false, message: 'Usuario no encontrado' };

        const orders = await odooClient.searchRead(
            'sale.order',
            [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
            ['id']
        );

        if (orders.length === 0) {
            return { success: true, message: 'El carrito ya está vacío' };
        }

        const orderId = orders[0].id;
        const lines = await odooClient.searchRead(
            'sale.order.line',
            [['order_id', '=', orderId]],
            ['id', 'product_id']
        );

        if (lines.length > 0) {
            const lineIds = lines.map(line => line.id);
            const productIds = lines.map(line => line.product_id[0]);
            
            await odooClient.unlink('sale.order.line', lineIds);
            
            // Invalidar caches de productos afectados
            productIds.forEach(productId => productCache.delete(productId));
        }

        userCartCache.delete(uid);

        return { success: true, message: 'Carrito vaciado' };
    } catch (error) {
        
        return { success: false, message: 'Error al vaciar el carrito' };
    }
};

// ✅ Obtener carrito del usuario
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
        
        return null;
    }
};

// ✅ Buscar usuario por email
export const findUserbyEmail = async (email: string) => {
    try {
        const users = await odooClient.searchRead(
            'res.users',
            [['email', '=', email]],
            ['id']
        );
        return users.length > 0 ? users : null;
    } catch (error) {
        
        return null;
    }
};

// ✅ Crear cliente de usuario
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
        
        return null;
    }
};

// ✅ Obtener productos vendidos
export const getSoldProducts = async (): Promise<number[]> => {
    try {
        
        
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
        
        
        return soldProductIds as number[];
        
    } catch (error) {
        
        return [];
    }
};

// ✅ Verificar si un producto está vendido
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
        
        return isSold;
        
    } catch (error) {
        
        return false;
    }
};

// ✅ Función para obtener estadísticas del cache (debugging)
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

// ✅ Buscar productos por nombre (filtrados por vendidos)
export const searchProducts = async (searchTerm: string) => {
    try {
        
        
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
        
        
        
        return availableProducts;
        
    } catch (error) {
        
        return [];
    }
};

export const getRelatedProducts = async (productId: string, limit: number = 4) => {
    try {
        
        
        // 1. Obtener el producto base
        const baseProducts = await getProductById(productId);
        if (!baseProducts || baseProducts.length === 0) {
            
            return [];
        }
        
        const baseProduct = baseProducts[0];
        
        
        let relatedProducts = [];
        
        // 2. Si el producto tiene atributos (estilo, medidas), buscar por similitud
        if (baseProduct.attributes && baseProduct.attributes.length > 0) {
            
            
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
        
        
        return finalResults;
        
    } catch (error) {
        
        return [];
    }
};
export { odooClient };