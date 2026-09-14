import { PrismaClient } from '@prisma/client';

// We create Prisma once and reuse it everywhere that needs the database.
// This keeps database code simple and avoids opening unnecessary connections.
export const prisma = new PrismaClient();
