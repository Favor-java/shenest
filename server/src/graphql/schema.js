export const typeDefs = `#graphql
  type User { id: ID!, name: String!, email: String!, role: String! }
  type AuthPayload { token: String!, user: User! }
  type Property { id: ID!, title: String!, description: String!, location: String!, price: Int!, type: String!, verified: Boolean!, image: String, ownerId: ID! }
  type Booking { id: ID!, propertyId: ID!, userId: ID!, message: String, status: String! }
  type Review { id: ID!, propertyId: ID!, userId: ID!, rating: Int!, comment: String }
  type RoommateProfile { id: ID!, userId: ID!, bio: String!, location: String!, budget: Int!, moveIn: String, lifestyle: String, user: User! }
  type Message { id: ID!, text: String!, senderId: ID!, receiverId: ID!, sender: User!, receiver: User! }

  type Query {
    hello: String!
    properties(search: String, type: String): [Property!]!
    property(id: ID!): Property
    myFavorites: [Property!]!
    myBookings: [Booking!]!
    myProperties: [Property!]!
    propertyReviews(propertyId: ID!): [Review!]!
    roommateProfiles(location: String): [RoommateProfile!]!
    myRoommateProfile: RoommateProfile
    messagesWith(userId: ID!): [Message!]!
    pendingProperties: [Property!]!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createProperty(title: String!, description: String!, location: String!, price: Int!, type: String!, image: String): Property!
    toggleFavorite(propertyId: ID!): Boolean!
    requestBooking(propertyId: ID!, message: String): Booking!
    addReview(propertyId: ID!, rating: Int!, comment: String): Review!
    saveRoommateProfile(bio: String!, location: String!, budget: Int!, moveIn: String, lifestyle: String): RoommateProfile!
    sendMessage(receiverId: ID!, text: String!): Message!
    verifyProperty(propertyId: ID!): Property!
  }
`;
