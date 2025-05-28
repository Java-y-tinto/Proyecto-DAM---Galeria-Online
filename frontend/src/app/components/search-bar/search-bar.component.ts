import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GraphqlService, Product } from '../../services/graphql.service';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Observable, Subject, switchMap } from 'rxjs';

@Component({
  selector: 'app-search-bar',
  imports: [CommonModule,FormsModule],
  templateUrl: './search-bar.component.html',
  styleUrl: './search-bar.component.scss'
})
export class SearchBarComponent {
  private graphqlService = inject(GraphqlService);
  private router = inject(Router);
  
  searchTerm = '';
  searchResults: Product[] = [];
  showResults = false;
  isLoading = false;
  
  private searchSubject = new Subject<string>();

  constructor() {
    // Configurar el debounce para la búsqueda
    this.searchSubject.pipe(
      debounceTime(300), // Esperar 300ms después de que el usuario deje de escribir
      distinctUntilChanged(), // Solo buscar si el término cambió
      switchMap(term => {
        if (term.trim().length < 2) {
          return new Observable<Product[]>(observer => {
            observer.next([]);
            observer.complete();
          });
        }
        
        this.isLoading = true;
        return this.graphqlService.searchProducts(term);
      })
    ).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error en búsqueda:', error);
        this.searchResults = [];
        this.isLoading = false;
      }
    });
  }

  onSearchInput(event: any) {
    const term = event.target.value;
    this.searchTerm = term;
    this.searchSubject.next(term);
    this.showResults = true;
  }

  selectProduct(product: Product) {
    // Navegar al producto seleccionado
    // Necesitaremos obtener la categoría del producto o usar una ruta genérica
    this.router.navigate(['/producto', 'busqueda', product.id]);
    this.hideResults();
    this.searchTerm = '';
  }

  hideResults() {
    // Pequeño delay para permitir el click en los resultados
    setTimeout(() => {
      this.showResults = false;
    }, 200);
  }
}
