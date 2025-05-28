import { findUserbyEmail, getProductById, getProducts, getProductsByCategory, getUserCart, addToCart, clearCart, removeFromCart, getOdooPartnerId, getSoldProducts } from '../../instances/odooClientInstance.js';
import { authenticateUser, registerUser } from '../../services/auth.js';
export const resolvers = {
    Query: {
        products: async (_, __, context) => {
            //if (!context.user) throw new Error('No autorizado');
            console.log('[Resolver products]: Productos vendidos: ', getSoldProducts());
            return await getProducts();
        },
        productsByCategory: async (_, { categoryName }, context) => {
            // if (!context.user) throw new Error('No autorizado');
            return await getProductsByCategory(categoryName);
        },
        productById: async (_, { id }, context) => {
            try {
                console.log('[Resolver products]: Productos vendidos: ', getSoldProducts());
                console.log(`Resolver: Buscando producto con ID: ${id}`);
                const products = await getProductById(id);
                console.log(`Resolver: Productos encontrados:`, products);
                if (!products || products.length === 0) {
                    console.log(`Resolver: No se encontraron productos`);
                    return null;
                }
                const product = products[0];
                console.log(`Resolver: Devolviendo producto:`, product);
                return product;
            }
            catch (error) {
                console.error(`Resolver: Error al buscar producto:`, error);
                return null;
            }
        },
        getPartnerId: async (_, __, context) => {
            if (!context.user) {
                throw new Error('No autorizado'); // Lanza error en lugar de devolver objeto
            }
            return await getOdooPartnerId(context.user.uid);
        },
        /* getCart: async (_: any, __: any, context: any) => {
         if (!context.user) {
           // Aquí podrías lanzar un error GraphQL o devolver null
           throw new Error("No autorizado");
         }
       
         const cart = await getUserCart(context.user.uid);
         if (!cart) return null;
       
         // En cada línea, obtener el objeto product completo con getProductById
         const linesWithProducts = await Promise.all(
           cart.lines.map(async (line) => {
             // product_id viene como [id, "nombre"], convertimos a string id
             const productId = line.product_id[0].toString();
       
             const productArr = await getProductById(productId);
             const product = productArr && productArr.length > 0 ? productArr[0] : null;
       
             return {
               id: line.id,
               product,
               display_name: line.display_name,
               product_uom_qty: line.product_uom_qty,
               price_unit: line.price_unit,
               price_subtotal: line.price_subtotal,
             };
           })
         );
       
         return {
           order: cart.order,
           lines: linesWithProducts,
         };
       },
       */
        getCart: async (_, __, context) => {
            if (!context.user)
                throw new Error('No autorizado');
            return await getUserCart(context.user.uid);
        },
    },
    Mutation: {
        login: async (_, { email, password }) => {
            const user = await authenticateUser(email, password);
            if (!user || user === null)
                return null;
            const token = user.token;
            return {
                token: token,
                success: true,
                message: "OK"
            };
        },
        registerUser: async (_, { name, email, passwd }) => {
            try {
                const isEmailRegistered = await findUserbyEmail(email);
                if (isEmailRegistered && isEmailRegistered.length > 0) {
                    return {
                        success: false,
                        message: "Email ya registrado",
                        token: null
                    };
                }
                const user = await registerUser({ name, email, passwd });
                return {
                    token: user.token.token,
                    success: true,
                    message: "OK"
                };
            }
            catch (error) {
                console.error('ERROR al conectar/registrar con Odoo:', error);
                return {
                    success: false,
                    message: `Error de registro: ${error.message || 'Error desconocido'}`,
                    token: null
                };
            }
        },
        addToCart: async (_, { productId }, context) => {
            if (!context.user)
                return { success: false, message: "No autorizado" };
            return await addToCart(context.user.uid, productId);
        },
        removeFromCart: async (_, { lineId }, context) => {
            if (!context.user)
                return { success: false, message: "No autorizado" };
            return await removeFromCart(context.user.uid, lineId);
        },
        clearCart: async (_, __, context) => {
            if (!context.user)
                return { success: false, message: "No autorizado" };
            return await clearCart(context.user.uid);
        },
    },
};
