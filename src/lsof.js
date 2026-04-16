import { execFileSync } from 'node:child_process';

export function parseLsofOutput(raw) {
  if (!raw.trim()) return [];

  const lines = raw.trim().split('\n');
  const entries = [];
  let current = {};

  for (const line of lines) {
    const tag = line[0];
    const value = line.slice(1);

    switch (tag) {
      case 'p':
        current = { pid: Number(value) };
        break;
      case 'c':
        current.name = value.replace(/[\x00-\x1f\x7f-\x9f]/g, '');
        break;
      case 'L':
        current.user = value;
        break;
      case 'n': {
        // Extract port from formats: *:3000, 127.0.0.1:3000, [::1]:3000
        const portMatch = value.match(/:(\d+)$/);
        if (portMatch) {
          current.port = Number(portMatch[1]);
          entries.push({ ...current });
        }
        break;
      }
      // Ignore other tags (f, P, etc.)
    }
  }

  // Deduplicate by pid+port
  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.pid}:${e.port}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getLsofEntries(port) {
  const tcpFilter = port !== undefined ? `-iTCP:${port}` : '-iTCP';
  const args = [tcpFilter, '-sTCP:LISTEN', '-F', 'pcnPLi'];

  try {
    const output = execFileSync('lsof', args, { encoding: 'utf-8' });
    return parseLsofOutput(output);
  } catch (err) {
    // lsof exits with 1 when no results found
    if (err.status === 1 && !err.stderr) {
      return [];
    }
    // lsof not installed
    if (err.code === 'ENOENT') {
      console.error('Error: lsof is not installed. Please install lsof and try again.');
      process.exit(1);
    }
    throw err;
  }
}
