import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: JWTPayload;
    }
  }
}

const jwksUrl = process.env.NEON_AUTH_JWKS_URL;
const issuer = process.env.NEON_AUTH_ISSUER ?? process.env.NEON_AUTH_BASE_URL;

if (!jwksUrl || !issuer) {
  throw new Error('NEON_AUTH_JWKS_URL and NEON_AUTH_BASE_URL are required for API authentication');
}

const jwks = createRemoteJWKSet(new URL(jwksUrl));

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const verifyOptions = process.env.NEON_AUTH_AUDIENCE
      ? { issuer, audience: process.env.NEON_AUTH_AUDIENCE }
      : { issuer };
    const { payload } = await jwtVerify(token, jwks, verifyOptions);
    req.auth = payload;
    next();
  } catch (error) {
    console.error('Invalid authentication token', error);
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}