// product.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import {  ProductoComponent } from '../../components/producto/producto.component';
import { GraphqlService } from '../../services/graphql.service';
import { Product } from '../../services/graphql.service';
import { BreadcrumbItem, BreadcrumbsComponent } from "../../components/breadcrumbs/breadcrumbs.component";
import { CartService } from '../../services/cart.service';
interface ProductoRelacionado {
  id: string;
  nombre: string;
  precio: number;
  imageSrc: string;
  categoria: string;
  descripcion: string;
}

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [CurrencyPipe, ProductoComponent, BreadcrumbsComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {
  productoId: string = '';
  producto: Product | null = null;
  imagenesProducto: string[] = [];
  productosRelacionados: Product[] = [];
  BreadCrumb: BreadcrumbItem[] = [];
  loading: boolean = true;
  error: string | null = null;
  medidas: string = "";
  estilo: string = "";
  soporte: string = "";
  
  constructor(
    private route: ActivatedRoute,
    private dbService: GraphqlService,
    private cartService : CartService
  ) {}

  ngOnInit(): void {
    // Obtener el ID del producto de los parámetros de la URL
    this.route.params.subscribe(params => {
      this.productoId = params['id'];
      this.BreadCrumb = [{ label: 'Inicio', url: '/' }, { label: params['categoria'], url: `/catalogo/${params['categoria']}` }];
      if (this.productoId) {
        this.cargarProducto();
        this.dbService.getRelatedProducts(this.productoId,4).subscribe((productos) => {
         this.productosRelacionados = productos;
        })
      }
    });
  }

cargarProducto(): void {
  this.loading = true;
  //llamada a graphql para traer la informacion del producto
  console.log("B")
  this.dbService.getProductById(this.productoId).subscribe((producto) => {
    this.producto = producto;
    this.medidas = String(producto.attributes?.find(attr => attr.name === 'medidas')?.values[0].name);
    this.estilo = String(producto.attributes?.find(attr => attr.name === 'estilo')?.values[0].name);
    this.soporte = String(producto.attributes?.find(attr => attr.name === 'soporte')?.values[0].name);
    this.BreadCrumb.push({ label: this.producto!.name, url: `/producto/${this.producto!.id}` });
    this.loading = false;

    
  }
    
  )
}
  

  // Añadir al carrito
  anadirAlCarrito(): void {
    if (this.producto) {
      console.log('Añadiendo al carrito:', this.producto);
      this.cartService.addProduct(Number(this.producto.id), this.producto).subscribe({
        next: (result) => {
          if (result) {
            console.log('Producto agregado al carrito:', result);
          }
          else{
            console.log('No se pudo agregar el producto al carrito');
          }
        },
        error: (error) => {
          console.error('Error al agregar el producto al carrito:', error);
        }
      });
    }
  }
}