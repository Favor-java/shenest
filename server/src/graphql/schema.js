// The GraphQL schema describes the data our frontend is allowed to request.
export const typeDefs = `#graphql
  type Property {
    id: ID!
    title: String!
    location: String!
    price: Int!
    type: String!
    verified: Boolean!
    image: String
  }

  type Query {
    hello: String!
    properties: [Property!]!
    property(id: ID!): Property
  }
`;
