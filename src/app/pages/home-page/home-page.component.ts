import { Component } from '@angular/core';
import { ProductoComponent } from "../../producto/producto.component";

@Component({
  selector: 'app-home-page',
  imports: [ProductoComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent {

}
