import express from 'express';
import { db } from '../db.js';
import { auth, adminOnly } from '../middleware/auth.js';

export const propertiesRouter = express.Router();

propertiesRouter.get('/', (req, res) => {
  const search = `%${req.query.search || ''}%`;
  const type = req.query.type || '';
  const sql = type
    ? 'SELECT * FROM properties WHERE (title LIKE ? OR location LIKE ?) AND type = ? ORDER BY id DESC'
    : 'SELECT * FROM properties WHERE title LIKE ? OR location LIKE ? ORDER BY id DESC';
  res.json(type ? db.prepare(sql).all(search, search, type) : db.prepare(sql).all(search, search));
});

propertiesRouter.get('/mine', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM properties WHERE owner_id = ? ORDER BY id DESC').all(req.user.userId));
});

propertiesRouter.get('/pending', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM properties WHERE verified = 0 ORDER BY id ASC').all());
});

propertiesRouter.get('/:id', (req, res) => {
  const property = db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id);
  if (!property) return res.status(404).json({ message: 'Property not found.' });
  res.json(property);
});

propertiesRouter.post('/', auth, (req, res) => {
  if (req.user.role !== 'LANDLORD') return res.status(403).json({ message: 'Only landlord accounts can create property listings.' });
  const { title, description, location, price, type, image } = req.body;
  if (!title || !description || !location || !price || !type) return res.status(400).json({ message: 'Please complete all required fields.' });
  const result = db.prepare('INSERT INTO properties (title, description, location, price, type, image, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(title, description, location, Number(price), type, image || null, req.user.userId);
  res.status(201).json(db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid));
});

propertiesRouter.patch('/:id/verify', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE properties SET verified = 1 WHERE id = ?').run(req.params.id);
  res.json(db.prepare('SELECT * FROM properties WHERE id = ?').get(req.params.id));
});
