import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i <= 0) continue;
    const key = line.slice(0, i).trim();
    if (process.env[key] === undefined) process.env[key] = line.slice(i + 1).trim();
  }
}

loadEnv();

function cfg(database) {
  return {
    host: process.env.PGHOST || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database,
    connectionTimeoutMillis: 3000,
  };
}

async function tryConnect(database) {
  const client = new Client(cfg(database));
  try {
    await client.connect();
    await client.end();
    return true;
  } catch {
    try {
      await client.end();
    } catch {
      // ignore
    }
    return false;
  }
}

export async function ensureDb() {
  const dbName = process.env.PGDATABASE || 'palawansu_deficiency';
  const started = Date.now();
  process.stdout.write('Waiting for PostgreSQL');
  while (!(await tryConnect('postgres'))) {
    if (Date.now() - started > 60000) {
      console.log('');
      throw new Error('PostgreSQL did not become ready. Start Docker Desktop, then run: docker compose up --build');
    }
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.log(' ready');

  const admin = new Client(cfg('postgres'));
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) {
    await admin.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database ${dbName}`);
  }
  await admin.end();

  const app = new Client(cfg(dbName));
  await app.connect();
  const tables = await app.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`
  );
  if (!tables.rowCount) {
    const schema = fs.readFileSync(path.join(process.cwd(), 'sql', 'schema.sql'), 'utf8');
    await app.query(schema);
    console.log('Schema loaded from sql/schema.sql');
  } else {
    console.log('Database schema already present');
  }
  await app.end();
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) await ensureDb();
