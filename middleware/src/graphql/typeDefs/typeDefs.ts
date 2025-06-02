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

type ProductDeleteResult {
  success: Boolean!
  message: String!
  product_id: Int
}

input AttributeValueInput {
  name: String!
  html_color: String
}

input ProductAttributeLineInput {
  attribute_id: Int!           # ID del atributo existente (Color, Talla, etc.)
  value_ids: [Int!]!          # IDs de valores existentes
  new_values: [AttributeValueInput!]  # Crear nuevos valores si es necesario
}

input ProductCreateInput {
  name: String!
  list_price: Float!
  categ_id: Int
  x_featured: Boolean
  description_sale: String
  image_1920: String
  attribute_lines: [ProductAttributeLineInput!]  # Atributos a asignar
}

input ProductUpdateInput {
  name: String
  list_price: Float
  categ_id: Int
  x_featured: Boolean
  description_sale: String
  image_1920: String
  attribute_lines: [ProductAttributeLineInput!]  # Actualizar atributos
}

type ProductOperationResult {
  success: Boolean!
  message: String!
  product_id: Int
  template_id: Int
  product: Product
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
  deleteProduct(id: Int!): ProductDeleteResult!
  createProduct(input: ProductCreateInput!): ProductOperationResult!
  updateProduct(id: Int!, input: ProductUpdateInput!): ProductOperationResult!
}
`;