// src/index.js
import { checkbox, confirm } from '@inquirer/prompts';
import { getLsofEntries } from './lsof.js';
import { killProcess } from './kill.js';

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
    if (err.name === 'ExitPromptError') {
      // User pressed Ctrl+C — exit cleanly
      process.exit(0);
    }
    throw err;
  }
}

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

  const selected = await checkbox({
    message: 'Select processes to kill:',
    choices,
  });

  if (selected.length === 0) return;

  const yes = await confirm({
    message: `Kill ${selected.length} selected process${selected.length > 1 ? 'es' : ''}?`,
  });

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
    console.log(`  [PID ${e.pid}] ${e.name} (${e.user})`);
  }

  const yes = await confirm({
    message: `Kill ${entries.length > 1 ? 'these processes' : 'this process'}?`,
  });

  if (!yes) return;

  for (const entry of entries) {
    const result = killProcess(entry.pid);
    if (result.success) {
      console.log(`Killed PID ${entry.pid} (${entry.name})`);
    } else {
      console.error(result.error);
    }
  }
}
