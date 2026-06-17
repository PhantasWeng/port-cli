import { basename } from 'node:path';

export function parsePsOutput(raw) {
  const map = new Map();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const sp = trimmed.indexOf(' ');
    if (sp === -1) continue;
    const pid = Number(trimmed.slice(0, sp));
    const command = trimmed.slice(sp + 1).trim();
    if (Number.isInteger(pid) && command) map.set(pid, command);
  }
  return map;
}

export function parseCwdOutput(raw) {
  const map = new Map();
  let pid = null;
  for (const line of raw.split('\n')) {
    const tag = line[0];
    const value = line.slice(1);
    if (tag === 'p') pid = Number(value);
    else if (tag === 'n' && pid !== null) map.set(pid, value);
  }
  return map;
}

export function mergeEnrichment(entries, commandMap, cwdMap) {
  return entries.map((e) => {
    const cwd = cwdMap.get(e.pid) ?? null;
    const command = commandMap.get(e.pid) ?? null;
    return { ...e, cwd, command, project: cwd ? basename(cwd) : null };
  });
}
