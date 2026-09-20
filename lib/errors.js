export function friendlyDbError(err) {
  const code = err?.code || err?.cause?.code;
  const message = err?.message || 'Unexpected server error';

  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return 'PostgreSQL password is wrong. In .env.local set PGPASSWORD and DATABASE_URL to the password you chose when installing PostgreSQL 18, save, then restart npm run dev.';
  }
  if (code === '3D000' || /does not exist/i.test(message)) {
    return 'Database palawansu_deficiency does not exist yet. Run npm run db:init then npm run seed.';
  }
  if (code === '42P01' || /does not exist/i.test(message) && /relation/i.test(message)) {
    return 'Database tables are missing. Run npm run db:init then npm run seed.';
  }
  if (code === 'ECONNREFUSED') {
    return 'Cannot reach PostgreSQL on 127.0.0.1:5432. Start the PostgreSQL 18 Windows service, then try again.';
  }
  if (code === 'ECONNRESET' || /ECONNRESET/i.test(message)) {
    return 'PostgreSQL closed the connection. This usually means the password in .env.local is wrong, or the database is still starting. Fix PGPASSWORD, restart npm run dev, then try again.';
  }
  return message;
}
