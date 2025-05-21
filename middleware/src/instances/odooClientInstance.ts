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
    try {
        // Obtener el producto básico
        const products = await odooClient.searchRead(
            'product.product',
            [['id', '=', id]],
            ['id', 'name', 'description_sale', 'list_price', 'image_1920', 'image_512', 'product_tmpl_id']
        );
        
        if (!products || products.length === 0) {
            return null;
        }
        
        const product = products[0];
        
        // Obtener los atributos del producto
        if (product.product_tmpl_id) {
            const templateId = product.product_tmpl_id[0]; // Odoo devuelve [id, name]
            
            // Obtener líneas de atributos de la plantilla
            const attributeLines = await odooClient.searchRead(
                'product.template.attribute.line',
                [['product_tmpl_id', '=', templateId]],
                ['attribute_id', 'value_ids']
            );
            
            // Obtener información de atributos y valores
            let attributes = [];
            for (const line of attributeLines) {
                const attributeId = line.attribute_id[0];
                
                // Obtener detalles del atributo
                const attributeDetails = await odooClient.searchRead(
                    'product.attribute',
                    [['id', '=', attributeId]],
                    ['name', 'display_type']
                );
                
                // Obtener valores del atributo
                const valueIds = line.value_ids;
                const attributeValues = await odooClient.searchRead(
                    'product.attribute.value',
                    [['id', 'in', valueIds]],
                    ['name', 'html_color']
                );
                
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
            const variantAttributeValues = await odooClient.searchRead(
                'product.template.attribute.value',
                [['product_tmpl_id', '=', templateId]],
                ['product_attribute_value_id', 'price_extra']
            );
            
            product.variant_attributes = variantAttributeValues;
        }
        
        return [product];
    } catch (error) {
        console.error("Error en getProductById:", error);
        throw error;
    }
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

export const findUserbyEmail = async (email: string) => {
    try {
        const users = await odooClient.searchRead(
            'res.users',
            [['email', '=', email]],
            ['id']
        );
        return users.length > 0 ? users : null;
    } catch (error) {
        console.log(error);
    }
};

export const getUserCart = async (uid: number) => {
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

  return {
    order,
    lines,
  };
}

const getOdooPartnerId = async (uid: number) => {
    const user = await odooClient.searchRead(
        'res.users',
        [['id', '=', uid]],
        ['partner_id']
    )
    if (user.length > 0) {
        return user[0].partner_id[0];
    }
    return null;
}

export const addToCart = async(uid: number, productId: number, quantity: number) => {
    // obtener partner id del usuario
    const partner_id = await getOdooPartnerId(uid);
    if (!partner_id) return null;

    // Buscar si ya hay un carrito creado
    const orders = await odooClient.searchRead(
        'sale.order',
        [['state', '=', 'draft'], ['partner_id', '=', partner_id]],
        ['id']
    );

    let order_id: number;

    // Si no hay carrito,creamos uno
    if (orders.length === 0) {
        const order = await odooClient.create('sale.order', {
            partner_id,
            state: 'draft',
        });
        order_id = order;
    } else {
        order_id = orders[0].id;
    }

    // Buscamos si hay un producto igual en el carrito
    const lines = await odooClient.searchRead(
        'sale.order.line',
        [['order_id', '=', order_id]],
        ['id','product_id','product_uom_qty']
    );

    if (lines.length === 0) {
        // Si no lo hay,creamos una linea nueva en el carrito
        await odooClient.create('sale.order.line', {
            order_id,
            product_id: productId,
            product_uom_qty: quantity,
        });
    } else {
        // Si lo hay, no hacemos nada,ya que solo hay un producto de cada tipo
        
    }
}

export { odooClient };
