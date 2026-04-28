## ADDED Requirements

### Requirement: Fuzzy search in list-all mode
The list-all mode SHALL use `@inquirer/search` prompt with a fuzzy matching source callback. The search SHALL match against a combined string of pid, name, port, and user for each entry.

#### Scenario: User types partial process name
- **WHEN** user types "nod" in the search filter
- **THEN** entries with names like "node" and "nodemon" SHALL appear in the results

#### Scenario: User searches by port number
- **WHEN** user types "3000"
- **THEN** entries listening on port 3000 SHALL appear in the results

#### Scenario: User searches by user name
- **WHEN** user types "root"
- **THEN** entries owned by user "root" SHALL appear in the results

#### Scenario: Empty search term shows all entries
- **WHEN** the search filter is empty
- **THEN** all entries SHALL be displayed

### Requirement: Multi-select via search loop
The search prompt SHALL run in a loop. Each iteration allows selecting one entry. Selected entries are tracked across iterations.

#### Scenario: User selects an entry
- **WHEN** user selects an entry from the search results
- **THEN** the entry SHALL be added to the selected set and the search prompt SHALL restart with an empty filter

#### Scenario: User toggles a selected entry
- **WHEN** user selects an entry that is already in the selected set
- **THEN** the entry SHALL be removed from the selected set

#### Scenario: Selected entries are visually marked
- **WHEN** search results include entries that are already selected
- **THEN** those entries SHALL be displayed with a "✓" prefix

### Requirement: Done option exits the selection loop
A "Done (N selected)" choice SHALL always appear as the first item in the search results. N reflects the current count of selected entries.

#### Scenario: User selects Done with selections
- **WHEN** user selects "Done (2 selected)"
- **THEN** the search loop SHALL exit and proceed to the kill confirmation prompt

#### Scenario: User selects Done with no selections
- **WHEN** user selects "Done (0 selected)"
- **THEN** the search loop SHALL exit and the command SHALL return without killing anything

#### Scenario: Done option visibility during search
- **WHEN** user has typed a search term
- **THEN** the "Done" option SHALL still appear as the first item
