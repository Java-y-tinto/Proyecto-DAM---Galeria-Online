import { Injectable } from '@angular/core';
import { Apollo,gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApolloClient,ApolloQueryResult,InMemoryCache } from '@apollo/client/core';

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

export type CartOperationResult = {
  success: Boolean
  message: String
  order_id: Number
  line_id: Number
  order_name: String
  access_url: String
}

export type CartOrder = {
  id: Number
  name: String
  amount_total: Number
  amount_tax: Number
  amount_untaxed: Number
  access_url: String
}

export type CartLine = {
  id: Number
  product: Product

}
export type Cart  = {
  order: CartOrder
  lines: [CartLine]
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

const GET_USER_CART = gql`
  query getCart($userId: String!) {
    getCart(userId: $userId) {
      order {
        id
        name
        amount_total
        amount_tax
        amount_untaxed
        access_url
      }
      lines {
        id
        product_id
        product_uom_qty
        price_unit
        price_subtotal
        display_name
      }
    }
  }
`

const GET_PARTNER_ID = gql`
query getPartnerId {
  getPartnerId
}
`

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

const ADD_TO_CART_MUTATION = gql `
mutation addToCart($productId: Int!) {
  addToCart(productId: $productId) {
    success
    message
    order_id
    line_id
    order_name
    access_url
  }
}
`


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
  addToCart(productId: number) {
    return this.apollo.mutate({
      mutation: ADD_TO_CART_MUTATION,
      variables: { productId },
    });
  }
  getUserCart(userId: string ) {
    return this.apollo
      .query<{ getUserCart: Cart }>({
        query: GET_USER_CART,
        variables: { userId },
      })
      .pipe(
        map((result) => result.data.getUserCart)
      );
  }
   getPartnerId(): Observable<ApolloQueryResult<{ getPartnerId: number; }>> {
    return this.apollo
      .query<{ getPartnerId: number }>({
        query: GET_PARTNER_ID,
        fetchPolicy: 'network-only'
      })
      .pipe(
        map((result) => result)
      );
  }
}
