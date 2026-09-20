import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

function loadEnv() {
  const file = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}

loadEnv();

const dbName = process.env.PGDATABASE || 'palawansu_deficiency';
const base = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
};

const admin = new Client({ ...base, database: 'postgres' });
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (!exists.rowCount) {
  await admin.query(`CREATE DATABASE ${dbName}`);
  console.log(`Created database ${dbName}`);
} else {
  console.log(`Database ${dbName} already exists`);
}
await admin.end();

const app = new Client({ ...base, database: dbName });
await app.connect();
const schema = fs.readFileSync(path.join(process.cwd(), 'sql', 'schema.sql'), 'utf8');
await app.query(schema);
await app.end();
console.log('Schema loaded from sql/schema.sql');
