import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass, AsyncPipe, CurrencyPipe } from '@angular/common';
import { CartService } from '../../services/cart.service';
@Component({
  selector: 'app-cart-dropdown-menu',
  imports: [NgClass, RouterLink, AsyncPipe, CurrencyPipe],
  templateUrl: './cart-dropdown-menu.component.html',
  styleUrl: './cart-dropdown-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartDropdownMenuComponent implements OnDestroy {
  private router = inject(Router);
  protected cartService = inject(CartService);
  public tax: number | undefined = undefined;
  isDropdownVisible = false;
  private hideDropdownTimeout: any = null;

  // Observables del carrito
  cartItems$ = this.cartService.cartItems$;
  cartTotal$ = this.cartService.cartTotal$;
  cartItemCount$ = this.cartService.cartItemCount$;
  isLoading$ = this.cartService.loading$;

  showDropdown(): void {
    // Cancelar cualquier timeout pendiente para ocultar el dropdown
    if (this.hideDropdownTimeout) {
      clearTimeout(this.hideDropdownTimeout);
      this.hideDropdownTimeout = null;
    }
    this.cartService.cart$.subscribe((cart) => {this.tax =  cart.cart?.order.amount_tax}).unsubscribe(); 
    this.isDropdownVisible = true;
  }

  hideDropdownDelayed(): void {
    // Retrasar la ocultación del dropdown para dar tiempo a mover el ratón al contenido
    this.hideDropdownTimeout = setTimeout(() => {
      this.isDropdownVisible = false;
    }, 150); // Pequeño retraso para que el usuario tenga tiempo de mover el ratón al menú
  }

  toggleDropdown(): void {
    this.isDropdownVisible = !this.isDropdownVisible;
  }

  goToCart(): void {
    this.isDropdownVisible = false;
    this.router.navigate(['/cart']);
  }

  removeFromCart(lineId: number): void {
    console.log('🗑️ [Cart Dropdown] Removiendo producto con lineId:', lineId);
    this.cartService.removeProduct(lineId).subscribe({
      next: (success) => {
        if (success) {
          console.log('✅ [Cart Dropdown] Producto removido exitosamente');
        }
      },
      error: (error) => {
        console.error('❌ [Cart Dropdown] Error removiendo producto:', error);
      }
    });
  }

  ngOnDestroy(): void {
    // Limpiar timeouts al destruir el componente
    if (this.hideDropdownTimeout) {
      clearTimeout(this.hideDropdownTimeout);
    }
  }
  goToCheckout(): void{

  }
}