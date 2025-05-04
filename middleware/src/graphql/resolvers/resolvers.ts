import { getProductById, getProducts, getProductsByCategory } from '../../instances/odooClientInstance.js';
import { authenticateUser, generateToken } from '../../services/auth.js';

export const resolvers = {
  Query: {
    products: async (_: any, __: any, context: any) => {
      //if (!context.user) throw new Error('No autorizado');
      return await getProducts();
    },
    productsByCategory: async (_: any, { categoryName }: any, context: any) => {
     // if (!context.user) throw new Error('No autorizado');
      return await getProductsByCategory(categoryName);
    },

    productById: async (_: any, { id }: any, context: any) => {
        const product = await getProductById(id);
        if (!product) throw new Error('Producto no encontrado');
        return product  
    }
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
