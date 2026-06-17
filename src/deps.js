import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';

export const DEPENDENCIES = [
  {
    cmd: 'lsof',
    required: true,
    purpose: 'list listening ports',
    hints: { linux: 'apt install lsof (or your distro equivalent)', darwin: 'brew install lsof' },
  },
  {
    cmd: 'ps',
    required: false,
    purpose: 'show process launch command',
    hints: { linux: 'apt install procps', darwin: 'preinstalled on macOS' },
  },
];

export function commandExists(cmd, pathEnv = process.env.PATH) {
  if (!pathEnv) return false;
  // POSIX PATH (':' separator); project targets macOS/Linux only.
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
  return `install ${dep.cmd} via your package manager`;
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
  const lines = ['Dependency check:'];
  for (const r of results) {
    const mark = r.found ? '✓' : '✗';
    const status = r.found ? 'installed' : 'not found';
    lines.push(`  ${mark} ${r.cmd} ${status}  — ${r.purpose}`);
    if (!r.found) lines.push(`      Install: ${r.hint}`);
  }
  return lines.join('\n');
}

export function formatPreflightProblems(results) {
  const errors = [];
  const warnings = [];
  for (const r of results) {
    if (r.found) continue;
    if (r.required) {
      errors.push(`❌ Missing required command ${r.cmd}: cannot ${r.purpose}\n   Install: ${r.hint}`);
    } else {
      warnings.push(`⚠  ${r.cmd} not found: cannot ${r.purpose} (install: ${r.hint})`);
    }
  }
  return { errors, warnings };
}
