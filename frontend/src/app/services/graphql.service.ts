import { Injectable } from '@angular/core';
import { Apollo,gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApolloClient,InMemoryCache } from '@apollo/client/core';

// --- Interfaz para el Producto ---
// Define una interfaz que coincida con los campos que pides en tu query
// y que devuelve tu typeDef 'Product' en el backend.
export interface Product {
  id: string; // O string si tu backend devuelve string
  name: string;
  list_price: number;
  image_1920: string;
  image_512: string;
  // Añade aquí cualquier otro campo que devuelva tu query y necesites
  // Ejemplo: description?: string; imageUrl?: string;
}

// --- Define la Query GraphQL ---
// Escribe la query tal como la probarías en Apollo Sandbox o similar.
// Usa variables GraphQL ($categoryName) para pasar datos dinámicos.
const GET_PRODUCTS_BY_CATEGORY = gql`
  query ProductsByCategory($categoryName: String!) {
    productsByCategory(categoryName: $categoryName) {
      # Pide aquí los campos exactos que definiste en la interfaz Product
      id
      name
      list_price
      image_1920
      image_512
      # ejemplo: description
      # ejemplo: image_url
    }
  }
`;

const GET_PRODUCT_BY_ID = gql`
  query ProductById($id: String!) {
    productById(id: $id) {
      # Pide aquí los campos exactos que definiste en la interfaz Product
      id
      name
      list_price
      image_1920
      # ejemplo: description
    }
  }
`;

@Injectable({
  providedIn: 'root'
})
export class GraphqlService {

  constructor(private apollo: Apollo) { }
  getProductsByCategory(categoryName: string): Observable<Product[]> {
    return this.apollo
      .query<{ productsByCategory: Product[] }>({
        query: GET_PRODUCTS_BY_CATEGORY,
        variables: { categoryName },
      })
      .pipe(
        map((result) =>  result.data.productsByCategory)
      );
  }

  getProductById(id: string): Observable<Product | null> {
    return this.apollo
      .query<{ productById: Product | null }>({
        query: GET_PRODUCT_BY_ID,
        variables: { id },
      })
      .pipe(
        map((result) => result.data?.productById ?? null)
      );
  }
      
}
