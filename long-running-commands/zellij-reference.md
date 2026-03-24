# zellij Reference

## Contents
- Detection
- Important Limitations
- Session Management
- Tab and Pane Management
- Output Capture
- Checking Command Status
- Quirks and Tips
- Scrollback Buffer

## Detection

```bash
# Inside zellij?
test -n "$ZELLIJ_SESSION_NAME"

# zellij available?
command -v zellij >/dev/null 2>&1
```

## Important Limitations

Zellij has significant differences from tmux and screen that affect agent usage:

1. **No detached session start.** Zellij cannot start a session in the background without attaching to it. It always requires a terminal.
2. **No CLI-based output capture.** There is no equivalent to `tmux capture-pane` or `screen hardcopy`.
3. **CLI actions only work from inside a session.** The `zellij action` and `zellij run` commands require `$ZELLIJ_SESSION_NAME` to be set.

**Consequence:** Only use zellij when the agent is already running inside a zellij session. For detached sessions or monitoring, prefer tmux or screen.

## Session Management

```bash
# List sessions (works from outside)
zellij list-sessions

# Attach to a session (user instruction)
zellij attach <session-name>

# Kill a session
zellij kill-session <session-name>

# Delete all sessions
zellij delete-all-sessions
```

Starting a new session always attaches (blocks the agent), so avoid this:

```bash
# DON'T use from agent — this blocks
zellij -s "agent-devserver"
```

## Tab and Pane Management

These commands only work **from inside** an active zellij session.

```bash
# Run a command in a new pane (floating by default)
zellij run -- npm run dev

# Run in a new pane with a name
zellij run --name "devserver" -- npm run dev

# Run in a new pane, close pane when command exits
zellij run --close-on-exit -- cargo build

# Run in a non-floating (tiled) pane
zellij run --direction down -- npm run dev
```

### Tab Actions

```bash
# Create a new tab
zellij action new-tab --name "devserver"

# Then send the command as typed input (use $'...' for the newline)
zellij action write-chars $'npm run dev\n'
```

**Note:** `write-chars` sends raw bytes to the focused pane. Use bash `$'...'` quoting so `\n` is interpreted as a newline (Enter). Plain double quotes (`"...\n"`) will send a literal backslash and `n`. This is a workaround since `zellij action new-tab` does not accept a command argument.

## Output Capture

**Zellij does not provide CLI-based output capture.**

There is no equivalent to `tmux capture-pane -p` or `screen -X hardcopy`. The agent cannot programmatically read the output of a pane running in zellij.

**Workarounds:**
- Redirect command output to a file: `zellij run -- bash -c 'npm run dev 2>&1 | tee /tmp/agent-output.log'`
- Read the log file for monitoring: `tail -20 /tmp/agent-output.log`

If the agent needs to monitor command output, prefer tmux or screen over zellij.

## Checking Command Status

```bash
# List sessions and their state
zellij list-sessions
```

There is no CLI command to inspect individual panes or their processes from outside.

## Quirks and Tips

- **Inside-only CLI:** `zellij run` and `zellij action` silently fail or error when `$ZELLIJ_SESSION_NAME` is not set. Always check the env var first.
- **No background sessions:** Unlike tmux/screen, you cannot create a zellij session, run a command in it, and detach — all in one step. This makes zellij unsuitable as a fallback when no multiplexer is running.
- **Pane closure:** By default, `zellij run` keeps the pane open after the command exits (showing exit status). Use `--close-on-exit` for commands where the agent doesn't need the exit status visible.
- **Floating panes:** `zellij run` creates floating panes by default, which overlay the current content. This is fine for agent-dispatched commands since the user can dismiss them.
- **Plugin ecosystem:** Zellij has a plugin system, but plugins are not relevant for agent command dispatch.
- **Version differences:** The `zellij run` subcommand was stabilized in zellij 0.32+. Older versions may not support it.

## Scrollback Buffer

Zellij's in-memory scrollback for active panes is **effectively unlimited** — it stores all output. This is different from tmux (2000 lines default) and screen (100 lines default). Buffer overflow is not a concern for users viewing panes directly.

However, zellij has a separate serialization setting that controls how much scrollback is preserved when saving sessions to disk:

```kdl
// ~/.config/zellij/config.kdl
// Only affects session serialization, NOT the in-memory buffer
scrollback_lines_to_serialize 10000
```

### File redirect is always recommended for agents

Despite the unlimited in-memory buffer, zellij has **no CLI-based output capture**. The agent cannot read pane contents programmatically. Always redirect output to a file when monitoring is needed:

```bash
zellij run -- bash -c 'cargo build 2>&1 | tee /tmp/agent-build.log'
```

This is the only reliable way to programmatically read command output from a zellij pane.
