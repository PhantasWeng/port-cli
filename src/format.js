import chalk from 'chalk';

export function formatHeader(port) {
  if (port !== undefined) {
    return `${chalk.bold.cyan('⚡')}${chalk.bold(' port')} ${chalk.cyan(`:${port}`)}`;
  }
  return `${chalk.bold.cyan('⚡')}${chalk.bold(' port-cli')}`;
}

export function formatError(message) {
  return chalk.red(message);
}

const COL_PID = 8;
const COL_NAME = 10;
const COL_PORT = 8;

function stripAnsi(str) {
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function pad(str, width) {
  const visible = stripAnsi(str).length;
  if (visible >= width) return str;
  return str + ' '.repeat(width - visible);
}

function truncate(str, maxLen) {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

export function formatTable(entries) {
  const header = `  ${pad(chalk.dim('PID'), COL_PID)}${pad(chalk.dim('PROCESS'), COL_NAME)}${pad(chalk.dim('PORT'), COL_PORT)}${chalk.dim('USER')}`;
  const rows = entries.map((e) => {
    const name = truncate(e.name, COL_NAME);
    return `  ${pad(chalk.gray(String(e.pid)), COL_PID)}${pad(chalk.bold.white(name), COL_NAME)}${pad(chalk.cyan(':' + e.port), COL_PORT)}${chalk.gray(e.user)}`;
  });
  return [header, ...rows].join('\n');
}

export function formatSummary(count) {
  return chalk.dim(`  ${count} process${count === 1 ? '' : 'es'} listening`);
}
