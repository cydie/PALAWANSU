import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const ALLOWED_DOC = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png']);

function safeName(original) {
  const cleaned = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${crypto.randomBytes(8).toString('hex')}_${cleaned}`;
}

export async function saveDocument(file, studentDeficiencyId) {
  if (!file) return { ok: false, error: 'Please choose a file.' };
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, error: 'File exceeds maximum size of 5 MB.' };
  const ext = path.extname(file.name || '').slice(1).toLowerCase();
  if (!ALLOWED_EXT.has(ext) || !ALLOWED_DOC.has(file.type)) {
    return { ok: false, error: 'Only PDF, JPG, and PNG files are allowed.' };
  }
  const dir = path.join(ROOT, 'uploads', 'documents', String(studentDeficiencyId));
  await fs.mkdir(dir, { recursive: true });
  const name = safeName(file.name);
  const dest = path.join(dir, name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return {
    ok: true,
    name: path.basename(file.name),
    path: `documents/${studentDeficiencyId}/${name}`,
    type: file.type,
  };
}

export async function saveProfile(file, userId) {
  if (!file) return { ok: false, error: 'Please choose an image.' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Image must be under 2 MB.' };
  if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
    return { ok: false, error: 'Only JPG/PNG images allowed.' };
  }
  const ext = path.extname(file.name || '').slice(1).toLowerCase() || 'jpg';
  const dir = path.join(ROOT, 'uploads', 'profiles');
  await fs.mkdir(dir, { recursive: true });
  const name = `user_${userId}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, path: `profiles/${name}` };
}

export function resolveUpload(relativePath) {
  const clean = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!clean.startsWith('documents/') && !clean.startsWith('profiles/')) return null;
  const abs = path.join(ROOT, 'uploads', clean);
  if (!abs.startsWith(path.join(ROOT, 'uploads'))) return null;
  return abs;
}
