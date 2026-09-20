export function friendlyDbError(err) {
  const code = err?.code || err?.cause?.code;
  const message = err?.message || 'Unexpected server error';

  if (code === '28P01' || /password authentication failed/i.test(message)) {
    return 'The app is talking to a local PostgreSQL instead of Docker. Stop the Windows PostgreSQL service, then run: docker compose up --build';
  }
  if (code === '3D000' || /does not exist/i.test(message)) {
    return 'Database palawansu_deficiency does not exist yet. Run: docker compose up --build';
  }
  if (code === '42P01' || /does not exist/i.test(message) && /relation/i.test(message)) {
    return 'Database tables are missing. Run: docker compose up --build';
  }
  if (code === 'ECONNREFUSED') {
    return 'Cannot reach PostgreSQL. Open Docker Desktop, then run: docker compose up --build';
  }
  if (code === 'ECONNRESET' || /ECONNRESET/i.test(message)) {
    return 'PostgreSQL closed the connection. Open Docker Desktop, then run: docker compose up --build';
  }
  return message;
}
