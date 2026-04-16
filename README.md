# @phantas/port-cli

Interactive CLI to list listening ports and kill processes.

```
$ port
? Select processes to kill:
  ◻ [PID 1234] node :3000 (ubuntu)
  ◻ [PID 5678] python :8080 (ubuntu)
  ◻ [PID 9012] nginx :443 (root)

$ port 3000
Process listening on port 3000:
  [PID 1234] node :3000 (ubuntu)
? Kill this process? (y/N)
```

## Install

```bash
npm install -g @phantas/port-cli
```

Requires Node.js >= 18 and `lsof` (pre-installed on macOS and most Linux distributions).

## Usage

```bash
# List all listening ports, interactively select which to kill
port

# Kill process(es) on a specific port
port 3000
```

### List all mode

Running `port` with no arguments shows all listening TCP ports. Use arrow keys and space to select processes, then confirm to kill.

### Single port mode

Running `port <port>` shows processes listening on that port and prompts to kill them.

### Permissions

Some processes (e.g. those owned by root) require elevated privileges:

```bash
sudo port 80
```

If you try to kill a process without sufficient permissions, `port` will show a hint and continue killing remaining processes.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success or user cancellation (including Ctrl+C) |
| `1` | Error (invalid port, `lsof` not found, etc.) |

## License

MIT
