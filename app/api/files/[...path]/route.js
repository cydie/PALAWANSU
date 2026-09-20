import fs from 'fs/promises';
import path from 'path';
import { requireUser, json } from '@/lib/auth';
import { resolveUpload } from '@/lib/upload';

export async function GET(_request, context) {
  const { error } = await requireUser();
  if (error) return error;
  const parts = (await context.params).path || [];
  const relative = parts.join('/');
  const abs = resolveUpload(relative);
  if (!abs) return json({ ok: false, error: 'Not found' }, 404);
  try {
    const data = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const types = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    return new Response(data, {
      headers: {
        'Content-Type': types[ext] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${path.basename(abs)}"`,
      },
    });
  } catch {
    return json({ ok: false, error: 'Not found' }, 404);
  }
}
