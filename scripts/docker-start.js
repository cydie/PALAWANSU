import { spawn } from 'node:child_process';
import path from 'node:path';
import { ensureDb } from './ensure-db.js';

await ensureDb();
await import('./seed.js');

const nextBin = path.join(process.cwd(), 'node_modules/next/dist/bin/next');
const child = spawn(process.execPath, [nextBin, 'start', '-H', '0.0.0.0', '-p', '3000'], {
  stdio: 'inherit',
  env: process.env,
});

function stop(signal) {
  if (!child.killed) child.kill(signal);
}

process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
child.on('exit', (code) => process.exit(code ?? 0));
