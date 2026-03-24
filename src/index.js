// src/index.js
import { checkbox, confirm } from '@inquirer/prompts';
import { getLsofEntries } from './lsof.js';
import { killProcess } from './kill.js';
import {
  formatHeader,
  formatTable,
  formatSummary,
  formatKillResult,
  formatEmpty,
  formatError,
} from './format.js';

export function parseArgs(args) {
  if (args.length === 0) return { port: null };

  const raw = args[0];
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
    console.error(formatError(err.message));
    process.exit(1);
  }

  try {
    if (parsed.port === null) {
      await listAllMode();
    } else {
      await singlePortMode(parsed.port);
    }
  } catch (err) {
    if (err.name === 'ExitPromptError') {
      process.exit(0);
    }
    throw err;
  }
}

async function listAllMode() {
  const entries = getLsofEntries();

  console.log(formatHeader());
  console.log();

  if (entries.length === 0) {
    console.log(formatEmpty());
    return;
  }

  console.log(formatTable(entries));
  console.log();
  console.log(formatSummary(entries.length));
  console.log();

  const choices = entries.map((e) => ({
    name: `[PID ${e.pid}] ${e.name} :${e.port} (${e.user})`,
    value: e,
  }));

  const selected = await checkbox({
    message: 'Select processes to kill:',
    choices,
  });

  if (selected.length === 0) return;

  const yes = await confirm({
    message: `Kill ${selected.length} selected process${selected.length > 1 ? 'es' : ''}?`,
    default: false,
  });

  if (!yes) return;

  for (const entry of selected) {
    const result = killProcess(entry.pid);
    console.log(formatKillResult(result, entry));
  }
}

async function singlePortMode(port) {
  const entries = getLsofEntries(port);

  console.log(formatHeader(port));
  console.log();

  if (entries.length === 0) {
    console.log(formatEmpty(port));
    return;
  }

  console.log(formatTable(entries));
  console.log();
  console.log(formatSummary(entries.length));
  console.log();

  const yes = await confirm({
    message: `Kill ${entries.length > 1 ? 'these processes' : 'this process'}?`,
    default: false,
  });

  if (!yes) return;

  for (const entry of entries) {
    const result = killProcess(entry.pid);
    console.log(formatKillResult(result, entry));
  }
}
