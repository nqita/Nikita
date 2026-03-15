import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { EralUser } from '../types';

interface WokSpecPayload extends JWTPayload {
  email: string;
  display_name: string;
  avatar_url: string | null;
}

/** Verify a WokSpec JWT (shared secret with WokAPI). */
export async function verifyToken(token: string, secret: string): Promise<EralUser | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify<WokSpecPayload>(token, key, {
      issuer: 'https://api.wokspec.org',
      audience: 'https://wokspec.org',
    });
    if (!payload.sub || !payload.email) return null;
    return {
      id: payload.sub,
      email: payload.email,
      displayName: payload.display_name,
      avatarUrl: payload.avatar_url,
    };
  } catch {
    return null;
  }
}

/** Sign a short-lived internal token (e.g. for service-to-service calls). */
export async function signInternalToken(userId: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('5m')
    .setIssuer('https://nikita.wokspec.org')
    .setAudience('https://api.wokspec.org')
    .sign(key);
}
