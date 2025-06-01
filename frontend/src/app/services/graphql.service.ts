import { inject, Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApolloClient, ApolloQueryResult, InMemoryCache } from '@apollo/client/core';
import { NotificationService } from './notification.service';

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
  category?: string;
  create_date: string;
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
  success: boolean
  message: string
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
      attributes {
        name
        values {
          name
        }
      }
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

const GET_FEATURED_PRODUCTS = gql`
  query GetFeaturedProducts {
    getFeaturedProducts {
      id
      name
      list_price
      image_1920
      image_512
      category
    }
  }
`;
const GET_NEWEST_PRODUCTS = gql`
  query GetNewestProducts {
    getNewestProducts {
      id
      name
      list_price
      image_1920
      image_512
      category
      create_date
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

const GET_RELATED_PRODUCTS = gql`
query getRelatedProducts($productId: String!, $limit: Int!) {
  getRelatedProducts(productId: $productId, limit: $limit) {
    id
    name
    list_price
    image_1920
    image_512
  }
}`

const GET_PARTNER_ID = gql`
query getPartnerId {
  getPartnerId
}
`

const SEARCH_PRODUCTS = gql`
query searchProducts($searchTerm: String!) {
  searchProducts(searchTerm: $searchTerm) {
    id
    name
    list_price
    image_1920
    image_512
    
  }
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
  private notificationService = inject(NotificationService);


  constructor(private apollo: Apollo) { }

  private handleGraphQLError(error: any, operationName: string = 'Operación') {
    console.error(`❌ [GraphQL Service] Error en ${operationName}:`, error);

    let errorMessage = 'Ha ocurrido un error inesperado';

    if (error.graphQLErrors && error.graphQLErrors.length > 0) {
      errorMessage = error.graphQLErrors[0].message;
    } else if (error.networkError) {
      errorMessage = 'Error de conexión. Verifique su conexión a internet.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    this.notificationService.showError(errorMessage, `Error en ${operationName}`);
    return of(null)
  }

  private handleOperationResult<T extends { success: boolean; message: string }>(
    result: T,
    successMessage?: string,
    operationName: string = 'Operación'
  ): T {
    if (!result.success) {
      this.notificationService.showError(result.message, `Error en ${operationName}`);
    } else if (successMessage) {
      this.notificationService.showSuccess(successMessage, operationName);
    }
    return result;
  }

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
  getFeaturedProducts(): Observable<Product[]> {
    return this.apollo
      .query<{ getFeaturedProducts: Product[] }>({
        query: GET_FEATURED_PRODUCTS,
      })
      .pipe(
        map((result) => result.data.getFeaturedProducts)
      );
  }
  getNewestProducts(): Observable<Product[]> {
    return this.apollo
      .query<{ getNewestProducts: Product[] }>({
        query: GET_NEWEST_PRODUCTS,
        fetchPolicy: 'network-only' // Siempre obtener datos frescos
      })
      .pipe(
        map((result) => result.data.getNewestProducts)
      );
  }
  getRelatedProducts(id: string, limit: number): Observable<Product[]> {
    return this.apollo
      .query<{ getRelatedProducts: Product[] }>({
        query: GET_RELATED_PRODUCTS,
        variables: { productId: id, limit },
      })
      .pipe(
        map((result) => result.data.getRelatedProducts)
      );
  }
   registerUser(name: string, email: string, passwd: string) {
    return this.apollo.mutate({
      mutation: REGISTER_USER_MUTATION,
      variables: { name, email, passwd },
    }).pipe(
      map((result: any) => {
        const authResult = result.data.registerUser;
        return this.handleOperationResult(
          authResult,
          authResult.success ? 'Cuenta creada exitosamente' : undefined,
          'Registro de usuario'
        );
      }),
      catchError(error => {
        this.handleGraphQLError(error, 'Registro de usuario');
        return of({
          success: false,
          message: 'Error al registrar usuario',
          token: null
        });
      })
    );
  }
  loginUser(email: string, password: string) {
    return this.apollo.mutate({
      mutation: LOGIN_USER_MUTATION,
      variables: { email, password },
    }).pipe(
      map((result: any) => {
        if (result.data?.login?.token) {
          this.notificationService.showSuccess('Sesión iniciada correctamente', 'Inicio de sesión');
          return result;
        } else {
          this.notificationService.showError('Credenciales incorrectas', 'Error de inicio de sesión');
          return null;
        }
      }),
      catchError(error => {
        this.handleGraphQLError(error, 'Inicio de sesión');
        return of(null);
      })
    );
  }
  addToCart(productId: number) {
    
    

    return this.apollo.mutate({
      mutation: ADD_TO_CART_MUTATION,
      variables: { productId },
    }).pipe(
      tap(result => {
      }),
      map((result) => {

        if (result.errors && result.errors.length > 0) {
          console.error('❌ [GraphQL Service] GraphQL Errors:', result.errors);
          const errorResult = {
            success: false,
            message: result.errors[0]?.message || 'Error GraphQL'
          };
          return this.handleOperationResult(errorResult, undefined, 'Añadir al carrito');
        }

        if (!result.data) {
          console.error('❌ [GraphQL Service] No hay data en la respuesta');
          const errorResult = {
            success: false,
            message: 'Sin datos en la respuesta'
          };
          return this.handleOperationResult(errorResult, undefined, 'Añadir al carrito');
        }



        const finalResult = (result as any).data.addToCart;
        return this.handleOperationResult(
          finalResult,
          finalResult.success ? 'Producto añadido al carrito correctamente' : undefined,
          'Añadir al carrito'
        );
      }),
      catchError(error => {
        this.handleGraphQLError(error, 'Añadir al carrito');
        return of({
          success: false,
          message: 'Error de conexión: ' + error.message
        });
      })
    )
  }
  getCart(): Observable<Cart | null> {
    

    return this.apollo
      .query<{ getCart: Cart | null }>({
        query: GET_USER_CART,
        fetchPolicy: 'network-only',
        errorPolicy: 'all'
      })
      .pipe(
        tap((result: any) => {
          
        }),
        map((result: ApolloQueryResult<{ getCart: Cart | null }>) => {
          if (result.errors) {
            console.error('❌ [GraphQL Service] Errores en getCart:', result.errors);
            return null;
          }
          
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
  searchProducts(searchTerm: string): Observable<Product[]> {
    return this.apollo
      .query<{ searchProducts: Product[] }>({
        query: SEARCH_PRODUCTS,
        variables: { searchTerm },
      })
      .pipe(
        map((result) => result.data.searchProducts)
      );
  }
  removeFromCart(lineId: number): Observable<CartOperationResult> {
    

    return this.apollo
      .mutate<{ removeFromCart: CartOperationResult }>({
        mutation: REMOVE_FROM_CART_MUTATION,
        variables: { lineId },
      })
      .pipe(
        tap(result => {
          
        }),
        map((result) => {
          if (result.errors) {
            const errorResult = {
              success: false,
              message: 'Error al remover producto del carrito',
            } as unknown as CartOperationResult;
            return this.handleOperationResult(errorResult, undefined, 'Remover del carrito');
          }

          const finalResult = result.data!.removeFromCart;
          return this.handleOperationResult(
            finalResult,
            finalResult.success ? 'Producto removido del carrito' : undefined,
            'Remover del carrito'
          );
        }),
        catchError(error => {
          this.handleGraphQLError(error, 'Remover del carrito');
          return of({
            success: false,
            message: 'Error de conexión'
          } as unknown as CartOperationResult);
        })
      );
  }


  // NUEVA: Vaciar carrito completo
    clearCart(): Observable<CartOperationResult> {
    

    return this.apollo
      .mutate<{ clearCart: CartOperationResult }>({
        mutation: CLEAR_CART_MUTATION,
      })
      .pipe(
        tap(result => {
          
        }),
        map((result) => {
          if (result.errors) {
            console.error('❌ [GraphQL Service] Errores en clearCart:', result.errors);
            const errorResult = {
              success: false,
              message: 'Error al vaciar el carrito'
            } as CartOperationResult;
            return this.handleOperationResult(errorResult, undefined, 'Vaciar carrito');
          }
          
          const finalResult = result.data!.clearCart;
          return this.handleOperationResult(
            finalResult,
            finalResult.success ? 'Carrito vaciado correctamente' : undefined,
            'Vaciar carrito'
          );
        }),
        catchError(error => {
          this.handleGraphQLError(error, 'Vaciar carrito');
          return of({
            success: false,
            message: 'Error de conexión'
          } as CartOperationResult);
        })
      );
  }

}
