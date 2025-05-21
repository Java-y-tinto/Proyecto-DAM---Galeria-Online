import { Injectable } from '@angular/core';
import { Apollo,gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApolloClient,InMemoryCache } from '@apollo/client/core';

// --- Interfaz para el Producto ---
// Define una interfaz que coincida con los campos que pides en tu query
// y que devuelve tu typeDef 'Product' en el backend.


export interface AttributeValue {
  id: number;
  name: string;
  html_color?: string;
}

export interface ProductAttribute {
  id: number;
  name: string;
  display_type: string;
  values: AttributeValue[];
}

export interface VariantAttributeValue {
  id: number;
  product_attribute_value_id: [number, string];
  price_extra: number;
}

export interface Product {
  id: string;
  name: string;
  list_price: number;
  image_1920: string;
  image_512: string;
  attributes?: ProductAttribute[];
  variant_attributes?: VariantAttributeValue[];
}

export interface internalUser {
  JWT: string;
}
export interface loginResponse {
    login: {
      token: string;
      _typename: string;
    }
  }

export type AuthPayload = {
  token: string
  success: boolean
  message: string

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
    id
    name
    list_price
    image_1920
    image_512
    attributes {
      name
      values {
        name
      }
    }
  }
  }
`;

const REGISTER_USER_MUTATION = gql`
  mutation registerUser($name: String!, $email: String!, $passwd: String!) {
    registerUser(name: $name, email: $email, passwd: $passwd) {
        success
        message
        token
    }
}
`;

const LOGIN_USER_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
        token
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

  getProductById(id: string): Observable<Product> {
    return this.apollo
      .query<{ productById: Product }>({
        query: GET_PRODUCT_BY_ID,
        variables: { id },
      })
      .pipe(
        map((result) => result.data.productById)
      );
  }
  registerUser(name: string, email: string, passwd: string) {
    return this.apollo.mutate({
      mutation: REGISTER_USER_MUTATION,
      variables: { name, email, passwd },
    });
  }
  loginUser(email: string, password: string) {
    return this.apollo.mutate({
      mutation: LOGIN_USER_MUTATION,
      variables: { email, password },
    });
  }
}
