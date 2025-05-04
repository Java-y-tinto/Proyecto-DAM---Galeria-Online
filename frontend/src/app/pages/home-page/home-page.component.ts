import { Component } from '@angular/core';
import { ProductoComponent } from "../../components/producto/producto.component";
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-home-page',
  imports: [ProductoComponent,RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {

}
