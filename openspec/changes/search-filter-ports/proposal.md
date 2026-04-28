## Why

When many ports are listening, the current checkbox list requires scrolling through every entry to find the one you want. There's no way to narrow results interactively or pre-filter from the command line, making the tool slow to use on busy machines.

## What Changes

- Replace `checkbox` prompt with a `search`-based prompt loop that supports fuzzy filtering across all fields (pid, name, port, user)
- Add `--filter <term>` CLI flag to pre-filter entries before entering the interactive menu
- Add `fzy.js` as a dependency for lightweight fuzzy matching (13 KB, zero deps)
- A persistent "Done (N selected)" choice at the top of the list exits the selection loop
- Toggle behavior: selecting an already-selected entry deselects it
- Single-port mode (`port 3000`) is unchanged

## Capabilities

### New Capabilities
- `interactive-search`: Fuzzy search within the port list menu with multi-select via search loop
- `cli-filter`: `--filter <term>` flag for pre-filtering entries before the interactive menu

### Modified Capabilities

## Impact

- **Code**: `src/index.js` — rewrite `listAllMode()`, update `parseArgs()`
- **Dependencies**: Add `fzy.js`
- **UX**: List-all mode interaction changes from checkbox to search loop (breaking for muscle memory, not for API)
- **No breaking CLI changes**: `port` and `port <number>` behave the same; `--filter` is additive
