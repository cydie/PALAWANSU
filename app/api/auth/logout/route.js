import { json, currentUser } from '@/lib/auth';
import { clearSession } from '@/lib/session';
import { logAction } from '@/lib/notify';

export async function POST() {
  const user = await currentUser();
  if (user) {
    await logAction(user.user_id, 'Logged out');
  }
  await clearSession();
  return json({ ok: true });
}
