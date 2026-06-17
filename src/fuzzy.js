import { hasMatch, score } from 'fzy.js';

function entryToString(entry) {
  return [entry.pid, entry.name, entry.port, entry.user, entry.cwd, entry.command, entry.project]
    .filter(Boolean)
    .join(' ');
}

export function fuzzyFilter(entries, term) {
  if (!term) return entries;

  const lower = term.toLowerCase();
  return entries
    .filter((e) => hasMatch(lower, entryToString(e).toLowerCase()))
    .sort((a, b) => score(lower, entryToString(b).toLowerCase()) - score(lower, entryToString(a).toLowerCase()));
}
