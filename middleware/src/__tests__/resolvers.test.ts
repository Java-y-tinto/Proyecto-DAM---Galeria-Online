// __tests__/cartResolvers.test.js (para Vitest)

import { resolvers } from '../graphql/resolvers/resolvers.js';
// 1. Importar utilidades de Vitest
import { it, describe, beforeEach, expect, vi } from 'vitest';

// 2. Mockear el módulo de odooClientInstance con Vitest
// La ruta debe ser relativa al archivo actual o una ruta absoluta/alias configurado en Vite/Vitest
vi.mock('../instances/odooClientInstance.js', async (importOriginal) => {
  // Opcionalmente, puedes importar el original para extenderlo, pero aquí creamos mocks puros.
  // const actual = await importOriginal();
  return {
    // ...actual, // Descomenta si quieres mantener algunas implementaciones originales
    getProductById: vi.fn(),
    getUserCart: vi.fn(),
    addToCart: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
    checkoutCart: vi.fn(),
    findUserbyEmail: vi.fn(),
    getProducts: vi.fn(),
    getProductsByCategory: vi.fn(),
  };
});

// 3. Importar las funciones (que ahora serán mocks gracias a vi.mock)
// Es importante que Vitest pueda resolver esta ruta de la misma forma que en vi.mock
import {
  getProductById as originalGetProductById,
  getUserCart as originalGetUserCart,
  addToCart as originalAddToCart,
  removeFromCart as originalRemoveFromCart,
  clearCart as originalClearCart,
  checkoutCart as originalCheckoutCart,
} from '../instances/odooClientInstance.js';

// --- Aplicar JSDoc para ayudar al IDE/TypeScript con los tipos de los mocks de Vitest ---
// Vitest usa 'Mock' de 'vitest'. La inferencia podría ser mejor, pero el JSDoc sigue siendo útil.
// Si tienes problemas de tipo, puedes ser más explícito con los tipos de Vitest.
// Ejemplo: /** @type {import('vitest').Mock<[string], Promise<any[]>>} */

/** @type {import('vitest').MockInstance<Parameters<typeof originalGetProductById>, ReturnType<typeof originalGetProductById>>} */
const getProductById = originalGetProductById;
/** @type {import('vitest').MockInstance<Parameters<typeof originalGetUserCart>, ReturnType<typeof originalGetUserCart>>} */
const getUserCart = originalGetUserCart;
/** @type {import('vitest').MockInstance<Parameters<typeof originalAddToCart>, ReturnType<typeof originalAddToCart>>} */
const addToCart = originalAddToCart;
/** @type {import('vitest').MockInstance<Parameters<typeof originalRemoveFromCart>, ReturnType<typeof originalRemoveFromCart>>} */
const removeFromCart = originalRemoveFromCart;
/** @type {import('vitest').MockInstance<Parameters<typeof originalClearCart>, ReturnType<typeof originalClearCart>>} */
const clearCart = originalClearCart;
/** @type {import('vitest').MockInstance<Parameters<typeof originalCheckoutCart>, ReturnType<typeof originalCheckoutCart>>} */
const checkoutCart = originalCheckoutCart;


describe('Cart Resolvers with Vitest', () => {
  let mockContext;
  const mockUserId = 'user-test-123';

  beforeEach(() => {
    // Los métodos de mock son muy similares a Jest
    getProductById.mockReset();
    getUserCart.mockReset();
    addToCart.mockReset();
    removeFromCart.mockReset();
    clearCart.mockReset();
    checkoutCart.mockReset();

    mockContext = {
      user: {
        uid: mockUserId,
      },
    };
  });

  // --- Pruebas para Query: getCart ---
  describe('Query: getCart', () => {
    it('debería devolver el carrito del usuario con productos detallados', async () => {
      const mockOdooCartData = {
        order: { id: 'order-001', name: 'S00001' },
        lines: [
          { id: 'line-1', product_id: [1, 'Producto A'], product_uom_qty: 2, price_unit: 10, price_subtotal: 20, display_name: 'Producto A (2)' },
          { id: 'line-2', product_id: [2, 'Producto B'], product_uom_qty: 1, price_unit: 25, price_subtotal: 25, display_name: 'Producto B (1)' },
        ],
      };
      const mockProductDetailsA = { id: '1', name: 'Producto A Detallado', price: 10, image_1920: 'url_a' };
      const mockProductDetailsB = { id: '2', name: 'Producto B Detallado', price: 25, image_1920: 'url_b' };

      getUserCart.mockResolvedValue(mockOdooCartData);
      getProductById.mockImplementation(async (productId) => {
        if (productId === '1') return [mockProductDetailsA];
        if (productId === '2') return [mockProductDetailsB];
        return [];
      });

      const result = await resolvers.Query.getCart(null, {}, mockContext);

      expect(getUserCart).toHaveBeenCalledTimes(1);
      expect(getUserCart).toHaveBeenCalledWith(mockUserId);
      expect(getProductById).toHaveBeenCalledTimes(2);
      expect(getProductById).toHaveBeenCalledWith('1');
      expect(getProductById).toHaveBeenCalledWith('2');
      expect(result).toEqual({
        order: mockOdooCartData.order,
        lines: [
          { id: 'line-1', product: mockProductDetailsA, display_name: 'Producto A (2)', product_uom_qty: 2, price_unit: 10, price_subtotal: 20 },
          { id: 'line-2', product: mockProductDetailsB, display_name: 'Producto B (1)', product_uom_qty: 1, price_unit: 25, price_subtotal: 25 },
        ],
      });
    });

    it('debería devolver null si getUserCart devuelve null (carrito no encontrado)', async () => {
      getUserCart.mockResolvedValue(null);
      const result = await resolvers.Query.getCart(null, {}, mockContext);
      expect(getUserCart).toHaveBeenCalledWith(mockUserId);
      expect(getProductById).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('debería manejar líneas de carrito donde getProductById no encuentra el producto', async () => {
      const mockOdooCartData = {
        order: { id: 'order-002', name: 'S00002' },
        lines: [
          { id: 'line-3', product_id: [3, 'Producto C'], product_uom_qty: 1, price_unit: 30, price_subtotal: 30, display_name: 'Producto C (1)' },
        ],
      };
      getUserCart.mockResolvedValue(mockOdooCartData);
      getProductById.mockResolvedValue([]); // Simula que el producto no se encuentra
      const result = await resolvers.Query.getCart(null, {}, mockContext);
      expect(result.lines[0].product).toBeNull();
    });

    it('debería lanzar un error si el usuario no está autenticado', async () => {
      const unauthenticatedContext = {};
      // Para probar errores en funciones asíncronas con Vitest, puedes usar try/catch
      // o .rejects si configuras Chai matchers (Vitest usa Chai para expect)
      try {
        await resolvers.Query.getCart(null, {}, unauthenticatedContext);
      } catch (e) {
        expect(e.message).toBe('No autorizado');
      }
      // O, de forma más idiomática con `expect(...).rejects.toThrow()`:
      // await expect(resolvers.Query.getCart(null, {}, unauthenticatedContext))
      //   .rejects.toThrow('No autorizado'); // Asegúrate de que tu resolver realmente lance el error
      expect(getUserCart).not.toHaveBeenCalled();
    });
  });

  // --- Pruebas para Mutation: addToCart ---
  describe('Mutation: addToCart', () => {
    const productIdToAdd = 'prod-xyz-789';
    it('debería llamar a odooClient.addToCart con el uid y productId correctos y devolver su resultado', async () => {
      const mockSuccessResponse = { success: true, message: 'Producto agregado exitosamente' };
      addToCart.mockResolvedValue(mockSuccessResponse);
      const result = await resolvers.Mutation.addToCart(null, { productId: productIdToAdd }, mockContext);
      expect(addToCart).toHaveBeenCalledTimes(1);
      expect(addToCart).toHaveBeenCalledWith(mockUserId, productIdToAdd);
      expect(result).toEqual(mockSuccessResponse);
    });

    it('debería devolver "No autorizado" si el usuario no está en el contexto', async () => {
      const unauthenticatedContext = {};
      const result = await resolvers.Mutation.addToCart(null, { productId: productIdToAdd }, unauthenticatedContext);
      expect(result).toEqual({ success: false, message: "No autorizado" });
      expect(addToCart).not.toHaveBeenCalled();
    });
  });

  // ... (El resto de tus describe blocks para removeFromCart, clearCart, checkoutCart y Full Cart Flow
  //      deberían adaptarse de manera similar, ya que la API de expect y los métodos de mock
  //      son en gran medida compatibles.)
  // --- Pruebas para Mutation: removeFromCart ---
  describe('Mutation: removeFromCart', () => {
      const lineIdToRemove = 'line-abc-123';

      it('debería llamar a odooClient.removeFromCart con el uid y lineId correctos', async () => {
      const mockSuccessResponse = { success: true, message: 'Producto eliminado' };
      removeFromCart.mockResolvedValue(mockSuccessResponse);

      const result = await resolvers.Mutation.removeFromCart(null, { lineId: lineIdToRemove }, mockContext);

      expect(removeFromCart).toHaveBeenCalledTimes(1);
      expect(removeFromCart).toHaveBeenCalledWith(mockUserId, lineIdToRemove);
      expect(result).toEqual(mockSuccessResponse);
      });

      it('debería devolver "No autorizado" si el usuario no está en el contexto', async () => {
      const unauthenticatedContext = {};
      const result = await resolvers.Mutation.removeFromCart(null, { lineId: lineIdToRemove }, unauthenticatedContext);

      expect(result).toEqual({ success: false, message: "No autorizado" });
      expect(removeFromCart).not.toHaveBeenCalled();
      });
  });

  // --- Pruebas para Mutation: clearCart ---
  describe('Mutation: clearCart', () => {
      it('debería llamar a odooClient.clearCart con el uid correcto', async () => {
      const mockSuccessResponse = { success: true, message: 'Carrito vaciado' };
      clearCart.mockResolvedValue(mockSuccessResponse);

      const result = await resolvers.Mutation.clearCart(null, {}, mockContext);

      expect(clearCart).toHaveBeenCalledTimes(1);
      expect(clearCart).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockSuccessResponse);
      });

      it('debería devolver "No autorizado" si el usuario no está en el contexto', async () => {
      const unauthenticatedContext = {};
      const result = await resolvers.Mutation.clearCart(null, {}, unauthenticatedContext);

      expect(result).toEqual({ success: false, message: "No autorizado" });
      expect(clearCart).not.toHaveBeenCalled();
      });
  });

  // --- Pruebas para Mutation: checkoutCart ---
  describe('Mutation: checkoutCart', () => {
      it('debería llamar a odooClient.checkoutCart con el uid correcto', async () => {
      const mockSuccessResponse = { success: true, message: 'Checkout completado con éxito' };
      checkoutCart.mockResolvedValue(mockSuccessResponse);

      const result = await resolvers.Mutation.checkoutCart(null, {}, mockContext);

      expect(checkoutCart).toHaveBeenCalledTimes(1);
      expect(checkoutCart).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockSuccessResponse);
      });

      it('debería devolver "No autorizado" si el usuario no está en el contexto', async () => {
      const unauthenticatedContext = {};
      const result = await resolvers.Mutation.checkoutCart(null, {}, unauthenticatedContext);

      expect(result).toEqual({ success: false, message: "No autorizado" });
      expect(checkoutCart).not.toHaveBeenCalled();
      });
  });

  // --- Prueba de Flujo Completo del Carrito ---
  describe('Full Cart Flow', () => {
      it('debería simular un flujo completo: agregar, ver, quitar, ver, limpiar, ver, agregar, checkout', async () => {
          const product1Id = 'P001';
          const product2Id = 'P002';
          const mockProductDetails1 = { id: product1Id, name: 'Producto 1 Detallado' };
          const mockProductDetails2 = { id: product2Id, name: 'Producto 2 Detallado' };

          addToCart.mockResolvedValueOnce({ success: true, message: 'P1 añadido' });
          await resolvers.Mutation.addToCart(null, { productId: product1Id }, mockContext);
          expect(addToCart).toHaveBeenCalledWith(mockUserId, product1Id);

          addToCart.mockResolvedValueOnce({ success: true, message: 'P2 añadido' });
          await resolvers.Mutation.addToCart(null, { productId: product2Id }, mockContext);
          expect(addToCart).toHaveBeenCalledWith(mockUserId, product2Id);

          const cartAfterAddingTwo = {
              order: { id: 'order-flow', name: 'S-FLOW' },
              lines: [
                  { id: 'line-flow-1', product_id: [1, 'P1 Odoo Name'], product_uom_qty: 1 },
                  { id: 'line-flow-2', product_id: [2, 'P2 Odoo Name'], product_uom_qty: 1 },
              ],
          };
          getUserCart.mockResolvedValueOnce(cartAfterAddingTwo);
          getProductById
              .mockImplementationOnce(async () => [mockProductDetails1])
              .mockImplementationOnce(async () => [mockProductDetails2]);
          let cartState = await resolvers.Query.getCart(null, {}, mockContext);
          expect(cartState.lines.length).toBe(2);
          expect(cartState.lines.find(l => l.product.id === product1Id)).toBeDefined();
          expect(cartState.lines.find(l => l.product.id === product2Id)).toBeDefined();

          removeFromCart.mockResolvedValueOnce({ success: true, message: 'P1 quitado' });
          await resolvers.Mutation.removeFromCart(null, { lineId: 'line-flow-1' }, mockContext);
          expect(removeFromCart).toHaveBeenCalledWith(mockUserId, 'line-flow-1');

          const cartAfterRemovingOne = {
              order: { id: 'order-flow', name: 'S-FLOW' },
              lines: [
                  { id: 'line-flow-2', product_id: [2, 'P2 Odoo Name'], product_uom_qty: 1 },
              ],
          };
          getUserCart.mockResolvedValueOnce(cartAfterRemovingOne);
          getProductById.mockReset(); // Limpiamos llamadas anteriores para la siguiente mockImplementationOnce
          getProductById.mockImplementationOnce(async () => [mockProductDetails2]);
          cartState = await resolvers.Query.getCart(null, {}, mockContext);
          expect(cartState.lines.length).toBe(1);
          expect(cartState.lines[0].product.id).toBe(product2Id);

          clearCart.mockResolvedValueOnce({ success: true, message: 'Carrito limpiado' });
          await resolvers.Mutation.clearCart(null, {}, mockContext);
          expect(clearCart).toHaveBeenCalledWith(mockUserId);

          getUserCart.mockResolvedValueOnce(null);
          cartState = await resolvers.Query.getCart(null, {}, mockContext);
          expect(cartState).toBeNull();

          addToCart.mockResolvedValueOnce({ success: true, message: 'P1 añadido de nuevo' });
          await resolvers.Mutation.addToCart(null, { productId: product1Id }, mockContext);

          checkoutCart.mockResolvedValueOnce({ success: true, message: 'Checkout OK' });
          const checkoutResult = await resolvers.Mutation.checkoutCart(null, {}, mockContext);
          expect(checkoutCart).toHaveBeenCalledWith(mockUserId);
          expect(checkoutResult.success).toBe(true);
      });
  });
});