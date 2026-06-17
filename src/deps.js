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

export function checkDependencies(deps = DEPENDENCIES, existsFn = commandExists) {
  return deps.map((dep) => ({
    cmd: dep.cmd,
    required: dep.required,
    purpose: dep.purpose,
    found: existsFn(dep.cmd),
    hint: installHint(dep),
  }));
}

export function formatDoctorReport(results) {
  const lines = ['依賴檢查：'];
  for (const r of results) {
    const mark = r.found ? '✓' : '✗';
    const status = r.found ? '已安裝' : '未安裝';
    lines.push(`  ${mark} ${r.cmd} ${status}  — ${r.purpose}`);
    if (!r.found) lines.push(`      安裝：${r.hint}`);
  }
  return lines.join('\n');
}

export function formatPreflightProblems(results) {
  const errors = [];
  const warnings = [];
  for (const r of results) {
    if (r.found) continue;
    if (r.required) {
      errors.push(`❌ 缺少必要命令 ${r.cmd}：無法${r.purpose}\n   安裝：${r.hint}`);
    } else {
      warnings.push(`⚠  ${r.cmd} 未安裝：將無法${r.purpose}（安裝：${r.hint}）`);
    }
  }
  return { errors, warnings };
}
