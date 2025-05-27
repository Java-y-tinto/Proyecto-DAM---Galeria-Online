import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import clienteEntorno from '../../clientVariables.environment';
@Component({
  selector: 'app-dropdown-menu',
  imports: [NgClass],
  templateUrl: './dropdown-menu.component.html',
  styleUrl: './dropdown-menu.component.scss'
})
export class DropdownMenuComponent implements OnDestroy {
  isDropdownVisible = false;
  private hideDropdownTimeout: any = null;
  protected environment = clienteEntorno
  constructor(
    private router: Router
  ) { }


  showDropdown(): void {
    // Cancelar cualquier timeout pendiente para ocultar el dropdown
    if (this.hideDropdownTimeout) {
      clearTimeout(this.hideDropdownTimeout);
      this.hideDropdownTimeout = null;
    }
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

  logout(): void {
    localStorage.removeItem('token');
    this.environment.setIsLoggedIn(false);
    this.environment.setJWT('');
    this.isDropdownVisible = false;
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    // Limpiar timeouts al destruir el componente
    if (this.hideDropdownTimeout) {
      clearTimeout(this.hideDropdownTimeout);
    }
  }
}
