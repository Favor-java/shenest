import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createToken, requireUser } from '../utils/auth.js';

// Resolvers are simply functions that answer GraphQL queries and mutations.
// Prisma does the database work, so each resolver can stay short and readable.
export const resolvers = {
  Property: {
    // The database calls this field imageUrl, while GraphQL exposes the shorter name image.
    image: (property) => property.imageUrl,
  },

  Query: {
    hello: () => 'SheNest GraphQL API is working!',

    properties: (_, { search, type }) => prisma.property.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      orderBy: { createdAt: 'desc' },
    }),

    property: (_, { id }) => prisma.property.findUnique({ where: { id } }),

    myFavorites: async (_, __, context) => {
      const user = requireUser(context);
      const favorites = await prisma.favorite.findMany({
        where: { userId: user.userId },
        include: { property: true },
      });
      return favorites.map((favorite) => favorite.property);
    },

    myBookings: (_, __, context) => {
      const user = requireUser(context);
      return prisma.booking.findMany({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Mutation: {
    register: async (_, { name, email, password }) => {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) throw new Error('An account with this email already exists.');
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.');

      const user = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10),
        },
      });

      return { token: createToken(user), user };
    },

    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        throw new Error('Email or password is incorrect.');
      }
      return { token: createToken(user), user };
    },

    createProperty: (_, { image, ...input }, context) => {
      const user = requireUser(context);
      return prisma.property.create({
        data: {
          ...input,
          imageUrl: image || null,
          ownerId: user.userId,
        },
      });
    },

    toggleFavorite: async (_, { propertyId }, context) => {
      const user = requireUser(context);
      const favorite = await prisma.favorite.findUnique({
        where: { userId_propertyId: { userId: user.userId, propertyId } },
      });

      if (favorite) {
        await prisma.favorite.delete({ where: { id: favorite.id } });
        return false;
      }

      await prisma.favorite.create({ data: { userId: user.userId, propertyId } });
      return true;
    },

    requestBooking: (_, { propertyId, message }, context) => {
      const user = requireUser(context);
      return prisma.booking.create({
        data: { propertyId, userId: user.userId, message },
      });
    },

    addReview: (_, { propertyId, rating, comment }, context) => {
      const user = requireUser(context);
      if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.');
      return prisma.review.create({
        data: { propertyId, userId: user.userId, rating, comment },
      });
    },

    verifyProperty: async (_, { propertyId }, context) => {
      const user = requireUser(context);
      if (user.role !== 'ADMIN') throw new Error('Only an admin can verify properties.');
      return prisma.property.update({
        where: { id: propertyId },
        data: { verified: true },
      });
    },
  },
};
