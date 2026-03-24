import chalk from 'chalk';

// Force colors for testing and piped output
chalk.level = 3;

export function formatHeader(port) {
  if (port !== undefined) {
    return `${chalk.bold.cyan('⚡')}${chalk.bold(' port')} ${chalk.cyan(`:${port}`)}`;
  }
  return `${chalk.bold.cyan('⚡')}${chalk.bold(' port-cli')}`;
}

export function formatError(message) {
  return chalk.red(message);
}
