import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, tap,catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApolloClient, ApolloQueryResult, InMemoryCache } from '@apollo/client/core';

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
  x_sold: boolean;
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
  order_id: number
  line_id: number
  order_name: String
  access_url: String
}

export type CartOrder = {
  id: number
  name: String
  amount_total: number
  amount_tax: number
  amount_untaxed: number
  access_url: String
}

export type CartLine = {
  id: number
  product: Product

}
export type Cart = {
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
      x_sold
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
    x_sold
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
  query GetCart {
    getCart {
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
        product {
          id
          name
          list_price
          image_512
        }
        display_name
        product_uom_qty
        price_unit
        price_subtotal
      }
    }
  }
`;


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

const ADD_TO_CART_MUTATION = gql`
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
const REMOVE_FROM_CART_MUTATION = gql`
  mutation RemoveFromCart($lineId: Int!) {
    removeFromCart(lineId: $lineId) {
      success
      message
      order_id
      line_id
      order_name
      access_url
    }
  }
`;

const CLEAR_CART_MUTATION = gql`
  mutation ClearCart {
    clearCart {
      success
      message
      order_id
      line_id
      order_name
      access_url
    }
  }
`;

const CHECKOUT_CART_MUTATION = gql`
  mutation CheckoutCart {
    checkoutCart {
      success
      message
      order_id
      line_id
      order_name
      access_url
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
        map((result) => result.data.productsByCategory)
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
     console.log('🚀 [GraphQL Service] *** INICIANDO addToCart ***');
  console.log('🚀 [GraphQL Service] ProductId:', productId, 'Tipo:', typeof productId);
  
    return this.apollo.mutate({
      mutation: ADD_TO_CART_MUTATION,
      variables: { productId },
    }).pipe(
      tap(result => {
        console.log('📥 [GraphQL Service] *** RESPUESTA APOLLO ***');
        console.log('📥 [GraphQL Service] result completo:', result);
        console.log('📥 [GraphQL Service] result.data:', result.data);
        console.log('📥 [GraphQL Service] result.errors:', result.errors);
        console.log('📥 [GraphQL Service] result.loading:', result.loading);
      }),
      map((result) => {
                console.log('🔄 [GraphQL Service] *** MAPEANDO RESULTADO ***');
        
        if (result.errors && result.errors.length > 0) {
          console.error('❌ [GraphQL Service] GraphQL Errors:', result.errors);
          return {
            success: false,
            message: result.errors[0]?.message || 'Error GraphQL'
          };
        }
        
        if (!result.data) {
          console.error('❌ [GraphQL Service] No hay data en la respuesta');
          return {
            success: false,
            message: 'Sin datos en la respuesta'
          };
        }
        
        
        
        const finalResult = (result as any).data.addToCart;
        console.log('✅ [GraphQL Service] Resultado procesado:', finalResult);
        return finalResult;
      }),
      catchError(error => {
        console.error('💥 [GraphQL Service] Error en pipe:', error);
        return of({
          success: false,
          message: 'Error de conexión: ' + error.message
        });
      })
    )
  }
  getCart(): Observable<Cart | null> {
    console.log('🚀 [GraphQL Service] Iniciando query getCart...');

    return this.apollo
      .query<{ getCart: Cart | null }>({
        query: GET_USER_CART,
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      })
      .pipe(
        tap((result: any) => {
          console.log('📥 [GraphQL Service] Respuesta getCart recibida:', result);
        }),
        map((result: ApolloQueryResult<{ getCart: Cart | null }>) => {
          if (result.errors) {
            console.error('❌ [GraphQL Service] Errores en getCart:', result.errors);
            return null;
          }
          console.log('✅ [GraphQL Service] getCart exitoso:', result.data.getCart);
          return result.data.getCart;
        })
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

  removeFromCart(lineId: number): Observable<CartOperationResult> {
    console.log('🚀 [GraphQL Service] Removiendo producto del carrito, lineId:', lineId);

    return this.apollo
      .mutate<{ removeFromCart: CartOperationResult }>({
        mutation: REMOVE_FROM_CART_MUTATION,
        variables: { lineId },
      })
      .pipe(
        tap(result => {
          console.log('📥 [GraphQL Service] Respuesta removeFromCart:', result);
        }),
        map((result) => {
          if (result.errors) {
            return {
              success: false, // Provide a default value for success
              message: 'Error al remover producto del carrito',
            } as unknown as CartOperationResult; // Cast to CartOperationResult
          }
          return result.data!.removeFromCart;
        })
      );
  }

  // NUEVA: Vaciar carrito completo
  clearCart(): Observable<CartOperationResult> {
    console.log('🚀 [GraphQL Service] Vaciando carrito...');

    return this.apollo
      .mutate<{ clearCart: CartOperationResult }>({
        mutation: CLEAR_CART_MUTATION,
      })
      .pipe(
        tap(result => {
          console.log('📥 [GraphQL Service] Respuesta clearCart:', result);
        }),
        map((result) => {
          if (result.errors) {
            console.error('❌ [GraphQL Service] Errores en clearCart:', result.errors);
            return {
              success: false,
              message: 'Error al vaciar el carrito'
            } as unknown as CartOperationResult;
          }
          return result.data!.clearCart;
        })
      );
  }

  // NUEVA: Proceder al checkout
  checkoutCart(): Observable<CartOperationResult> {
    console.log('🚀 [GraphQL Service] Iniciando checkout...');

    return this.apollo
      .mutate<{ checkoutCart: CartOperationResult }>({
        mutation: CHECKOUT_CART_MUTATION,
      })
      .pipe(
        tap(result => {
          console.log('📥 [GraphQL Service] Respuesta checkoutCart:', result);
        }),
        map((result) => {
          if (result.errors) {
            console.error('❌ [GraphQL Service] Errores en checkoutCart:', result.errors);
            return {
              success: false,
              message: 'Error al procesar el pedido'
            } as unknown as CartOperationResult;
          }
          return result.data!.checkoutCart;
        })
      );
  }

}
