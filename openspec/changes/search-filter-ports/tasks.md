## 1. Dependencies

- [x] 1.1 Install `fzy.js` as a production dependency

## 2. Fuzzy Search Module

- [x] 2.1 Create `src/fuzzy.js` — export a function that takes entries and a search term, returns fuzzy-matched entries sorted by score. Match against combined string `"<pid> <name> <port> <user>"`.

## 3. CLI Flag

- [x] 3.1 Update `parseArgs` in `src/index.js` to accept `--filter <term>` and return it in the result object. Ignore `--filter` when a port number is provided.

## 4. Interactive Search Loop

- [x] 4.1 Rewrite `listAllMode` in `src/index.js` to use `search` prompt from `@inquirer/prompts` in a while loop with a `selectedSet` tracking selections
- [x] 4.2 Implement the `source` callback: prepend "Done (N selected)" choice, fuzzy-filter entries, mark selected entries with ✓ prefix, show all entries when term is empty
- [x] 4.3 Handle toggle logic: selecting an already-selected entry removes it from the set; selecting "Done" breaks the loop
- [x] 4.4 After loop exits with selections, show confirm prompt and kill selected processes (reuse existing kill logic)

## 5. Pre-filter Integration

- [x] 5.1 Apply `--filter` pre-filtering to entries before passing to the search loop. Show "No matching ports found." and exit if no entries match after filtering.
