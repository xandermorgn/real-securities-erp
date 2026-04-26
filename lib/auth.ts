import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[auth] FATAL: JWT_SECRET environment variable is not set. Set it in .env.local.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
}
const SECRET = JWT_SECRET || 'dev-only-insecure-fallback-do-not-use-in-prod';

export const TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours

export interface TokenPayload {
  userId: string;
  role: 'owner' | 'admin' | 'field_officer' | 'staff';
  email: string;
  name: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_MAX_AGE_SECONDS });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
