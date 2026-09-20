import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'palawansu_session';

function secret() {
  const value = process.env.SESSION_SECRET || 'dev-only-change-me';
  return new TextEncoder().encode(value);
}

export async function createSession(user) {
  const token = await new SignJWT({
    user_id: Number(user.user_id),
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function readSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}
