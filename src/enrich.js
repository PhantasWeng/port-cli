import { basename } from 'node:path';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

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

export function shortenHome(p, home = homedir()) {
  if (!p) return p;
  if (p === home) return '~';
  if (home && p.startsWith(home + '/')) return '~' + p.slice(home.length);
  return p;
}

export function detailLine(entry, home = homedir()) {
  const parts = [];
  if (entry.cwd) parts.push(shortenHome(entry.cwd, home));
  if (entry.command) parts.push(entry.command);
  return parts.length ? parts.join(' · ') : null;
}

export function inlineLabel(entry) {
  const base = `[PID ${entry.pid}] ${entry.name} :${entry.port} (${entry.user})`;
  return entry.project ? `${base} — ${entry.project}` : base;
}

export function getCommands(pids) {
  if (pids.length === 0) return new Map();
  try {
    const out = execFileSync('ps', ['-p', pids.join(','), '-o', 'pid=,command='], { encoding: 'utf-8' });
    return parsePsOutput(out);
  } catch {
    return new Map();
  }
}

export function getCwds(pids) {
  if (pids.length === 0) return new Map();
  try {
    const out = execFileSync('lsof', ['-w', '-a', '-p', pids.join(','), '-d', 'cwd', '-F', 'pn'], { encoding: 'utf-8' });
    return parseCwdOutput(out);
  } catch {
    return new Map();
  }
}

export function enrichEntries(entries) {
  if (entries.length === 0) return entries;
  const pids = [...new Set(entries.map((e) => e.pid))];
  return mergeEnrichment(entries, getCommands(pids), getCwds(pids));
}
