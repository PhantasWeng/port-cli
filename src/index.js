// src/index.js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkbox, confirm } from '@inquirer/prompts';
import { getLsofEntries } from './lsof.js';
import { killProcess } from './kill.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));

const HELP_TEXT = `Usage: port [port_number]

Interactive CLI to list listening ports and kill processes.

Arguments:
  port_number    Optional. Filter by specific port (1-65535).

Options:
  -h, --help     Show this help message and exit.
  -V, --version  Show version number and exit.

Examples:
  port           List all listening ports interactively.
  port 3000      Show processes on port 3000 and offer to kill them.`;

export function parseArgs(args) {
  if (args.length === 0) return { port: null };

  const raw = args[0];

  if (raw === '-h' || raw === '--help') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (raw === '-V' || raw === '--version') {
    console.log(pkg.version);
    process.exit(0);
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: "${raw}". Must be an integer between 1 and 65535.`);
  }
  return { port };
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
      await listAllMode();
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

async function listAllMode() {
  const entries = getLsofEntries();

  if (entries.length === 0) {
    console.log('No listening ports found.');
    return;
  }

  const choices = entries.map((e) => ({
    name: `[PID ${e.pid}] ${e.name} :${e.port} (${e.user})`,
    value: e,
  }));

  const ac = new AbortController();
  const cleanup = onEscAbort(ac);
  let selected;
  try {
    selected = await checkbox({
      message: `Select processes to kill: ${CANCEL_HINT}`,
      choices,
    }, { signal: ac.signal });
  } finally {
    cleanup();
  }

  if (selected.length === 0) return;

  const ac2 = new AbortController();
  const cleanup2 = onEscAbort(ac2);
  let yes;
  try {
    yes = await confirm({
      message: `Kill ${selected.length} selected process${selected.length > 1 ? 'es' : ''}?`,
      default: false,
    }, { signal: ac2.signal });
  } finally {
    cleanup2();
  }

  if (!yes) return;

  for (const entry of selected) {
    const result = killProcess(entry.pid);
    if (result.success) {
      console.log(`Killed PID ${entry.pid} (${entry.name} :${entry.port})`);
    } else {
      console.error(result.error);
    }
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
