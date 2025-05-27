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
  x_sold: Boolean
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
}
`;