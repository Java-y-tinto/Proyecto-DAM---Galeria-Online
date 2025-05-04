// @ts-ignore
import OdooModule from '@fernandoslim/odoo-jsonrpc';
import dotenv from 'dotenv';
dotenv.config();
const OdooJSONRpc = (OdooModule as any).default || OdooModule;

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
})

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
            console.log("Intentando query...");
            getProductById("48").then(console.log);
  
    } catch (error) {
      console.error('ERROR al conectar/autenticar con Odoo:', error);
      // Si falla aquí, el servidor no debería continuar o las queries fallarán.
      // Podrías lanzar el error para detener el inicio del servidor:
      // throw new Error('No se pudo conectar a Odoo.');
    }
  };

export const getProducts = async () => {
    try {
        const productsData = await odooClient.searchRead(
            'product.product',
            [],
            ['id', 'name', 'description_sale', 'list_price', 'image_1920'],
        );
        return productsData;
    } catch (error) {
        console.log(error);
    }
};

export const getProductById = async (id: string) => {
    return odooClient.searchRead(
        'product.product',
        [['id', '=', id]],
        ['id', 'name', 'description_sale', 'list_price', 'image_1920']
    )
}

export const getProductsByCategory = async (categoryName: string) => {
    const category = await odooClient.searchRead(
        'product.category',
        [['name', '=', categoryName]],
        ['id']
    );

    if (category.length === 0) return [];

    const categoryId = category[0].id;
    console.log(categoryId);
/*

*/
    return odooClient.searchRead(
        'product.product',
        [['categ_id', '=', categoryId]],
        ['name', 'list_price', 'categ_id', 'image_1920','image_512']
    );
};

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
        console.log(error);
    }
};

export { odooClient };
