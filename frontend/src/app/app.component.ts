import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterLink } from '@angular/router';
import { DropdownMenuComponent } from './components/dropdown-menu/dropdown-menu.component';
import clienteEntorno from './clientVariables.environment';
import { CartService } from './services/cart.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, DropdownMenuComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  private environment = clienteEntorno;
  private cartService = inject(CartService);

  isUserLoggedIn(): boolean {
    return this.environment.getIsLoggedIn();
  }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.environment.setIsLoggedIn(true);
      this.environment.setJWT(token);
      
      // Cargar datos del usuario autenticado
      this.loadUserData();
    }
  }

  private loadUserData(): void {
    // Obtener partner ID
     setTimeout(() => {
        console.log('📡 [App Component] Cargando carrito inicial...');
        this.cartService.loadCart().subscribe({
          next: (cart) => {
            if (cart) {
              console.log('✅ [App Component] Carrito cargado:', cart.lines.length, 'productos');
            } else {
              console.log('ℹ️ [App Component] Usuario no tiene carrito activo');
            }
          },
          error: (error) => {
            console.error('❌ [App Component] Error cargando carrito:', error);
          }
        });
      }, 500);
    }
  }