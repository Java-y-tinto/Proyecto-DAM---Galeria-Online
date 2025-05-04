import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { CatalogComponent } from './pages/catalogo/catalogo.component';
import { ProductComponent } from './pages/product/product.component';

export const routes: Routes = [
    {path: '', component: HomePageComponent, title: 'Galeria online de Paqui Robles' },
    {path: 'catalogo/:categoria', component: CatalogComponent, title: 'Catalogo de productos'},
    {path: 'producto/:id', component: ProductComponent, title: 'Producto'},
    {path: '**', redirectTo: ''}
];
