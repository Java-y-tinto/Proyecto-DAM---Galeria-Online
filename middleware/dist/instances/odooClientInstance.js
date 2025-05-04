import OdooJSONRpc from "@fernandoslim/odoo-jsonrpc";
const odooConfig = {
    url: process.env.ODOO_URL,
    db: process.env.ODOO_DB,
    username: process.env.ODOO_USER,
    apiKey: process.env.ODOO_API_KEY,
    port: Number(process.env.ODOO_PORT),
};
const odooClient = new OdooJSONRpc(odooConfig);
const getProducts = async () => {
    try {
        const productsData = await odooClient.searchRead('product.product', [], ['id', 'name', 'description_sale', 'list_price', 'image_1920']);
        return productsData;
    }
    catch (error) {
        console.log(error);
    }
};
const getProductsByCategory = async (categoryName) => {
    const odoo = await odooClient;
    // 1. Buscar ID de la categoría por nombre
    const category = await odoo.searchRead('product.category', [['name', '=', categoryName]], ['id']);
    if (category.length === 0)
        return [];
    const categoryId = category[0];
    // 2. Buscar productos que pertenezcan a esa categoría
    return odoo.searchRead('product.product', [['categ_id', '=', categoryId]], ['name', 'list_price', 'categ_id']);
};
const createUserClient = async (username, password) => {
    try {
        const odooConfig = {
            url: process.env.ODOO_URL,
            db: process.env.ODOO_DB,
            username: username,
            password: password,
            port: Number(process.env.ODOO_PORT),
        };
        const odooClient = new OdooJSONRpc(odooConfig);
        return odooClient;
    }
    catch (error) {
        console.log(error);
    }
};
module.exports = {
    odooClient,
    createUserClient,
    getProducts,
    getProductsByCategory
};
