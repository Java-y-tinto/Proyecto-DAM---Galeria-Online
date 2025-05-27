import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap, finalize, map } from 'rxjs';
import { GraphqlService, Cart, CartLine, Product, CartOperationResult } from './graphql.service';


export interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  productIdsInCart: Set<string>; // para validacion rapida
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private graphqlService = inject(GraphqlService);

  // Estado inicial del carrito
  private cartState = new BehaviorSubject<CartState>({
    cart: null,
    loading: false,
    error: null,
    productIdsInCart: new Set(),
  })

  // Observables públicos
  cart$ = this.cartState.asObservable();
  loading$ = this.cartState.pipe(map(state => state.loading));
  error$ = this.cartState.pipe(map(state => state.error));

  // Computed observables útiles
  cartItems$ = this.cartState.pipe(
    map(state => state.cart?.lines || [])
  );

  cartTotal$ = this.cartState.pipe(
    map(state => state.cart?.order.amount_total || 0)
  );

  cartItemCount$ = this.cartState.pipe(
    map(state => state.cart?.lines.length || 0)
  );

  constructor() {
    console.log('🛒 [Cart Service] Inicializando...');
  }

  // ============ GETTERS SÍNCRONOS ============

  get currentCart(): Cart | null {
    return this.cartState.value.cart;
  }

  get isLoading(): boolean {
    return this.cartState.value.loading;
  }

  get currentError(): string | null {
    return this.cartState.value.error;
  }

  // Verificar si un producto está en el carrito (para deshabilitar botones)
  isProductInCart(productId: string): boolean {
    return this.cartState.value.productIdsInCart.has(productId);
  }

  // ============ OPERACIONES PRINCIPALES ============

  /**
   * Cargar carrito desde el servidor
   */
  loadCart(): Observable<Cart | null> {
    console.log('📡 [Cart Service] Cargando carrito...');

    this.updateState({ loading: true, error: null });

    return this.graphqlService.getCart().pipe(
      tap(cart => {
        console.log('✅ [Cart Service] Carrito cargado:', cart);
        this.setCart(cart);
      }),
      catchError(error => {
        console.error('❌ [Cart Service] Error cargando carrito:', error);
        this.updateState({
          loading: false,
          error: 'Error al cargar el carrito'
        });
        return of(null);
      }),
      finalize(() => {
        this.updateState({ loading: false });
      })
    );
  }

  /**
   * Agregar producto al carrito
   */
  addProduct(productId: number, product?: Product): Observable<boolean> {
  const productIdStr = productId.toString();

  // Validación: producto ya en carrito
  if (this.isProductInCart(productIdStr)) {
    console.warn('⚠️ [Cart Service] Producto ya está en el carrito:', productId);
    this.updateState({ error: 'Este cuadro ya está en tu carrito' });
    return of(false);
  }

  console.log('➕ [Cart Service] Agregando producto:', productId);
  console.log('🔍 [Cart Service] Llamando a graphqlService.addToCart...');

  // Optimistic update: agregar inmediatamente a la UI
  if (product) {
    this.addProductOptimistically(productIdStr, product);
  }

  this.updateState({ loading: true, error: null });

  return this.graphqlService.addToCart(productId).pipe(
    tap((result: CartOperationResult) => {
      console.log('📥 [Cart Service] Resultado recibido:', result);
      console.log('📥 [Cart Service] result.success:', result.success);
      console.log('📥 [Cart Service] result.message:', result.message);
      
      if (result.success === true) {
        console.log('✅ [Cart Service] Producto agregado exitosamente');
        // Recargar carrito para obtener datos actualizados del servidor
        this.loadCart().subscribe();
      } else {
        console.error('❌ [Cart Service] Error del servidor:', result.message);
        this.updateState({ error: String(result.message) });
        // Rollback optimistic update
        this.removeProductOptimistically(productIdStr);
      }
    }),
    catchError(error => {
      console.error('❌ [Cart Service] Error en catchError:', error);
      this.updateState({ error: 'Error al agregar el cuadro al carrito' });
      // Rollback optimistic update
      this.removeProductOptimistically(productIdStr);
      return of({ success: false, message: 'Error de conexión' } as unknown as CartOperationResult);
    }),
    finalize(() => {
      console.log('🏁 [Cart Service] Finalizando addProduct');
      this.updateState({ loading: false });
    }),
    map((result: CartOperationResult) => {
      console.log('🎯 [Cart Service] Mapeando resultado final:', result.success);
      return result.success === true;
    })
  );
}

  /**
   * Remover producto del carrito
   */
  removeProduct(lineId: number): Observable<Boolean> {
    console.log('➖ [Cart Service] Removiendo producto con line ID:', lineId);

    // Encontrar el producto que se va a remover para optimistic update
    const currentCart = this.currentCart;
    const lineToRemove = currentCart?.lines.find(line => line.id === lineId);

    // Optimistic update: remover inmediatamente de la UI
    if (lineToRemove) {
      this.removeProductOptimistically(lineToRemove.product?.id || '');
    }

    this.updateState({ loading: true, error: null });

    return this.graphqlService.removeFromCart(lineId).pipe(
      tap((result: CartOperationResult) => {
        if (result.success) {
          console.log('✅ [Cart Service] Producto removido exitosamente');
          // Recargar carrito para sincronizar
          this.loadCart().subscribe();
        } else {
          console.error('❌ [Cart Service] Error del servidor:', result.message);
          this.updateState({ error: String(result.message) });
          // Rollback optimistic update
          if (lineToRemove?.product) {
            this.addProductOptimistically(lineToRemove.product.id, lineToRemove.product);
          }
        }
      }),
      catchError(error => {
        console.error('❌ [Cart Service] Error removiendo producto:', error);
        this.updateState({ error: 'Error al remover el cuadro del carrito' });
        // Rollback optimistic update
        if (lineToRemove?.product) {
          this.addProductOptimistically(lineToRemove.product.id, lineToRemove.product);
        }
        return of(false);
      }),
      finalize(() => {
        this.updateState({ loading: false });
      }),
      map(result => {
        if (typeof result === 'boolean') {
          return result;
        } else {
          return result.success;
        }
      })
    );
  }

  /**
   * Vaciar carrito completo
   */
  clearCart(): Observable<Boolean> {
    console.log('🗑️ [Cart Service] Vaciando carrito...');

    // Backup para rollback
    const backupCart = this.currentCart;

    // Optimistic update: vaciar inmediatamente
    this.setCart(null);

    this.updateState({ loading: true, error: null });

    return this.graphqlService.clearCart().pipe(
      tap((result: CartOperationResult) => {
        if (result.success) {
          console.log('✅ [Cart Service] Carrito vaciado exitosamente');
          this.setCart(null);
        } else {
          console.error('❌ [Cart Service] Error del servidor:', result.message);
          this.updateState({ error: String(result.message) });
          // Rollback
          this.setCart(backupCart);
        }
      }),
      map((result: CartOperationResult) => result.success), // Transform CartOperationResult to Boolean
      catchError(error => {
        console.error('❌ [Cart Service] Error vaciando carrito:', error);
        this.updateState({ error: 'Error al vaciar el carrito' });
        // Rollback
        this.setCart(backupCart);
        return of(false); // Return a Boolean value
      }),
      finalize(() => {
        this.updateState({ loading: false });
      })
    );
  }

  /**
   * Proceder al checkout
   */
  checkout(): Observable<CartOperationResult> {
    console.log('💳 [Cart Service] Iniciando checkout...');

    this.updateState({ loading: true, error: null });

    return this.graphqlService.checkoutCart().pipe(
      tap((result: CartOperationResult) => {
        if (result.success) {
          console.log('✅ [Cart Service] Checkout exitoso:', result);
          // Limpiar carrito después del checkout exitoso
          this.setCart(null);
        } else {
          console.error('❌ [Cart Service] Error en checkout:', result.message);
          this.updateState({ error: String(result.message) });
        }
      }),
      catchError(error => {
        console.error('❌ [Cart Service] Error en checkout:', error);
        this.updateState({ error: 'Error al procesar el pedido' });
        return throwError(() => error);
      }),
      finalize(() => {
        this.updateState({ loading: false });
      })
    );
  }

  // ============ MÉTODOS DE UTILIDAD ============

  /**
   * Limpiar errores
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Refrescar carrito (útil después de cambios externos)
   */
  refresh(): void {
    this.loadCart().subscribe();
  }

  // ============ MÉTODOS PRIVADOS ============

  private updateState(updates: Partial<CartState>): void {
    const currentState = this.cartState.value;
    this.cartState.next({
      ...currentState,
      ...updates
    });
  }

  private setCart(cart: Cart | null): void {
    const productIdsInCart = new Set<string>();

    if (cart?.lines) {
      cart.lines.forEach(line => {
        if (line.product?.id) {
          productIdsInCart.add(line.product.id);
        }
      });
    }

    this.updateState({
      cart,
      productIdsInCart,
      error: null
    });
  }

  // Optimistic updates para mejor UX
  private addProductOptimistically(productId: string, product: Product): void {
    const currentState = this.cartState.value;
    const newProductIds = new Set(currentState.productIdsInCart);
    newProductIds.add(productId);

    // Si no hay carrito, no podemos hacer optimistic update completo
    this.updateState({
      productIdsInCart: newProductIds
    });
  }

  private removeProductOptimistically(productId: string): void {
    const currentState = this.cartState.value;
    const newProductIds = new Set(currentState.productIdsInCart);
    newProductIds.delete(productId);

    this.updateState({
      productIdsInCart: newProductIds
    });
  }
}
