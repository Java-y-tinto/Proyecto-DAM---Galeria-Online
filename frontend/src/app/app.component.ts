import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterLink } from '@angular/router';
import { DropdownMenuComponent } from './components/dropdown-menu/dropdown-menu.component';
import clienteEntorno from './clientVariables.environment';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet,RouterLink,DropdownMenuComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'frontend';
  private environment = clienteEntorno;
  isUserLoggedIn(): boolean {
    return this.environment.getIsLoggedIn();
  }
  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (token){
      this.environment.setIsLoggedIn(true);
      this.environment.setJWT(token);
    }
  }
}
