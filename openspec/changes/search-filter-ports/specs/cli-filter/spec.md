## ADDED Requirements

### Requirement: --filter flag pre-filters entries
The CLI SHALL accept a `--filter <term>` flag. When provided, entries SHALL be fuzzy-filtered before entering the interactive search prompt.

#### Scenario: Filter by process name
- **WHEN** user runs `port --filter node`
- **THEN** only entries matching "node" via fuzzy search SHALL be shown in the interactive menu

#### Scenario: Filter combined with interactive search
- **WHEN** user runs `port --filter node` and then types "3000" in the search prompt
- **THEN** results SHALL be further narrowed to entries matching both "node" (pre-filter) and "3000" (interactive)

#### Scenario: Filter with no matches
- **WHEN** user runs `port --filter zzzzz` and no entries match
- **THEN** the CLI SHALL print "No matching ports found." and exit

#### Scenario: Filter does not affect single-port mode
- **WHEN** user runs `port 3000 --filter node`
- **THEN** `--filter` SHALL be ignored and single-port mode SHALL operate normally
