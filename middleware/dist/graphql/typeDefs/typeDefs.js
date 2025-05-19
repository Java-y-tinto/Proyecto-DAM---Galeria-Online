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
  attributes: [ProductAttribute]
  variant_attributes: [VariantAttributeValue]
}

type AuthPayload {
  token: String!
}

type Query {
  products: [Product!]!
  productsByCategory(categoryName: String!): [Product!]!
  productById(id: String!): Product
}

type Mutation {
  login(email: String!, password: String!): AuthPayload
  registerUser(name: String!, email: String!, passwd: String!): AuthPayload
}
`;
