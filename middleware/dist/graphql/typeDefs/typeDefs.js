export const typeDefs = `#graphql
  type Product {
    id: Int
    name: String
    image_1920: String
    image_512: String
    list_price: Float
  }

  type AuthPayload {
    token: String!
  }

  type Query {
    products: [Product!]!
    productsByCategory(categoryName: String!): [Product!]!
    productById(id: String!): Product!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload
  }
`;
