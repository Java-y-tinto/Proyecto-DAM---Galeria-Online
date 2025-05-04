import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router'; // Necesario para enlaces

// Interfaz para definir la estructura de cada item del breadcrumb
export interface BreadcrumbItem {
  label: string;
  url?: string; // La URL es opcional (el último item no suele tenerla)
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink], // Importamos RouterLink para los enlaces
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.scss']
})
export class BreadcrumbsComponent {
  @Input() items: BreadcrumbItem[] = []; // Recibe un array de items como entrada
}