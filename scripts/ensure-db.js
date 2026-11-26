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

  // Lightweight migrations for existing Docker volumes
  await app.query(`
    ALTER TABLE deficiency_types
      ADD COLUMN IF NOT EXISTS applies_to VARCHAR(100) NOT NULL DEFAULT 'All'
  `);
  await app.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_student_number_unique
      ON users (student_number)
      WHERE student_number IS NOT NULL AND student_number <> ''
  `);
  // Deduplicate open assignments before enforcing uniqueness (keep newest row)
  await app.query(`
    DELETE FROM student_deficiencies sd
    USING student_deficiencies newer
    WHERE sd.user_id = newer.user_id
      AND sd.deficiency_id = newer.deficiency_id
      AND sd.status IN ('Pending','Under Review','Rejected')
      AND newer.status IN ('Pending','Under Review','Rejected')
      AND sd.student_deficiency_id < newer.student_deficiency_id
  `);
  await app.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS student_deficiencies_open_unique
      ON student_deficiencies (user_id, deficiency_id)
      WHERE status IN ('Pending','Under Review','Rejected')
  `);
  await app.query(`
    CREATE TABLE IF NOT EXISTS smtp_settings (
      settings_id INTEGER PRIMARY KEY DEFAULT 1 CHECK (settings_id = 1),
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      host VARCHAR(255) NOT NULL DEFAULT '',
      port INTEGER NOT NULL DEFAULT 587,
      encryption VARCHAR(20) NOT NULL DEFAULT 'tls'
        CHECK (encryption IN ('none', 'tls', 'ssl')),
      username VARCHAR(255) NOT NULL DEFAULT '',
      password VARCHAR(255) NOT NULL DEFAULT '',
      from_email VARCHAR(150) NOT NULL DEFAULT '',
      from_name VARCHAR(150) NOT NULL DEFAULT 'PSU Rizal Registrar',
      reply_to VARCHAR(150) NOT NULL DEFAULT '',
      updated_by INTEGER NULL REFERENCES users(user_id) ON DELETE SET NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await app.query(`
    INSERT INTO smtp_settings (settings_id, enabled, host, port, encryption, from_name)
    VALUES (1, FALSE, '', 587, 'tls', 'PSU Rizal · Office of the Registrar')
    ON CONFLICT (settings_id) DO NOTHING
  `);
  // Allow Pending student accounts awaiting Admin/Registrar approval
  await app.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check
  `);
  await app.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('Active', 'Inactive', 'Pending'))
  `);
  // Academic period for student clearance records
  await app.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS school_year VARCHAR(9) NULL
  `);
  await app.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS semester VARCHAR(20) NULL
  `);
  await app.query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_semester_check
  `);
  await app.query(`
    ALTER TABLE users
      ADD CONSTRAINT users_semester_check
      CHECK (semester IS NULL OR semester IN ('1st Semester', '2nd Semester', 'Midyear'))
  `);
  console.log('Schema migrations applied');
  await app.end();
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) await ensureDb();
