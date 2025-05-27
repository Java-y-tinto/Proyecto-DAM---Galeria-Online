// @ts-ignore
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
dotenv.config();
const OdooJSONRpc = OdooModule.default || OdooModule;
const odooConfig = {
    baseUrl: process.env.ODOO_BASE_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    apiKey: process.env.ODOO_API_KEY,
    port: Number(process.env.ODOO_PORT),
};
const odooClient = new OdooJSONRpc({
    baseUrl: process.env.ODOO_BASE_URL,
    port: Number(process.env.ODOO_PORT),
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USERNAME,
    apiKey: process.env.ODOO_API_KEY,
});
export const connectOdoo = async () => {
    try {
        console.log('Intentando conectar a Odoo...');
        // Busca el método correcto en la documentación de la librería:
        // await odooClient.connect();
        // o await odooClient.authenticate();
        // o podría ser implícito si las credenciales son correctas...
        // Si la librería NO requiere conexión explícita y este error
        // aparece, entonces el problema son las credenciales (paso 2).
        // Intenta una operación simple para verificar la conexión:
        const versionInfo = await odooClient;
        console.log('Conexión a Odoo exitosa. Versión:', versionInfo);
    }
    catch (error) {
        console.error('ERROR al conectar/autenticar con Odoo:', error);
        // Si falla aquí, el servidor no debería continuar o las queries fallarán.
        // Podrías lanzar el error para detener el inicio del servidor:
        // throw new Error('No se pudo conectar a Odoo.');
    }
};
export const getProducts = async () => {
    try {
        // Obtener todos los productos
        const productsData = await odooClient.searchRead('product.product', [], ['id', 'name', 'description_sale', 'list_price', 'image_1920']);
        // Obtener IDs de productos vendidos
        const soldProductIds = await getSoldProducts();
        // Filtrar productos vendidos
        const availableProducts = productsData.filter(product => !soldProductIds.includes(product.id));
        console.log(`📦 Total productos: ${productsData.length}, Disponibles: ${availableProducts.length}, Vendidos: ${soldProductIds.length}`);
        return availableProducts;
    }
    catch (error) {
        console.log(error);
    }
};
export const getProductById = async (id) => {
    try {
        console.log(`Resolver: Buscando producto con ID: ${id}`);
        // Primero verificar si el producto está vendido
        const productIdNumber = parseInt(id);
        const isSold = await isProductSold(productIdNumber);
        if (isSold) {
            console.log(`❌ Producto ${id} está vendido - no disponible`);
            return null; // Producto vendido, no mostrar
        }
        // Si no está vendido, obtener la información completa
        const products = await odooClient.searchRead('product.product', [['id', '=', id]], ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512', 'product_tmpl_id']);
        if (!products || products.length === 0) {
            console.log(`❌ Producto ${id} no encontrado`);
            return null;
        }
        const product = products[0];
        console.log(`✅ Producto ${id} disponible:`, product.name);
        // Obtener los atributos del producto (código existente)
        if (product.product_tmpl_id) {
            const templateId = product.product_tmpl_id[0];
            const attributeLines = await odooClient.searchRead('product.template.attribute.line', [['product_tmpl_id', '=', templateId]], ['attribute_id', 'value_ids']);
            let attributes = [];
            for (const line of attributeLines) {
                const attributeId = line.attribute_id[0];
                const attributeDetails = await odooClient.searchRead('product.attribute', [['id', '=', attributeId]], ['name', 'display_type']);
                const valueIds = line.value_ids;
                const attributeValues = await odooClient.searchRead('product.attribute.value', [['id', 'in', valueIds]], ['name', 'html_color']);
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
            const variantAttributeValues = await odooClient.searchRead('product.template.attribute.value', [['product_tmpl_id', '=', templateId]], ['product_attribute_value_id', 'price_extra']);
            product.variant_attributes = variantAttributeValues;
        }
        return [product];
    }
    catch (error) {
        console.error("Error en getProductById:", error);
        throw error;
    }
};
export const getProductsByCategory = async (categoryName) => {
    try {
        const category = await odooClient.searchRead('product.category', [['name', '=', categoryName]], ['id']);
        if (category.length === 0)
            return [];
        const categoryId = category[0].id;
        // Obtener todos los productos de la categoría
        const products = await odooClient.searchRead('product.product', [['categ_id', '=', categoryId]], ['name', 'list_price', 'categ_id', 'image_1920', 'image_512']);
        // Obtener IDs de productos vendidos
        const soldProductIds = await getSoldProducts();
        // Filtrar productos vendidos
        const availableProducts = products.filter(product => !soldProductIds.includes(product.id));
        console.log(`📂 Categoría "${categoryName}": ${products.length} total, ${availableProducts.length} disponibles`);
        return availableProducts;
    }
    catch (error) {
        console.error("Error en getProductsByCategory:", error);
        return [];
    }
};
export const createUserClient = async (username, password) => {
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
    }
    catch (error) {
        console.log(error);
    }
};
export const findUserbyEmail = async (email) => {
    try {
        const users = await odooClient.searchRead('res.users', [['email', '=', email]], ['id']);
        return users.length > 0 ? users : null;
    }
    catch (error) {
        console.log(error);
    }
};
export const getUserCart = async (uid) => {
    const partner_id = await getOdooPartnerId(uid);
    if (!partner_id)
        return null;
    const orders = await odooClient.searchRead('sale.order', [['state', '=', 'draft'], ['partner_id', '=', partner_id]], ['id', 'name', 'amount_total', 'amount_tax', 'amount_untaxed', 'access_url']);
    if (orders.length === 0)
        return null;
    const order = orders[0];
    const lines = await odooClient.searchRead('sale.order.line', [['order_id', '=', order.id]], ['product_id', 'display_name', 'product_uom_qty', 'price_unit', 'price_subtotal']);
    return {
        order,
        lines,
    };
};
export const getOdooPartnerId = async (uid) => {
    const user = await odooClient.searchRead('res.users', [['id', '=', uid]], ['partner_id']);
    if (user.length > 0) {
        return user[0].partner_id[0];
    }
    return null;
};
export const addToCart = async (uid, productId) => {
    try {
        // obtener partner id del usuario
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id)
            return { success: false, message: 'Usuario no encontrado' };
        // Buscar si ya hay un carrito creado
        const orders = await odooClient.searchRead('sale.order', [['state', '=', 'draft'], ['partner_id', '=', partner_id]], ['id']);
        let order_id;
        // Si no hay carrito, creamos uno
        if (orders.length === 0) {
            order_id = await odooClient.create('sale.order', {
                partner_id,
                state: 'draft',
            });
        }
        else {
            order_id = orders[0].id;
        }
        // Verificar si el producto ya está en el carrito
        const existingLines = await odooClient.searchRead('sale.order.line', [['order_id', '=', order_id], ['product_id', '=', productId]], ['id']);
        if (existingLines.length > 0) {
            return {
                success: false,
                message: 'Este cuadro ya está en tu carrito. Solo hay uno disponible.'
            };
        }
        // Crear línea en el carrito (cantidad siempre 1 para cuadros únicos)
        const lineId = await odooClient.create('sale.order.line', {
            order_id,
            product_id: productId,
            product_uom_qty: 1, // Siempre 1 porque solo hay un cuadro de cada tipo
        });
        return {
            success: true,
            message: 'Cuadro añadido al carrito',
            order_id,
            line_id: lineId
        };
    }
    catch (error) {
        console.error('Error al añadir al carrito:', error);
        return { success: false, message: 'Error al añadir al carrito' };
    }
};
export const removeFromCart = async (uid, lineId) => {
    try {
        // Verificar que la línea pertenece al usuario
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id)
            return { success: false, message: 'Usuario no encontrado' };
        // Verificar que la línea existe y pertenece a un pedido del usuario
        const lines = await odooClient.searchRead('sale.order.line', [['id', '=', lineId]], ['order_id']);
        if (lines.length === 0) {
            return { success: false, message: 'Producto no encontrado en el carrito' };
        }
        const orderId = lines[0].order_id[0];
        // Verificar que el pedido pertenece al usuario
        const orders = await odooClient.searchRead('sale.order', [['id', '=', orderId], ['partner_id', '=', partner_id], ['state', '=', 'draft']], ['id']);
        if (orders.length === 0) {
            return { success: false, message: 'No autorizado' };
        }
        console.log('[removeFromCart] Eliminando línea con delete...');
        await odooClient.delete('sale.order.line', lineId);
        console.log('[removeFromCart] Línea eliminada exitosamente');
        return { success: true, message: 'Producto eliminado del carrito' };
    }
    catch (error) {
        console.error('Error al eliminar del carrito:', error);
        return { success: false, message: 'Error al eliminar del carrito' };
    }
};
// DELETE - Vaciar todo el carrito
export const clearCart = async (uid) => {
    try {
        const partner_id = await getOdooPartnerId(uid);
        if (!partner_id)
            return { success: false, message: 'Usuario no encontrado' };
        // Buscar el carrito activo
        const orders = await odooClient.searchRead('sale.order', [['state', '=', 'draft'], ['partner_id', '=', partner_id]], ['id']);
        if (orders.length === 0) {
            return { success: true, message: 'El carrito ya está vacío' };
        }
        const orderId = orders[0].id;
        // Obtener todas las líneas del pedido
        const lines = await odooClient.searchRead('sale.order.line', [['order_id', '=', orderId]], ['id']);
        if (lines.length > 0) {
            // Eliminar todas las líneas
            const lineIds = lines.map(line => line.id);
            await odooClient.unlink('sale.order.line', lineIds);
        }
        // Opcionalmente, también podrías eliminar el pedido completo
        // await odooClient.unlink('sale.order', [orderId]);
        return { success: true, message: 'Carrito vaciado' };
    }
    catch (error) {
        console.error('Error al vaciar el carrito:', error);
        return { success: false, message: 'Error al vaciar el carrito' };
    }
};
export const getSoldProducts = async () => {
    try {
        console.log('🔍 Consultando productos vendidos...');
        // Buscar líneas de órdenes de venta confirmadas (state = 'sale' o 'done')
        const soldOrderLines = await odooClient.searchRead('sale.order.line', [
            ['order_id.state', 'in', ['sale', 'done']] // Órdenes confirmadas o entregadas
        ], ['product_id']);
        // Extraer IDs únicos de productos vendidos
        const soldProductIds = [...new Set(soldOrderLines
                .map(line => line.product_id[0]) // product_id viene como [id, name]
                .filter(id => id) // Filtrar nulls/undefined
            )];
        console.log(`✅ Encontrados ${soldProductIds.length} productos vendidos:`, soldProductIds);
        for (const productId of soldProductIds) {
            console.log(`- ${productId}`);
        }
        return soldProductIds;
    }
    catch (error) {
        console.error('❌ Error consultando productos vendidos:', error);
        return [];
    }
};
export const isProductSold = async (productId) => {
    try {
        const soldOrderLines = await odooClient.searchRead('sale.order.line', [
            ['product_id', '=', productId],
            ['order_id.state', 'in', ['sale', 'done']]
        ], ['id']);
        const isSold = soldOrderLines.length > 0;
        console.log(`🔍 Producto ${productId} ${isSold ? 'ESTÁ' : 'NO está'} vendido`);
        return isSold;
    }
    catch (error) {
        console.error(`❌ Error verificando si producto ${productId} está vendido:`, error);
        return false;
    }
};
export { odooClient };
