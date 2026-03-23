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

  // TODO: implement interactive flow in next tasks
}
