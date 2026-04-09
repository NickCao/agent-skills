# tmux Reference

## Contents
- Detection
- Session Management
- Window (Tab) Management
- Pane Management
- Output Capture
- Checking Command Status
- Quirks and Tips
- Scrollback Buffer

## Detection

```bash
# Inside tmux?
test -n "$TMUX"

# tmux available?
command -v tmux >/dev/null 2>&1
```

## Session Management

```bash
# Start a new detached session running a command
tmux new-session -d -s "agent-devserver" 'npm run dev'

# Start a detached session without a command (bare shell)
tmux new-session -d -s "agent-work"

# List sessions
tmux list-sessions

# Attach to a session (user instruction)
tmux attach -t agent-devserver

# Kill a session
tmux kill-session -t agent-devserver
```

## Window (Tab) Management

Use these when already inside a tmux session, or from outside when targeting an existing session with `-t`.

```bash
# Open a new window in the current session (inside tmux)
tmux new-window -n "devserver" 'npm run dev'

# Open a new window in a detached session (works from outside)
tmux new-window -t "agent-devserver" -n "tests" 'npm test'

# Open a new window with a bare shell
tmux new-window -n "work"

# Send a command to a specific window (useful if window already exists)
tmux send-keys -t "devserver" 'npm run dev' Enter

# List windows in current session
tmux list-windows

# Rename current window
tmux rename-window "new-name"
```

## Pane Management

Panes split the current window. Prefer new windows (tabs) for long-running commands — they're easier for users to navigate.

```bash
# Horizontal split running a command
tmux split-window -h 'npm run dev'

# Vertical split running a command
tmux split-window -v 'tail -f /var/log/app.log'
```

## Output Capture

The primary mechanism for monitoring dispatched commands.

```bash
# Capture last 100 lines from a specific window's active pane
tmux capture-pane -t "devserver" -p -S -100

# Capture entire scrollback
tmux capture-pane -t "devserver" -p -S -

# Capture from a specific pane in a specific window
# Format: session:window.pane
tmux capture-pane -t "agent-devserver:0.0" -p -S -50

# Capture from a detached session's first window
tmux capture-pane -t "agent-devserver:" -p -S -100
```

### Target Syntax

tmux targets use the format `session:window.pane`:

| Target | Meaning |
|--------|---------|
| `devserver` | Window named "devserver" in current session |
| `agent-devserver:` | First window of session "agent-devserver" |
| `agent-devserver:0` | Window index 0 of session "agent-devserver" |
| `agent-devserver:0.0` | Pane 0 of window 0 of session "agent-devserver" |

## Checking Command Status

```bash
# Check if the pane's process is still running
tmux list-panes -t "devserver" -F '#{pane_pid} #{pane_dead}'

# Check pane title (some processes set this)
tmux list-panes -t "devserver" -F '#{pane_title}'
```

## Quirks and Tips

- **Shell quoting:** When passing a command to `new-window` or `new-session`, wrap it in single quotes: `tmux new-window -n "name" 'command arg1 arg2'`. The command runs in a new shell.
- **Command exit:** By default, when the command finishes, the window/pane closes. Use `set-option remain-on-exit on` if you need the pane to stay open after the command exits.
- **Environment:** tmux inherits the environment from the session creation point, not from the window/pane creation. Set env vars before the command: `tmux new-window -n "dev" 'PORT=3001 npm run dev'`.
- **Nested tmux:** If `$TMUX` is set, you're already inside tmux. Do NOT start a new session — use `new-window` instead.

## Scrollback Buffer

Default scrollback is **2000 lines**. Verbose commands (builds, test suites, streaming logs) can easily overflow this, silently dropping older output.

### Checking the current limit

```bash
tmux show-option -g history-limit
```

### Raising the limit at runtime

```bash
# Set for all new windows in the current server (does not affect existing windows)
tmux set-option -g history-limit 50000
```

### Persistent configuration

Add to `~/.tmux.conf`:

```
set-option -g history-limit 50000
```

### When scrollback is insufficient

For commands with verbose output, redirect to a file instead of relying on capture-pane:

```bash
# Dispatch with tee to capture all output regardless of buffer size
tmux new-window -n "build" 'cargo build 2>&1 | tee /tmp/agent-build.log'

# Monitor via file instead of capture-pane
tail -50 /tmp/agent-build.log
```

**Decision:** If the command is expected to produce more output than the scrollback limit, always use file redirect. Check the limit with `show-option` before deciding. If the limit is below ~5000 lines and the command is verbose, suggest the user raise it or use file redirect.
