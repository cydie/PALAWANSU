import fs from 'fs/promises';
import path from 'path';
import { requireUser, json, isStaff } from '@/lib/auth';
import { one } from '@/lib/db';
import { resolveUpload } from '@/lib/upload';

function safeDispositionName(name) {
  const cleaned = String(name || 'document')
    .replace(/[\r\n"]/g, '_')
    .replace(/[^\w.\- ()[\]]+/g, '_')
    .trim();
  return cleaned || 'document';
}

export async function GET(request, context) {
  const { user, error } = await requireUser();
  if (error) return error;
  const parts = (await context.params).path || [];
  const relative = parts.join('/');
  const abs = resolveUpload(relative);
  if (!abs) return json({ ok: false, error: 'Not found' }, 404);

  const wantDownload = new URL(request.url).searchParams.get('download') === '1';
  let originalName = path.basename(abs);

  // Staff can open any campus file; students only their own uploads/profile
  if (!isStaff(user.role)) {
    if (relative.startsWith('profiles/')) {
      const mine = await one('SELECT user_id FROM users WHERE user_id=$1 AND profile_image=$2', [
        user.user_id,
        relative,
      ]);
      if (!mine) return json({ ok: false, error: 'Forbidden' }, 403);
    } else if (relative.startsWith('documents/')) {
      const doc = await one(
        `SELECT ud.document_id, ud.file_name
         FROM uploaded_documents ud
         JOIN student_deficiencies sd ON sd.student_deficiency_id = ud.student_deficiency_id
         WHERE ud.file_path = $1 AND sd.user_id = $2
         LIMIT 1`,
        [relative, user.user_id]
      );
      if (!doc) return json({ ok: false, error: 'Forbidden' }, 403);
      if (doc.file_name) originalName = doc.file_name;
    } else {
      return json({ ok: false, error: 'Forbidden' }, 403);
    }
  } else if (relative.startsWith('documents/')) {
    const doc = await one(
      'SELECT file_name FROM uploaded_documents WHERE file_path=$1 LIMIT 1',
      [relative]
    );
    if (doc?.file_name) originalName = doc.file_name;
  }

  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const types = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const disposition = wantDownload ? 'attachment' : 'inline';
    return new Response(data, {
      headers: {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${safeDispositionName(originalName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return json({ ok: false, error: 'Not found' }, 404);
  }
}
