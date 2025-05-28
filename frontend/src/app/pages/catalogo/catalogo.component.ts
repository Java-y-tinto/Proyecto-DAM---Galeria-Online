// src/app/pages/catalog/catalog.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
// 1. Importa ActivatedRoute, RouterLink y lo que necesites
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, Subscription } from 'rxjs'; // Para gestionar la suscripción al observable
// Importa tus otros componentes y servicios
import { ProductoComponent } from '../../components/producto/producto.component';
import { BreadcrumbsComponent, BreadcrumbItem } from '../../components/breadcrumbs/breadcrumbs.component';
// import { ProductService } from '../../core/services/product.service'; // Importarías tu servicio aquí
import { GraphqlService, Product } from '../../services/graphql.service';

// Interfaces...
interface FiltroData {
  label: string;
  checked: boolean;
}

interface FiltroAgrupado {
  atributo: string;
  valores: FiltroData[];
  mostrarTodos: boolean; // para expandir o contraer
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, ProductoComponent, BreadcrumbsComponent],
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss']
})
export class CatalogComponent implements OnInit, OnDestroy {
  // Ya NO necesitamos @Input() para la categoría

  categoriaActual: string = ""; // Propiedad para guardar la categoría leída
  tituloPagina: string = 'Catálogo';
  productos: Product[] = [];
  filtrosDisponibles: FiltroAgrupado[] = [];
  breadcrumbItems: BreadcrumbItem[] = [];
  cargando = false;
  private routeSub: Subscription | undefined; // Variable para guardar la suscripción

  // 2. Inyecta ActivatedRoute en el constructor
  constructor(
    private route: ActivatedRoute,
    private dbService: GraphqlService
    // , private productService: ProductService // <-- Inyectarías tu servicio aquí
  ) { }

 toggleFiltro(grupo: FiltroAgrupado, valor: FiltroData): void {
  valor.checked = !valor.checked;
}

get productosFiltrados(): Product[] {
  const filtrosActivos: { [key: string]: string[] } = {};

  this.filtrosDisponibles.forEach(grupo => {
    const seleccionados = grupo.valores
      .filter(f => f.checked)
      .map(f => f.label.toLowerCase());
    if (seleccionados.length > 0) {
      filtrosActivos[grupo.atributo.toLowerCase()] = seleccionados;
    }
  });

  if (Object.keys(filtrosActivos).length === 0) {
    return this.productos;
  }

  return this.productos.filter(producto => {
    return Object.entries(filtrosActivos).every(([atributo, valoresSeleccionados]) => {
      return producto.attributes?.some(attr =>
        attr.name.toLowerCase() === atributo &&
        valoresSeleccionados.includes(attr.values[0].name.toLowerCase())
      );
    });
  });
}

  ngOnInit(): void {
    console.log('CatalogComponent inicializado.');
    // 3. Suscríbete al Observable paramMap (RECOMENDADO)
    this.routeSub = this.route.paramMap.subscribe(params => {
      // Este código se ejecuta CADA VEZ que cambian los parámetros de la ruta

      // 4. Lee el parámetro 'categoria' (debe coincidir con :categoria en app.routes.ts)
      const categoriaParam = params.get('categoria');
      console.log('Nuevo parámetro de categoría recibido:', categoriaParam); // Para depurar

      if (categoriaParam) {
        this.categoriaActual = categoriaParam;
        // 5. Llama a la lógica para actualizar la página con la nueva categoría
        this.actualizarPagina();
      } else {
        // Manejar el caso en que el parámetro no exista (opcional)
        console.error("Parámetro 'categoria' no encontrado en la URL.");
        this.categoriaActual = "null";
        this.tituloPagina = 'Categoría no válida';
        this.breadcrumbItems = [{ label: 'Inicio', url: '/' }, { label: 'Error' }];
        this.productos = [];
        this.filtrosDisponibles = [];
      }
    });

    /* --- Alternativa con Snapshot (Menos recomendada para este caso) ---
    const categoriaSnapshot = this.route.snapshot.paramMap.get('categoria');
    console.log('Categoría leída con snapshot:', categoriaSnapshot);
    if (categoriaSnapshot) {
      this.categoriaActual = categoriaSnapshot;
      this.actualizarPagina();
    } else {
      console.error("Parámetro 'categoria' no encontrado en snapshot.");
    }
    */
  }

  ngOnDestroy(): void {
    // 6. Desuscribirse del observable para evitar fugas de memoria cuando el componente se destruye
    this.routeSub?.unsubscribe();
    console.log('CatalogComponent destruido, desuscrito de paramMap.');
  }

  actualizarPagina(): void {
    if (!this.categoriaActual) return; // No hacer nada si no hay categoría

    const categoriaCapitalizada = this.capitalize(this.categoriaActual);
    this.tituloPagina = `Pinturas ${categoriaCapitalizada}`; // Actualiza título
    this.breadcrumbItems = [ // Actualiza breadcrumbs
      { label: 'Inicio', url: '/' },
      { label: categoriaCapitalizada }
    ];
    var prueba: BreadcrumbItem = { label: 'Prueba', url: '/' };
    this.cargarDatosSimulados(); // Llama a cargar los datos (filtros y productos)
  }

  cargarDatosSimulados(): void {
  if (!this.categoriaActual) return;
  this.cargando = true;
  this.productos = [];
  this.filtrosDisponibles = [];

  this.dbService.getProductsByCategory(this.categoriaActual!).subscribe((res) => {
    this.productos = res;

    const agrupados: { [atributo: string]: Set<string> } = {};

    res.forEach(producto => {
      producto.attributes?.forEach(attr => {
        const nombre = this.capitalize(attr.name);
        if (!agrupados[nombre]) {
          agrupados[nombre] = new Set();
        }
        //agrupados[nombre].add();
        attr.values.forEach(val => {
          agrupados[nombre].add(val.name);
        })
      });
    });

    this.filtrosDisponibles = Object.entries(agrupados).map(([atributo, valores]) => ({
      atributo,
      mostrarTodos: false,
      valores: Array.from(valores).map(v => ({
        label: v,
        checked: false
      }))
    }));

    this.cargando = false;
  });
}



  // ... (resto de funciones helper: getSimulatedFilters, getSimulatedProducts, capitalize) ...

  //getSimulatedProducts(cat: string): ProductoData[] { this.productos.push({ id: 'producto1', nombre: 'Producto 1', precio: '100', imageSrc: '', categoria: cat, descripcion: 'Descripción del producto 1' }); return this.productos; }
  capitalize(s: string): string { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
}