## Context

`port` uses `@inquirer/prompts` checkbox for multi-select in list-all mode. With many listening ports, users must scroll through the entire list. There's no search or pre-filter capability.

`@inquirer/prompts@8.3.2` ships `search` (single-select with async source callback) and `checkbox` (multi-select, no search). No built-in searchable multi-select exists.

## Goals / Non-Goals

**Goals:**
- Fuzzy search across all entry fields (pid, name, port, user) in the interactive menu
- `--filter <term>` flag for pre-filtering before entering the menu
- Multi-select via search loop with toggle and "Done" escape hatch

**Non-Goals:**
- Custom prompt built on `@inquirer/core` (too much maintenance surface)
- Replacing single-port mode (`port 3000`)
- Regex or advanced query syntax

## Decisions

### Use `@inquirer/search` in a loop for multi-select

Wrap `search` in a while loop. Each iteration returns one selection. A "Done (N selected)" choice at index 0 breaks the loop. Already-selected entries are visually marked and toggle on re-select.

**Alternative**: Build a custom prompt with `@inquirer/core`. Rejected — significantly more code to maintain for keyboard handling and rendering.

**Alternative**: Two-step flow (search then checkbox). Rejected — breaks the mental model of "search and pick in one place."

### Use `fzy.js` for fuzzy matching

13 KB, zero dependencies, does one thing well. Each entry is matched against a combined string: `"<pid> <name> <port> <user>"`.

**Alternative**: `fuse.js` (312 KB) — overkill. **Alternative**: `fzf` (71 KB) — unnecessary features.
**Alternative**: Simple substring — doesn't handle typos or partial matches well.

### `--filter` pre-filters entries before the menu

`parseArgs` extracts `--filter <term>`. `getLsofEntries()` result is fuzzy-filtered before passing to the search prompt. The search prompt still works normally for further narrowing.

### Search source callback returns all entries when term is empty

When the user hasn't typed anything (or cleared the filter), show the full list. This lets users browse + search fluidly.

## Risks / Trade-offs

- [UX change] Users accustomed to checkbox multi-select now use a search loop → Mitigation: "Done" option is always visible at top; behavior is intuitive after first use
- [Dependency] Adding `fzy.js` → Mitigation: 13 KB, zero deps, stable package
- [Toggle confusion] User might not realize selecting again deselects → Mitigation: Mark selected entries with ✓ prefix
