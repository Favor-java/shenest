import jwt from 'jsonwebtoken';

// Create a token after a user registers or logs in.
export function createToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || 'development-secret-change-me',
    { expiresIn: '7d' },
  );
}

// Read the logged-in user from the Authorization header.
// The frontend will send: Authorization: Bearer <token>
export function getUserFromRequest(request) {
  const header = request.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'development-secret-change-me');
  } catch {
    return null;
  }
}

export function requireUser(context) {
  if (!context.user) throw new Error('You need to log in first.');
  return context.user;
}
