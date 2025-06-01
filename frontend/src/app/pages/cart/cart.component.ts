import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, AsyncPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartLine } from '../../services/graphql.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, AsyncPipe, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss'
})
export class CartComponent implements OnInit {
  private cartService = inject(CartService);
  checkout_url: String = '';
  private router = inject(Router);  
  // Observables del carrito
  cart$ = this.cartService.cart$;
  cartItems$ = this.cartService.cartItems$;
  cartTotal$ = this.cartService.cartTotal$;
  cartItemCount$ = this.cartService.cartItemCount$;
  isLoading$ = this.cartService.loading$;
  error$ = this.cartService.error$;

  ngOnInit(): void {
    console.log('🛒 [Cart Page] Inicializando página del carrito...');
    // Cargar carrito si no está cargado
    this.cartService.loadCart().subscribe({
      next: (cart) => {
        console.log('✅ [Cart Page] Carrito cargado:', cart);
        this.checkout_url = cart?.order.access_url || '';
      },
      error: (error) => {
        console.error('❌ [Cart Page] Error cargando carrito:', error);
      }
    });
  }

  /**
   * Eliminar producto del carrito
   */
  removeProduct(item: CartLine): void {
    console.log('🗑️ [Cart Page] Eliminando producto:', item.id);
    
    this.cartService.removeProduct(item.id).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ [Cart Page] Producto eliminado exitosamente');
        } else {
          console.error('❌ [Cart Page] Error eliminando producto');
        }
      },
      error: (error) => {
        console.error('❌ [Cart Page] Error:', error);
      }
    });
  }

  /**
   * Vaciar carrito completo
   */
  clearCart(): void {
    if (confirm('¿Estás seguro de que quieres vaciar todo el carrito?')) {
      console.log('🗑️ [Cart Page] Vaciando carrito...');
      
      this.cartService.clearCart().subscribe({
        next: (success) => {
          if (success) {
            console.log('✅ [Cart Page] Carrito vaciado exitosamente');
          } else {
            console.error('❌ [Cart Page] Error vaciando carrito');
          }
        },
        error: (error) => {
          console.error('❌ [Cart Page] Error:', error);
        }
      });
    }
  }

  /**
   * Proceder al checkout
   */
  proceedToCheckout(): void {
    console.log('💳 [Cart Page] Procediendo al checkout...');
    
    window.location.href = (environment.odooUrl + this.checkout_url); 
  }

  /**
   * Limpiar errores
   */
  clearError(): void {
    this.cartService.clearError();
  }
}