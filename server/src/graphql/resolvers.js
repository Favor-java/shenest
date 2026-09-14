// We start with simple in-memory data so the GraphQL flow is easy to understand.
// Prisma will replace this array when we connect PostgreSQL.
const properties = [
  { id: '1', title: 'Cozy Studio in Lekki', location: 'Lekki, Lagos', price: 350000, type: 'Studio', verified: true, image: null },
  { id: '2', title: 'Bright Room in Yaba', location: 'Yaba, Lagos', price: 220000, type: 'Shared apartment', verified: true, image: null },
  { id: '3', title: 'Modern Apartment in Ikeja', location: 'Ikeja, Lagos', price: 480000, type: 'Apartment', verified: true, image: null },
];

export const resolvers = {
  Query: {
    hello: () => 'SheNest GraphQL API is working!',

    // Return every property.
    properties: () => properties,

    // Find one property whose id matches the id sent by the frontend.
    property: (_, { id }) => properties.find((property) => property.id === id) ?? null,
  },
};
