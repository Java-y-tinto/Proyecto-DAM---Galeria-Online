export const typeDefs = `#graphql
type AttributeValue {
  id: Int
  name: String
  html_color: String
}

type ProductAttribute {
  id: Int
  name: String
  display_type: String
  values: [AttributeValue]
}

type VariantAttributeValue {
  id: Int
  product_attribute_value_id: AttributeValue 
  price_extra: Float
}

type Product {
  id: String
  name: String
  image_1920: String
  image_512: String
  list_price: Float
  x_featured: Boolean 
  category: String
  create_date: String
  attributes: [ProductAttribute]
  variant_attributes: [VariantAttributeValue]
}

input ProductUpdateInput {
  name: String
  list_price: Float
  image_1920: String
  x_featured: Boolean
}

input ProductCreateInput {
  name: String!
  list_price: Float!
  image_1920: String
  x_featured: Boolean
  categ_id: Int
  type: String
  sale_ok: Boolean
}

type AuthPayload {
  token: String
  success: Boolean!
  message: String!
}

type CartOperationResult {
  success: Boolean!
  message: String!
  order_id: Int
  line_id: Int
  order_name: String
  access_url: String
}

type ProductOperationResult {
  success: Boolean!
  message: String!
  product_id: Int
  product: Product
}

type ProductDeleteResult {
  success: Boolean!
  message: String!
  product_id: Int
}


type CartOrder {
  id: Int!
  name: String!
  amount_total: Float!
  amount_tax: Float!
  amount_untaxed: Float!
  access_url: String
}

type CartLine {
  id: Int!
  product: Product
  display_name: String!
  product_uom_qty: Float!
  price_unit: Float!
  price_subtotal: Float!
}

type Cart {
  order: CartOrder!
  lines: [CartLine!]!
}

type Query {
  products: [Product!]!
  productsByCategory(categoryName: String!): [Product!]!
  productById(id: String!): Product
  searchProducts(searchTerm: String!): [Product!] 
  getRelatedProducts(productId: String!, limit: Int): [Product!]!
  getFeaturedProducts: [Product!]
  getNewestProducts: [Product!]!
  getPartnerId: Int
  getCart: Cart
}

type Mutation {
  login(email: String!, password: String!): AuthPayload
  registerUser(name: String!, email: String!, passwd: String!): AuthPayload
  addToCart(productId: Int!): CartOperationResult!
  removeFromCart(lineId: Int!): CartOperationResult!
  clearCart: CartOperationResult!
  checkoutCart: CartOperationResult!
  updateProduct(id: Int!, input: ProductUpdateInput!): ProductOperationResult!
  createProduct(input: ProductCreateInput!): ProductOperationResult!
  deleteProduct(id: Int!): ProductDeleteResult!
}
`;