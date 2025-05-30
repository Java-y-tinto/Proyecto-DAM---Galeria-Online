import {
  findUserbyEmail,
  getProductById,
  getProducts,
  getProductsByCategory,
  getUserCart,
  addToCart,
  clearCart,
  removeFromCart,
  getOdooPartnerId,
  getSoldProducts,
  searchProducts,
  getRelatedProducts,
  getFeaturedProducts,
  getNewestProducts

} from '../../instances/odooClientInstance.js';
import { authenticateUser, registerUser } from '../../services/auth.js';

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

    productById: async (_: any, { id }: { id: string }, context: any) => {
      try {
        

        
        const products = await getProductById(id);
        

        if (!products || products.length === 0) {
          
          return null;
        }

        const product = products[0];
        
        return product;
      } catch (error) {
        
        return null;
      }
    },
    searchProducts: async (_: any, { searchTerm }: { searchTerm: string }, context: any) => {
      try {
        
        if (!searchTerm || searchTerm.trim().length === 0) {
          
          return [];
        }

        const products = await searchProducts(searchTerm.trim());
        
        return products;
      } catch (error) {
        
        return [];
      }
    },
    getRelatedProducts: async (_: any, { productId, limit = 4 }: { productId: string, limit?: number }, context: any) => {
      try {
        
        const relatedProducts = await getRelatedProducts(productId, limit);
        
        return relatedProducts;
      } catch (error) {
        
        return [];
      }
    },
    getFeaturedProducts: async (_: any, __: any, context: any) => {
      try {
        
        const featuredProducts = await getFeaturedProducts();
        
        return featuredProducts;
      } catch (error) {
        
        return [];
      }
    },
    getPartnerId: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('No autorizado'); // Lanza error en lugar de devolver objeto
      }
      return await getOdooPartnerId(context.user.uid);
    },
     getNewestProducts: async (_: any, __: any, context: any) => {
      try {
        
        const newestProducts = await getNewestProducts();
        
        return newestProducts;
      } catch (error) {
        
        return [];
      }
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
    getCart: async (_: any, __: any, context: any) => {
      if (!context.user) throw new Error('No autorizado');
      return await getUserCart(context.user.uid);
    },
  },
  Mutation: {
    login: async (_: any, { email, password }: any) => {
      const user = await authenticateUser(email, password);
      if (!user || user === null) return null;

      const token = user.token;
      return {
        token: token,
        success: true,
        message: "OK"
      };
    },
    registerUser: async (_: any, { name, email, passwd }: any) => {
      try {
        const isEmailRegistered = await findUserbyEmail(email);
        if (isEmailRegistered && isEmailRegistered.length > 0) {
          return {
            success: false,
            message: "Email ya registrado",
            token: null
          }
        }
        const user = await registerUser({ name, email, passwd });
        return {
          token: user.token.token,
          success: true,
          message: "OK"
        };
      } catch (error) {
        
        return {
          success: false,
          message: `Error de registro: ${error.message || 'Error desconocido'}`,
          token: null
        }
      }
    },

    addToCart: async (_: any, { productId }: any, context: any) => {
      if (!context.user) return { success: false, message: "No autorizado" }
      return await addToCart(context.user.uid, productId);
    },
    removeFromCart: async (_: any, { lineId }: any, context: any) => {
      if (!context.user) return { success: false, message: "No autorizado" }
      return await removeFromCart(context.user.uid, lineId);
    },
    clearCart: async (_: any, __: any, context: any) => {
      if (!context.user) return { success: false, message: "No autorizado" }
      return await clearCart(context.user.uid);
    },


  },
};
