import { getProductById, getProducts, getProductsByCategory } from '../../instances/odooClientInstance.js';
import { authenticateUser, generateToken } from '../../services/auth.js';
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
            const product = await getProductById(id);
            if (!product)
                throw new Error('Producto no encontrado');
            return product;
        }
    },
    Mutation: {
        login: async (_, { email, password }) => {
            const user = await authenticateUser(email, password);
            if (!user)
                throw new Error('Credenciales inválidas');
            const token = generateToken(user);
            return { token };
        },
    },
};
