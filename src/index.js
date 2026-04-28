// src/index.js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { search, confirm } from '@inquirer/prompts';
import { fuzzyFilter } from './fuzzy.js';
import { getLsofEntries } from './lsof.js';
import { killProcess } from './kill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const HELP_TEXT = `Usage: port [port_number] [--filter <term>]

Interactive CLI to list listening ports and kill processes.

Arguments:
  port_number        Optional. Filter by specific port (1-65535).

Options:
  --filter <term>    Fuzzy-filter entries before the interactive menu.
  -h, --help         Show this help message and exit.
  -V, --version      Show version number and exit.

Examples:
  port               List all listening ports interactively.
  port 3000          Show processes on port 3000 and offer to kill them.
  port --filter node  Filter ports by process name.`;

export function parseArgs(args) {
  let port = null;
  let filter = null;

  for (let i = 0; i < args.length; i++) {
    const raw = args[i];

    if (raw === '-h' || raw === '--help') {
      console.log(HELP_TEXT);
      process.exit(0);
    }

    if (raw === '-V' || raw === '--version') {
      console.log(pkg.version);
      process.exit(0);
    }

    if (raw === '--filter') {
      filter = args[++i];
      if (!filter) throw new Error('--filter requires a value.');
      continue;
    }

    if (port === null) {
      const num = Number(raw);
      if (!Number.isInteger(num) || num < 1 || num > 65535) {
        throw new Error(`Invalid port: "${raw}". Must be an integer between 1 and 65535.`);
      }
      port = num;
    }
  }

  return { port, filter: port === null ? filter : null };
}

export async function main(args) {
  let parsed;
  try {
    parsed = parseArgs(args);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  try {
    if (parsed.port === null) {
      await listAllMode(parsed.filter);
    } else {
      await singlePortMode(parsed.port);
    }
  } catch (err) {
    if (err.name === 'ExitPromptError' || err.name === 'AbortPromptError') {
      process.exit(0);
    }
    throw err;
  }
}

function onEscAbort(ac) {
  const onKeypress = (_, key) => {
    if (key && key.name === 'escape') ac.abort();
  };
  process.stdin.on('keypress', onKeypress);
  return () => process.stdin.removeListener('keypress', onKeypress);
}

const CANCEL_HINT = '(Press Esc or Ctrl+C to cancel)';

async function listAllMode(filter) {
  let entries = getLsofEntries();

  if (entries.length === 0) {
    console.log('No listening ports found.');
    return;
  }

  if (filter) {
    entries = fuzzyFilter(entries, filter);
    if (entries.length === 0) {
      console.log('No matching ports found.');
      return;
    }
  }

  const ac = new AbortController();
  const cleanup = onEscAbort(ac);
  let selected;
  try {
    selected = await search({
      message: `Search and select a process to kill: ${CANCEL_HINT}`,
      source: (term) => {
        const filtered = fuzzyFilter(entries, term || '');
        return filtered.map((e) => ({
          name: `[PID ${e.pid}] ${e.name} :${e.port} (${e.user})`,
          value: e,
        }));
      },
    }, { signal: ac.signal });
  } finally {
    cleanup();
  }

  const ac2 = new AbortController();
  const cleanup2 = onEscAbort(ac2);
  let yes;
  try {
    yes = await confirm({
      message: `Kill PID ${selected.pid} (${selected.name} :${selected.port})?`,
      default: false,
    }, { signal: ac2.signal });
  } finally {
    cleanup2();
  }

  if (!yes) return;

  const result = killProcess(selected.pid);
  if (result.success) {
    console.log(`Killed PID ${selected.pid} (${selected.name} :${selected.port})`);
  } else {
    console.error(result.error);
  }
}

async function singlePortMode(port) {
  const entries = getLsofEntries(port);

  if (entries.length === 0) {
    console.log(`No process listening on port ${port}.`);
    return;
  }

  console.log(`Process${entries.length > 1 ? 'es' : ''} listening on port ${port}:`);
  for (const e of entries) {
    console.log(`  [PID ${e.pid}] ${e.name} :${e.port} (${e.user})`);
  }

  const ac = new AbortController();
  const cleanup = onEscAbort(ac);
  let yes;
  try {
    yes = await confirm({
      message: `Kill ${entries.length > 1 ? 'these processes' : 'this process'}? ${CANCEL_HINT}`,
      default: false,
    }, { signal: ac.signal });
  } finally {
    cleanup();
  }

  if (!yes) return;

  for (const entry of entries) {
    const result = killProcess(entry.pid);
    if (result.success) {
      console.log(`Killed PID ${entry.pid} (${entry.name} :${entry.port})`);
    } else {
      console.error(result.error);
    }
  }
}
