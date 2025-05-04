import { getProducts, getProductsByCategory } from '../../instances/odooClientInstance';
import { authenticateUser, generateToken } from '../../services/auth';
export const resolvers = {
    Query: {
        products: async (_, __, context) => {
            if (!context.user)
                throw new Error('No autorizado');
            return await getProducts();
        },
        productsByCategory: async (_, { categoryName }, context) => {
            if (!context.user)
                throw new Error('No autorizado');
            return await getProductsByCategory(categoryName);
        },
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
