import { hasMatch, score } from 'fzy.js';

function entryToString(entry) {
  return `${entry.pid} ${entry.name} ${entry.port} ${entry.user}`;
}

export function fuzzyFilter(entries, term) {
  if (!term) return entries;

  const lower = term.toLowerCase();
  return entries
    .filter((e) => hasMatch(lower, entryToString(e).toLowerCase()))
    .sort((a, b) => score(lower, entryToString(b).toLowerCase()) - score(lower, entryToString(a).toLowerCase()));
}
