import { json, requireStaff } from '@/lib/auth';
import { many, one, query } from '@/lib/db';
import { logAction } from '@/lib/notify';

export async function GET() {
  const { error } = await requireStaff();
  if (error) return error;
  return json({ ok: true, types: await many('SELECT * FROM deficiency_types ORDER BY deficiency_name') });
}

export async function POST(request) {
  const { user, error } = await requireStaff();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const action = body.action || 'create';
  const name = String(body.deficiency_name || '').trim();
  const desc = String(body.description || '').trim();
  const req = String(body.required_document || '').trim();
  const id = Number(body.deficiency_id || 0);

  if (action === 'create') {
    if (!name || !req) return json({ ok: false, error: 'Name and required document are required.' }, 422);
    const row = await one(
      'INSERT INTO deficiency_types (deficiency_name, description, required_document) VALUES ($1,$2,$3) RETURNING *',
      [name, desc || null, req]
    );
    await logAction(user.user_id, `Created deficiency type: ${name}`);
    return json({ ok: true, type: row });
  }

  if (action === 'update' && id > 0) {
    if (!name || !req) return json({ ok: false, error: 'Name and required document are required.' }, 422);
    await query(
      'UPDATE deficiency_types SET deficiency_name=$1, description=$2, required_document=$3 WHERE deficiency_id=$4',
      [name, desc || null, req, id]
    );
    await logAction(user.user_id, `Updated deficiency type #${id}`);
    return json({ ok: true });
  }

  if (action === 'delete' && id > 0) {
    try {
      await query('DELETE FROM deficiency_types WHERE deficiency_id=$1', [id]);
      await logAction(user.user_id, `Deleted deficiency type #${id}`);
      return json({ ok: true });
    } catch {
      return json({ ok: false, error: 'Cannot delete: this type is assigned to students.' }, 409);
    }
  }

  return json({ ok: false, error: 'Invalid action.' }, 422);
}
