// The GraphQL schema describes the data the React frontend can request or change.
// Keeping the types in one file makes the API easier to understand while learning GraphQL.
export const typeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Property {
    id: ID!
    title: String!
    description: String!
    location: String!
    price: Int!
    type: String!
    verified: Boolean!
    image: String
    ownerId: ID!
  }

  type Booking {
    id: ID!
    propertyId: ID!
    userId: ID!
    message: String
    status: String!
  }

  type Review {
    id: ID!
    propertyId: ID!
    userId: ID!
    rating: Int!
    comment: String
  }

  type Query {
    hello: String!
    properties(search: String, type: String): [Property!]!
    property(id: ID!): Property
    myFavorites: [Property!]!
    myBookings: [Booking!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    createProperty(
      title: String!
      description: String!
      location: String!
      price: Int!
      type: String!
      image: String
    ): Property!

    toggleFavorite(propertyId: ID!): Boolean!
    requestBooking(propertyId: ID!, message: String): Booking!
    addReview(propertyId: ID!, rating: Int!, comment: String): Review!
    verifyProperty(propertyId: ID!): Property!
  }
`;
