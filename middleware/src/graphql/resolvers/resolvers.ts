import { getProducts, getProductsByCategory } from '../../instances/odooClientInstance';
import { authenticateUser, generateToken } from '../../services/auth';

export const resolvers = {
  Query: {
    products: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('No autorizado');
      return await getProducts();
    },
    productsByCategory: async (_: any, { categoryName }: any, context: any) => {
      if (!context.user) throw new Error('No autorizado');
      return await getProductsByCategory(categoryName);
    },
  },
  Mutation: {
    login: async (_: any, { email, password }: any) => {
      const user = await authenticateUser(email, password);
      if (!user) throw new Error('Credenciales inválidas');

      const token = generateToken(user);
      return { token };
    },
  },
};
