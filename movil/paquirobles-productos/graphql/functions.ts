import { gql } from '@apollo/client';

// --- INTERFACES  ---
export interface Product {
  id: string;
  name: string;
  list_price: number;
  image_1920: string;
  image_512?: string;
  category?: string;

}

export interface LoginData {
  login: {
    token: string;
     success?: boolean; 
     message?: string;
  };
}
export const CATEGORIES =  [
    {label: 'Óleo', value: 'oleo'},
    {label: 'Acrilico', value: 'acrlico'},
    {label: 'Acuarela', value: 'acuarela'}
]
export interface LoginVars {
  email: string;
  password: string;
}

export interface ProductsByCategoryData {
  productsByCategory: Product[];
}

export interface ProductsByCategoryVars {
  categoryName: string;
}

// --- MUTACIONES ---
export const LOGIN_USER_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
       success 
       message
    }
  }
`;

// --- QUERIES ---
export const GET_PRODUCTS_BY_CATEGORY = gql`
  query ProductsByCategory($categoryName: String!) {
    productsByCategory(categoryName: $categoryName) {
      id
      name
      list_price
      image_1920
      image_512
      category
    }
  }
`;

export const SEARCH_PRODUCTS = gql`
  query SearchProducts($searchTerm: String!) {
    searchProducts(searchTerm: $searchTerm) {
      id
      name
      list_price
      image_1920
      image_512
      category
    }
  }
`;

export const GET_PRODUCT_BY_ID = gql`
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

export interface ProductUpdateInput {
    name?: string;
    list_price?: number;
    categ_id?: number;
    x_featured?: boolean;
    description_sale?: string;
    image_1920?: string;  // Base64 string
    attribute_lines?: Array<{
        attribute_id: number;
        value_ids: number[];
        new_values?: Array<{
            name: string;
            html_color?: string;
        }>;
    }>;
}

export const UPDATE_PRODUCT = gql `
mutation UpdateProduct($id: Int!, $input: ProductUpdateInput!) {
  updateProduct(id: $id, input: $input) {
    success
    message
    product_id
    product {
      id
      name
      list_price
      image_1920
      image_512
      x_featured
      category
    }
  }
}`

export const CREATE_PRODUCT = gql`
mutation CreateProduct($input: ProductCreateInput!) {
  createProduct(input: $input) {
    success
    message
    product_id
    product {
      id
      name
      list_price
      image_1920
      image_512
      x_featured
      category
      create_date
    }
  }
}`