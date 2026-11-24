import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ROOT = process.cwd();
const ALLOWED_DOC = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'image/pjpeg',
]);
const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png']);
const EXT_MIME = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

function safeName(original) {
  const cleaned = path.basename(original).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${crypto.randomBytes(8).toString('hex')}_${cleaned}`;
}

function isAllowedUpload(file) {
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    return { ok: false, error: 'Please choose a file.' };
  }
  if (!file.name || !file.size) {
    return { ok: false, error: 'Please choose a file.' };
  }
  const ext = path.extname(file.name || '').slice(1).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: 'Only PDF, JPG, and PNG files are allowed.' };
  }
  const mime = String(file.type || '').toLowerCase();
  // Some browsers/OS send an empty or odd MIME; trust the extension when MIME is missing.
  if (mime && !ALLOWED_DOC.has(mime) && mime !== 'application/octet-stream') {
    return { ok: false, error: 'Only PDF, JPG, and PNG files are allowed.' };
  }
  return { ok: true, ext, mime: ALLOWED_DOC.has(mime) ? mime : EXT_MIME[ext] };
}

export async function saveDocument(file, studentDeficiencyId) {
  const check = isAllowedUpload(file);
  if (!check.ok) return check;
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) return { ok: false, error: 'File exceeds maximum size of 5 MB.' };
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
    type: check.mime,
  };
}

export async function saveProfile(file, userId) {
  const check = isAllowedUpload(file);
  if (!check.ok) return check;
  if (!['jpg', 'jpeg', 'png'].includes(check.ext)) {
    return { ok: false, error: 'Only JPG/PNG images allowed.' };
  }
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Image must be under 2 MB.' };
  const ext = check.ext === 'jpeg' ? 'jpg' : check.ext;
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
