import { Component } from '@angular/core';
import { ProductoComponent } from '../../components/producto/producto.component';
@Component({
  selector: 'app-product',
  imports: [ProductoComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent {

}
