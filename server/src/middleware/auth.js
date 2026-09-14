import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: 'Please log in first.' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
    next();
  } catch {
    res.status(401).json({ message: 'Your login has expired. Please log in again.' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Admin access required.' });
  next();
}
