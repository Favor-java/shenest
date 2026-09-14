import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { auth } from '../middleware/auth.js';

export const uploadsRouter = express.Router();

const uploadDir = path.resolve('uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, done) => {
    const extension = path.extname(file.originalname).toLowerCase();
    done(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, done) => {
    if (!file.mimetype.startsWith('image/')) return done(new Error('Only image files are allowed.'));
    done(null, true);
  },
});

uploadsRouter.post('/property-image', auth, (req, res, next) => {
  if (req.user.role !== 'LANDLORD') return res.status(403).json({ message: 'Only landlord accounts can upload property images.' });
  next();
}, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Please choose an image.' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(201).json({ url });
});
