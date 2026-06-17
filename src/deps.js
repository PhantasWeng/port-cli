import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';

export const DEPENDENCIES = [
  {
    cmd: 'lsof',
    required: true,
    purpose: '列出 listening ports',
    hints: { linux: 'apt install lsof（或你的發行版套件）', darwin: 'brew install lsof' },
  },
  {
    cmd: 'ps',
    required: false,
    purpose: '顯示 process 啟動指令',
    hints: { linux: 'apt install procps', darwin: 'macOS 內建' },
  },
];

export function commandExists(cmd, pathEnv = process.env.PATH) {
  if (!pathEnv) return false;
  for (const dir of pathEnv.split(':')) {
    if (!dir) continue;
    try {
      accessSync(join(dir, cmd), constants.X_OK);
      return true;
    } catch {
      // not executable in this dir; keep scanning
    }
  }
  return false;
}

export function installHint(dep, platform = process.platform) {
  if (platform === 'darwin') return dep.hints.darwin;
  if (platform === 'linux') return dep.hints.linux;
  return `請用你的套件管理員安裝 ${dep.cmd}`;
}
