import bcrypt from 'bcryptjs';
import { createToken, requireUser } from '../utils/auth.js';

// These arrays are intentionally temporary. They make it possible to learn and test
// the complete GraphQL flow before we switch the same resolvers to Prisma/PostgreSQL.
const users = [];
const favorites = [];
const bookings = [];
const reviews = [];

const properties = [
  { id: '1', title: 'Cozy Studio in Lekki', description: 'A calm studio close to shops and transport.', location: 'Lekki, Lagos', price: 350000, type: 'Studio', verified: true, image: null, ownerId: 'demo-landlord' },
  { id: '2', title: 'Bright Room in Yaba', description: 'A bright private room in a shared apartment.', location: 'Yaba, Lagos', price: 220000, type: 'Shared apartment', verified: true, image: null, ownerId: 'demo-landlord' },
  { id: '3', title: 'Modern Apartment in Ikeja', description: 'A modern apartment in a quiet neighbourhood.', location: 'Ikeja, Lagos', price: 480000, type: 'Apartment', verified: true, image: null, ownerId: 'demo-landlord' },
];

function nextId(items) {
  return String(items.length + 1);
}

export const resolvers = {
  Query: {
    hello: () => 'SheNest GraphQL API is working!',

    properties: (_, { search, type }) => {
      let result = properties;

      if (search) {
        const text = search.toLowerCase();
        result = result.filter((property) =>
          `${property.title} ${property.location}`.toLowerCase().includes(text),
        );
      }

      if (type) result = result.filter((property) => property.type === type);
      return result;
    },

    property: (_, { id }) => properties.find((property) => property.id === id) ?? null,

    myFavorites: (_, __, context) => {
      const user = requireUser(context);
      const propertyIds = favorites.filter((item) => item.userId === user.userId).map((item) => item.propertyId);
      return properties.filter((property) => propertyIds.includes(property.id));
    },

    myBookings: (_, __, context) => {
      const user = requireUser(context);
      return bookings.filter((booking) => booking.userId === user.userId);
    },
  },

  Mutation: {
    register: async (_, { name, email, password }) => {
      if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
      }

      const user = {
        id: nextId(users),
        name,
        email: email.toLowerCase(),
        password: await bcrypt.hash(password, 10),
        role: 'USER',
      };

      users.push(user);
      return { token: createToken(user), user };
    },

    login: async (_, { email, password }) => {
      const user = users.find((item) => item.email === email.toLowerCase());
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Email or password is incorrect.');
      }
      return { token: createToken(user), user };
    },

    createProperty: (_, input, context) => {
      const user = requireUser(context);
      const property = {
        id: nextId(properties),
        ...input,
        verified: false,
        ownerId: user.userId,
      };
      properties.push(property);
      return property;
    },

    toggleFavorite: (_, { propertyId }, context) => {
      const user = requireUser(context);
      const index = favorites.findIndex((item) => item.userId === user.userId && item.propertyId === propertyId);

      if (index >= 0) {
        favorites.splice(index, 1);
        return false;
      }

      favorites.push({ userId: user.userId, propertyId });
      return true;
    },

    requestBooking: (_, { propertyId, message }, context) => {
      const user = requireUser(context);
      const booking = { id: nextId(bookings), propertyId, userId: user.userId, message, status: 'PENDING' };
      bookings.push(booking);
      return booking;
    },

    addReview: (_, { propertyId, rating, comment }, context) => {
      const user = requireUser(context);
      if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.');
      const review = { id: nextId(reviews), propertyId, userId: user.userId, rating, comment };
      reviews.push(review);
      return review;
    },

    verifyProperty: (_, { propertyId }, context) => {
      const user = requireUser(context);
      if (user.role !== 'ADMIN') throw new Error('Only an admin can verify properties.');
      const property = properties.find((item) => item.id === propertyId);
      if (!property) throw new Error('Property not found.');
      property.verified = true;
      return property;
    },
  },
};
