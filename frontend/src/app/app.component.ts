import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterLink } from '@angular/router';
import { DropdownMenuComponent } from './components/dropdown-menu/dropdown-menu.component';
import clienteEntorno from './clientVariables.environment';
import { Cart, GraphqlService } from './services/graphql.service';
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
  private db = inject(GraphqlService);

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
    this.db.getPartnerId().subscribe({
      next: (partnerId) => {
       this.environment.setPartnerId(partnerId.data.getPartnerId);
       // Obtener el carrito del usuario
       this.db.getUserCart(partnerId.data.getPartnerId.toString()).subscribe({
         next: (cart) => {
          console.log(cart)
           this.environment.setCart(cart);
         },
         error: (error) => {
           console.error('Error obteniendo carrito:', error);
         }
       })
      },
      error: (error) => {
        console.error('Error obteniendo Partner ID:', error);
      }
    });

   
  }
}