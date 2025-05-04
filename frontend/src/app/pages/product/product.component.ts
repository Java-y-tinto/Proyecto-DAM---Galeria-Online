// product.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe } from '@angular/common';
import {  ProductoComponent } from '../../components/producto/producto.component';

interface ProductoDetalle {
  id: string;
  nombre: string;
  precio: number;
  imagenes: string[];
  categoria: string;
  descripcion: string;
  // Otros campos que puedas necesitar
}

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
  imports: [CurrencyPipe, ProductoComponent],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss'
})
export class ProductComponent implements OnInit {
  productoId: string = '';
  producto: ProductoDetalle | null = null;
  imagenesProducto: string[] = [];
  productosRelacionados: ProductoRelacionado[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Obtener el ID del producto de los parámetros de la URL
    this.route.params.subscribe(params => {
      this.productoId = params['id'];
      if (this.productoId) {
        this.cargarProducto();
      }
    });
  }

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

  // Añadir al carrito
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