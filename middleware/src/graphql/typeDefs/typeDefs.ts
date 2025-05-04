

export const typeDefs = `#graphql
  type Product {
    id: Int
    name: String
    list_price: Float
  }

  type AuthPayload {
    token: String!
  }

  type Query {
    products: [Product!]!
    productsByCategory(categoryName: String!): [Product!]!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload
  }
`;
