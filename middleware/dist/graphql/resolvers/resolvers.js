import { findUserbyEmail, getProductById, getProducts, getProductsByCategory } from '../../instances/odooClientInstance.js';
import { authenticateUser, registerUser } from '../../services/auth.js';
export const resolvers = {
    Query: {
        products: async (_, __, context) => {
            //if (!context.user) throw new Error('No autorizado');
            return await getProducts();
        },
        productsByCategory: async (_, { categoryName }, context) => {
            // if (!context.user) throw new Error('No autorizado');
            return await getProductsByCategory(categoryName);
        },
        productById: async (_, { id }, context) => {
            try {
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
        }
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
    },
};
