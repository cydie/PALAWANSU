import bcrypt from 'bcryptjs';
import { one } from '@/lib/db';
import { json, fail, homePath, publicUser } from '@/lib/auth';
import { createSession } from '@/lib/session';
import { logAction } from '@/lib/notify';

async function passwordMatches(plain, hash) {
  if (!hash || !String(hash).startsWith('$2')) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login || !password) {
      return json({ ok: false, error: 'Please enter your username/email and password.' }, 422);
    }

    const user = await one('SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1', [login]);
    if (user && (!user.password || user.password === 'RUN_SEED_PHP' || !String(user.password).startsWith('$2'))) {
      return json({
        ok: false,
        error: 'Staff accounts are not seeded yet. Run npm run seed, then sign in again.',
      }, 500);
    }
    if (!user || !(await passwordMatches(password, user.password))) {
      try {
        await logAction(null, `Failed login attempt for: ${login}`);
      } catch {
        // ignore audit log if the database is only partly set up
      }
      return json({ ok: false, error: 'Invalid username/email or password.' }, 401);
    }
    if (user.status !== 'Active') {
      return json({ ok: false, error: 'Your account is inactive. Contact the registrar.' }, 403);
    }

    await createSession(user);
    await logAction(user.user_id, 'Logged in');
    return json({ ok: true, user: publicUser(user), redirect: homePath(user.role) });
  } catch (err) {
    return fail(err);
  }
}
