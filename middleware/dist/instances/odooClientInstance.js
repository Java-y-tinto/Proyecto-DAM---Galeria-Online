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
        const productsData = await odooClient.searchRead('product.product', [], ['id', 'name', 'description_sale', 'list_price', 'image_1920']);
        return productsData;
    }
    catch (error) {
        console.log(error);
    }
};
export const getProductById = async (id) => {
    try {
        // Obtener el producto básico
        const products = await odooClient.searchRead('product.product', [['id', '=', id]], ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512', 'product_tmpl_id']);
        if (!products || products.length === 0) {
            return null;
        }
        const product = products[0];
        // Obtener los atributos del producto
        if (product.product_tmpl_id) {
            const templateId = product.product_tmpl_id[0]; // Odoo devuelve [id, name]
            // Obtener líneas de atributos de la plantilla
            const attributeLines = await odooClient.searchRead('product.template.attribute.line', [['product_tmpl_id', '=', templateId]], ['attribute_id', 'value_ids']);
            // Obtener información de atributos y valores
            let attributes = [];
            for (const line of attributeLines) {
                const attributeId = line.attribute_id[0];
                // Obtener detalles del atributo
                const attributeDetails = await odooClient.searchRead('product.attribute', [['id', '=', attributeId]], ['name', 'display_type']);
                // Obtener valores del atributo
                const valueIds = line.value_ids;
                const attributeValues = await odooClient.searchRead('product.attribute.value', [['id', 'in', valueIds]], ['name', 'html_color']);
                // Añadir a la lista de atributos
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
            // Añadir atributos al producto
            product.attributes = attributes;
            // Obtener los valores específicos de esta variante
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
    const category = await odooClient.searchRead('product.category', [['name', '=', categoryName]], ['id']);
    if (category.length === 0)
        return [];
    const categoryId = category[0].id;
    console.log(categoryId);
    /*
    
    */
    return odooClient.searchRead('product.product', [['categ_id', '=', categoryId]], ['name', 'list_price', 'categ_id', 'image_1920', 'image_512']);
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
        return users;
    }
    catch (error) {
        console.log(error);
    }
};
export { odooClient };
