import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed data gives a fresh local database something useful to display immediately.
  const landlord = await prisma.user.upsert({
    where: { email: 'landlord@shenest.test' },
    update: {},
    create: {
      name: 'Demo Landlord',
      email: 'landlord@shenest.test',
      password: await bcrypt.hash('password123', 10),
      role: 'LANDLORD',
    },
  });

  const count = await prisma.property.count();
  if (count === 0) {
    await prisma.property.createMany({
      data: [
        { title: 'Cozy Studio in Lekki', description: 'A calm studio close to shops and transport.', location: 'Lekki, Lagos', price: 350000, type: 'Studio', verified: true, ownerId: landlord.id, imageUrl: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80' },
        { title: 'Bright Room in Yaba', description: 'A bright private room in a shared apartment.', location: 'Yaba, Lagos', price: 220000, type: 'Shared apartment', verified: true, ownerId: landlord.id, imageUrl: 'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=80' },
        { title: 'Modern Apartment in Ikeja', description: 'A modern apartment in a quiet neighbourhood.', location: 'Ikeja, Lagos', price: 480000, type: 'Apartment', verified: true, ownerId: landlord.id, imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80' },
      ],
    });
  }

  console.log('SheNest seed complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
