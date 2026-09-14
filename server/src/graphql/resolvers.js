import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { createToken, requireUser } from '../utils/auth.js';

export const resolvers = {
  Property: { image: (property) => property.imageUrl },

  Query: {
    hello: () => 'SheNest GraphQL API is working!',
    properties: (_, { search, type }) => prisma.property.findMany({ where: { ...(type ? { type } : {}), ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { location: { contains: search, mode: 'insensitive' } }] } : {}) }, orderBy: { createdAt: 'desc' } }),
    property: (_, { id }) => prisma.property.findUnique({ where: { id } }),

    myFavorites: async (_, __, context) => {
      const user = requireUser(context);
      const items = await prisma.favorite.findMany({ where: { userId: user.userId }, include: { property: true } });
      return items.map((item) => item.property);
    },
    myBookings: (_, __, context) => { const user = requireUser(context); return prisma.booking.findMany({ where: { userId: user.userId }, orderBy: { createdAt: 'desc' } }); },
    myProperties: (_, __, context) => { const user = requireUser(context); return prisma.property.findMany({ where: { ownerId: user.userId }, orderBy: { createdAt: 'desc' } }); },
    propertyReviews: (_, { propertyId }) => prisma.review.findMany({ where: { propertyId }, orderBy: { createdAt: 'desc' } }),

    roommateProfiles: (_, { location }) => prisma.roommateProfile.findMany({ where: location ? { location: { contains: location, mode: 'insensitive' } } : {}, include: { user: true }, orderBy: { createdAt: 'desc' } }),
    myRoommateProfile: (_, __, context) => { const user = requireUser(context); return prisma.roommateProfile.findUnique({ where: { userId: user.userId }, include: { user: true } }); },

    messagesWith: (_, { userId }, context) => {
      const user = requireUser(context);
      return prisma.message.findMany({ where: { OR: [{ senderId: user.userId, receiverId: userId }, { senderId: userId, receiverId: user.userId }] }, include: { sender: true, receiver: true }, orderBy: { createdAt: 'asc' } });
    },

    pendingProperties: (_, __, context) => {
      const user = requireUser(context);
      if (user.role !== 'ADMIN') throw new Error('Admin access required.');
      return prisma.property.findMany({ where: { verified: false }, orderBy: { createdAt: 'asc' } });
    },
  },

  Mutation: {
    register: async (_, { name, email, password }) => {
      const normalizedEmail = email.toLowerCase().trim();
      if (await prisma.user.findUnique({ where: { email: normalizedEmail } })) throw new Error('An account with this email already exists.');
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.');
      const user = await prisma.user.create({ data: { name: name.trim(), email: normalizedEmail, password: await bcrypt.hash(password, 10) } });
      return { token: createToken(user), user };
    },
    login: async (_, { email, password }) => {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (!user || !(await bcrypt.compare(password, user.password))) throw new Error('Email or password is incorrect.');
      return { token: createToken(user), user };
    },
    createProperty: (_, { image, ...input }, context) => { const user = requireUser(context); return prisma.property.create({ data: { ...input, imageUrl: image || null, ownerId: user.userId } }); },
    toggleFavorite: async (_, { propertyId }, context) => { const user = requireUser(context); const favorite = await prisma.favorite.findUnique({ where: { userId_propertyId: { userId: user.userId, propertyId } } }); if (favorite) { await prisma.favorite.delete({ where: { id: favorite.id } }); return false; } await prisma.favorite.create({ data: { userId: user.userId, propertyId } }); return true; },
    requestBooking: (_, { propertyId, message }, context) => { const user = requireUser(context); return prisma.booking.create({ data: { propertyId, userId: user.userId, message } }); },
    addReview: (_, { propertyId, rating, comment }, context) => { const user = requireUser(context); if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5.'); return prisma.review.create({ data: { propertyId, userId: user.userId, rating, comment } }); },

    saveRoommateProfile: (_, input, context) => {
      const user = requireUser(context);
      return prisma.roommateProfile.upsert({ where: { userId: user.userId }, update: input, create: { ...input, userId: user.userId }, include: { user: true } });
    },
    sendMessage: (_, { receiverId, text }, context) => {
      const user = requireUser(context);
      if (!text.trim()) throw new Error('Message cannot be empty.');
      if (receiverId === user.userId) throw new Error('You cannot message yourself.');
      return prisma.message.create({ data: { senderId: user.userId, receiverId, text: text.trim() }, include: { sender: true, receiver: true } });
    },
    verifyProperty: (_, { propertyId }, context) => { const user = requireUser(context); if (user.role !== 'ADMIN') throw new Error('Only an admin can verify properties.'); return prisma.property.update({ where: { id: propertyId }, data: { verified: true } }); },
  },
};
