# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`port-cli` is an interactive Node.js CLI tool that lists listening ports and kills selected processes. Published to npm as `port-cli`, invoked as `port`.

Design spec: `docs/superpowers/specs/2026-03-23-port-cli-design.md`

## Architecture

```
bin/port.js       — CLI entrypoint (#!/usr/bin/env node), minimal: parse args → call src/index.js
src/index.js      — Main logic: arg parsing, routes to list-all or single-port mode
src/lsof.js       — Runs lsof -F pcnPi, parses machine-readable output → [{ pid, name, user, port }]
src/kill.js       — Wraps process.kill(pid, 'SIGTERM'), handles EPERM with per-process error message
```

## Key Technical Decisions

- **ESM only** — `"type": "module"` in package.json
- **`@inquirer/prompts`** for interactive UI (checkbox for multi-select, confirm for single-port mode)
- **`execFileSync`** (not `execSync`) to avoid shell injection
- **SIGTERM** (not SIGKILL) — lets processes clean up
- **No auto-sudo** — user runs `sudo port` themselves; on EPERM, show hint but continue killing remaining processes
- **Ctrl+C** — catch `ExitPromptError` from inquirer, exit cleanly with code 0
- **Platform**: macOS and Linux with `lsof`; fail with clear error if `lsof` missing

## Commands

```bash
npm install          # install dependencies
npm link             # link for local testing (makes `port` available globally)
node bin/port.js     # run directly without linking
```

## Exit Codes

- `0` — success or user cancellation
- `1` — error (invalid port, lsof missing, etc.)
