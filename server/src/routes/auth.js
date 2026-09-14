import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const authRouter = express.Router();

function makeToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET || 'development-secret-change-me', { expiresIn: '7d' });
}

authRouter.post('/register', async (req, res) => {
  const { name, email, password, role = 'USER' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  if (!['USER', 'LANDLORD'].includes(role)) return res.status(400).json({ message: 'Invalid account type.' });

  const normalizedEmail = email.toLowerCase().trim();
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail)) return res.status(409).json({ message: 'Email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(name.trim(), normalizedEmail, passwordHash, role);
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ token: makeToken(user), user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase().trim());
  if (!user || !(await bcrypt.compare(password || '', user.password))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json({ token: makeToken(safeUser), user: safeUser });
});
