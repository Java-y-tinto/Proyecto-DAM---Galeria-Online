import { Component,inject, OnInit } from '@angular/core';
import { ProductoComponent } from "../../components/producto/producto.component";
import { RouterLink } from '@angular/router';
import { Product } from '../../services/graphql.service';
import { GraphqlService } from '../../services/graphql.service';
@Component({
  selector: 'app-home-page',
  imports: [ProductoComponent,RouterLink],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss'
})
export class HomePageComponent implements OnInit {
  private db = inject(GraphqlService);

  destacados: Product[] = [];
  novedades: Product[] = [];

  async ngOnInit() {
     this.db.getFeaturedProducts().subscribe(
       (productos) => {
        console.log(productos);
         this.destacados = productos;
       }
     );

     this.db.getNewestProducts().subscribe(
       (productos) => {
        console.log(productos);
         this.novedades = productos;
       }
     );
  }
}
