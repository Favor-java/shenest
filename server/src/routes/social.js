import express from 'express';
import { db } from '../db.js';
import { auth } from '../middleware/auth.js';

export const socialRouter = express.Router();

socialRouter.get('/favorites', auth, (req, res) => {
  const rows = db.prepare('SELECT p.* FROM favorites f JOIN properties p ON p.id = f.property_id WHERE f.user_id = ? ORDER BY p.id DESC').all(req.user.userId);
  res.json(rows);
});

socialRouter.post('/favorites/:propertyId', auth, (req, res) => {
  const existing = db.prepare('SELECT 1 FROM favorites WHERE user_id = ? AND property_id = ?').get(req.user.userId, req.params.propertyId);
  if (existing) { db.prepare('DELETE FROM favorites WHERE user_id = ? AND property_id = ?').run(req.user.userId, req.params.propertyId); return res.json({ saved: false }); }
  db.prepare('INSERT INTO favorites (user_id, property_id) VALUES (?, ?)').run(req.user.userId, req.params.propertyId);
  res.json({ saved: true });
});

socialRouter.post('/bookings', auth, (req, res) => {
  const { propertyId, message } = req.body;
  const result = db.prepare('INSERT INTO bookings (user_id, property_id, message) VALUES (?, ?, ?)').run(req.user.userId, propertyId, message || null);
  res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid));
});

socialRouter.get('/reviews/:propertyId', (req, res) => {
  res.json(db.prepare('SELECT * FROM reviews WHERE property_id = ? ORDER BY id DESC').all(req.params.propertyId));
});

socialRouter.post('/reviews/:propertyId', auth, (req, res) => {
  const rating = Number(req.body.rating);
  if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
  const result = db.prepare('INSERT INTO reviews (user_id, property_id, rating, comment) VALUES (?, ?, ?, ?)').run(req.user.userId, req.params.propertyId, rating, req.body.comment || null);
  res.status(201).json(db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid));
});

socialRouter.get('/roommates', (req, res) => {
  const search = `%${req.query.location || ''}%`;
  res.json(db.prepare('SELECT rp.*, u.name FROM roommate_profiles rp JOIN users u ON u.id = rp.user_id WHERE rp.location LIKE ? ORDER BY rp.id DESC').all(search));
});

socialRouter.put('/roommates/me', auth, (req, res) => {
  const { bio, location, budget, moveIn, lifestyle } = req.body;
  const existing = db.prepare('SELECT id FROM roommate_profiles WHERE user_id = ?').get(req.user.userId);
  if (existing) db.prepare('UPDATE roommate_profiles SET bio=?, location=?, budget=?, move_in=?, lifestyle=? WHERE user_id=?').run(bio, location, Number(budget), moveIn || null, lifestyle || null, req.user.userId);
  else db.prepare('INSERT INTO roommate_profiles (user_id, bio, location, budget, move_in, lifestyle) VALUES (?, ?, ?, ?, ?, ?)').run(req.user.userId, bio, location, Number(budget), moveIn || null, lifestyle || null);
  res.json(db.prepare('SELECT * FROM roommate_profiles WHERE user_id = ?').get(req.user.userId));
});

socialRouter.get('/messages/:userId', auth, (req, res) => {
  const rows = db.prepare(`SELECT m.*, s.name sender_name, r.name receiver_name FROM messages m JOIN users s ON s.id=m.sender_id JOIN users r ON r.id=m.receiver_id WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY m.id ASC`).all(req.user.userId, req.params.userId, req.params.userId, req.user.userId);
  res.json(rows);
});

socialRouter.post('/messages/:userId', auth, (req, res) => {
  const text = req.body.text?.trim();
  if (!text) return res.status(400).json({ message: 'Message cannot be empty.' });
  const result = db.prepare('INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)').run(req.user.userId, req.params.userId, text);
  res.status(201).json(db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid));
});
