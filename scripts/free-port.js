import { execSync } from 'child_process';

const port = process.argv[2] || '3000';

function listeningPids(p) {
  const out = execSync('netstat -ano', { encoding: 'utf8' });
  const ids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes(`:${p}`) || !line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (pid && pid !== '0' && pid !== String(process.pid)) ids.add(pid);
  }
  return [...ids];
}

const pids = listeningPids(port);
for (const pid of pids) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    console.log(`Freed port ${port} (stopped PID ${pid})`);
  } catch {
    // already gone
  }
}
