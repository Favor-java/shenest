import bcrypt from 'bcryptjs';
import { db } from './db.js';

// Run with: node src/seed.js
// These accounts are only for local development/testing.
const password = await bcrypt.hash('password123', 10);

function ensureUser(name, email, role) {
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name, email, password, role);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  }
  return user;
}

const landlord = ensureUser('Demo Landlord', 'landlord@shenest.test', 'LANDLORD');
ensureUser('SheNest Admin', 'admin@shenest.test', 'ADMIN');
ensureUser('Ada Roommate', 'ada@shenest.test', 'USER');

if (db.prepare('SELECT COUNT(*) count FROM properties').get().count === 0) {
  const insert = db.prepare('INSERT INTO properties (title, description, location, price, type, image, verified, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  insert.run('Cozy Studio in Lekki', 'A calm studio close to shops and transport.', 'Lekki, Lagos', 350000, 'Studio', 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80', 1, landlord.id);
  insert.run('Bright Room in Yaba', 'A bright private room in a shared apartment.', 'Yaba, Lagos', 220000, 'Shared apartment', 'https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=900&q=80', 1, landlord.id);
}

console.log('Seed complete. Demo password for all test accounts: password123');
