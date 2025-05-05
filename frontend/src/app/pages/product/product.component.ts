// product.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import {  ProductoComponent } from '../../components/producto/producto.component';
import { GraphqlService } from '../../services/graphql.service';
import { Product } from '../../services/graphql.service';
import { BreadcrumbItem, BreadcrumbsComponent } from "../../components/breadcrumbs/breadcrumbs.component";

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
  productosRelacionados: ProductoRelacionado[] = [];
  BreadCrumb: BreadcrumbItem[] = [];
  loading: boolean = true;
  error: string | null = null;
  medidas: string = "";
  estilo: string = "";
  soporte: string = "";
  
  constructor(
    private route: ActivatedRoute,
    private dbService: GraphqlService
  ) {}

  ngOnInit(): void {
    // Obtener el ID del producto de los parámetros de la URL
    this.route.params.subscribe(params => {
      this.productoId = params['id'];
      this.BreadCrumb = [{ label: 'Inicio', url: '/' }, { label: params['categoria'], url: `/catalogo/${params['categoria']}` }];
      if (this.productoId) {
        this.cargarProducto();
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
  

/*
  cargarProducto(): void {
    this.loading = true;
    // Llamada al middleware para obtener la información del producto
    this.http.get<ProductoDetalle>(`${environment.apiUrl}/api/productos/${this.productoId}`)
      .subscribe({
        next: (data) => {
          this.producto = data;
          if (data.imagenes && data.imagenes.length > 0) {
            this.imagenesProducto = data.imagenes;
          }
          this.cargarProductosRelacionados();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error al cargar el producto:', err);
          this.error = 'No se pudo cargar la información del producto.';
          this.loading = false;
        }
      });
  }
      */
/*
  cargarProductosRelacionados(): void {
    if (this.producto) {
      // Llamada al middleware para obtener productos relacionados por categoría
      this.http.get<ProductoRelacionado[]>(`${environment.apiUrl}/api/productos/relacionados/${this.producto.categoria}/${this.productoId}`)
        .subscribe({
          next: (data) => {
            this.productosRelacionados = data;
          },
          error: (err) => {
            console.error('Error al cargar productos relacionados:', err);
          }
        });
    }
  }

*/  // Añadir al carrito
  anadirAlCarrito(): void {
    if (this.producto) {
      // Lógica para añadir al carrito - puedes implementar un servicio de carrito
      console.log('Añadiendo al carrito:', this.producto);
      
      // Ejemplo de integración con un servicio de carrito
      /*
      this.carritoService.agregarProducto({
        id: this.producto.id,
        nombre: this.producto.nombre,
        precio: this.producto.precio,
        cantidad: 1,
        imagen: this.imagenesProducto.length > 0 ? this.imagenesProducto[0] : ''
      });
      */
      
      // Aquí podrías mostrar una notificación de éxito
    }
  }
}