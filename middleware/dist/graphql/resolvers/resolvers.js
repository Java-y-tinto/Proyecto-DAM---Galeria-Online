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
            return { token };
        },
        registerUser: async (_, { name, email, passwd }) => {
            try {
                const isEmailRegistered = await findUserbyEmail(email);
                if (isEmailRegistered)
                    return "Email ya existente";
                const user = await registerUser({ name, email, passwd });
                return { token: user.token };
            }
            catch (error) {
                console.error('ERROR al conectar/registrar con Odoo:', error);
                throw new Error(`Error de registro: ${error.message || 'Error desconocido'}`);
            }
        },
    },
};
