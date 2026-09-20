import { Pool } from 'pg';

export function dbConfig() {
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'palawansu_deficiency',
    ssl: false,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 30000,
  };
}

const pool = new Pool({
  ...dbConfig(),
  max: 10,
});
pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});
pool.query('SELECT 1').catch(() => {});

export async function query(text, params = []) {
  return pool.query(text, params);
}

export async function one(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function many(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}
