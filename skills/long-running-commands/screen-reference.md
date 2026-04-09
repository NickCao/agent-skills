# screen Reference

## Contents
- Detection
- Session Management
- Window Management
- Output Capture
- Checking Command Status
- Quirks and Tips
- Scrollback Buffer

## Detection

```bash
# Inside screen?
test -n "$STY"

# screen available?
command -v screen >/dev/null 2>&1
```

## Session Management

```bash
# Start a detached session running a command
screen -dmS "agent-devserver" bash -c 'npm run dev'

# Start a detached session with a bare shell
screen -dmS "agent-work"

# List sessions
screen -ls

# Attach to a session (user instruction)
screen -r agent-devserver

# Reattach to a session even if attached elsewhere
screen -dr agent-devserver

# Kill a session
screen -S agent-devserver -X quit
```

## Window Management

Use these when **already inside** a screen session.

```bash
# Create a new window running a command
screen -t "devserver" bash -c 'npm run dev'

# From outside the session, tell it to create a new window
# Use eval so screen's parser handles the inner quoting correctly
screen -S agent-work -X eval 'screen -t "devserver" bash -c "npm run dev"'

# Send a command to the current window
screen -S agent-work -X stuff 'npm run dev\n'
```

### The `stuff` Command

`stuff` sends literal keystrokes to a screen window. Screen itself interprets `\n` as a newline (Enter) — this is screen's own escape handling, not bash's. Use single quotes so bash passes the literal `\n` through to screen:

```bash
# Type and execute a command in the session
# Screen interprets \n as Enter — bash single quotes preserve it literally
screen -S agent-work -X stuff 'npm run dev\n'
```

## Output Capture

Screen's capture mechanism is **file-based** — it writes to a file rather than stdout.

```bash
# Dump current window contents to a file
screen -S "agent-devserver" -X hardcopy /tmp/agent-capture.txt

# Read the captured output
cat /tmp/agent-capture.txt

# Dump with scrollback history (hardcopy -h)
screen -S "agent-devserver" -X hardcopy -h /tmp/agent-capture.txt

# Combined: capture scrollback and read in one step
screen -S "agent-devserver" -X hardcopy -h /tmp/agent-capture.txt && cat /tmp/agent-capture.txt
```

### Capture Limitations

- `hardcopy` captures only the **visible** portion of the window by default. Use `-h` to include scrollback.
- Output file is overwritten each time — no append mode.
- No equivalent to tmux's `-S -100` (last N lines). You get the full scrollback or just the visible screen.
- You must clean up the temp file yourself.

**Recommended pattern for monitoring:**

```bash
CAPTURE_FILE=$(mktemp /tmp/agent-screen-XXXXXX.txt)
screen -S "agent-devserver" -X hardcopy -h "$CAPTURE_FILE"
tail -20 "$CAPTURE_FILE"   # last 20 lines
rm -f "$CAPTURE_FILE"
```

## Checking Command Status

```bash
# List windows in a session
screen -S agent-devserver -X windows

# Check if session is still running
screen -ls | grep agent-devserver
```

## Quirks and Tips

- **Command wrapping:** Always wrap commands with `bash -c 'command'` when using `-dmS`. Without it, screen may not handle complex commands or pipes correctly.
- **No stdout capture:** Unlike tmux's `capture-pane -p`, screen cannot print captured output directly to stdout. You must go through a temporary file.
- **Multiuser issues:** screen sessions are owned by the user who created them. Permission issues can arise with `hardcopy` if the temp directory has restrictions.
- **Detach from inside:** If the agent accidentally attaches, `Ctrl-a d` detaches. But agents typically shouldn't attach — use `-X` commands to interact remotely.
- **Session naming:** screen session names are case-sensitive. Use lowercase consistently.
- **Zombie windows:** When a command in a screen window exits, the window closes by default. Use `zombie kr` in `.screenrc` to keep dead windows for inspection, but this is a user config concern, not something the agent should set.
- **Nested screen:** If `$STY` is set, you're already inside screen. Use window commands (`screen -t`) rather than starting a new session.

## Scrollback Buffer

Default scrollback is only **100 lines** — far lower than tmux. This is almost certainly too small for any verbose long-running command. Always check and either raise the limit or redirect to a file.

### Setting scrollback on session creation

```bash
# -h sets the scrollback buffer size for the session
screen -dmS "agent-build" -h 10000 bash -c 'cargo build'
```

### Persistent configuration

Add to `~/.screenrc`:

```
defscrollback 10000
```

### When scrollback is insufficient

With screen's low default, prefer file redirect for any command that produces significant output:

```bash
# Redirect with tee — recommended for all verbose commands
screen -dmS "agent-build" bash -c 'cargo build 2>&1 | tee /tmp/agent-build.log'

# Monitor via file
tail -50 /tmp/agent-build.log
```

**Decision:** Screen's 100-line default is almost always too low. If the agent can't confirm a higher `defscrollback` is configured, default to file redirect for verbose commands. Suggest the user add `defscrollback 10000` to `~/.screenrc`.
