---
name: no-tail
description: Prevents piping command output through tail or head which permanently discards data. Use when about to execute shell commands, especially builds, tests, or any command with potentially large output.
---

# No Tail

Never pipe command output through `tail` or `head`. Redirect to a file first, then view portions.

Using `tail` or `head` on an existing file is fine -- the data is preserved on disk. Piping through `tee` is also fine since it preserves full output. The rule only applies to pipe truncation, which destroys data.

## The Rule

```bash
# BAD — output is permanently discarded
make 2>&1 | tail -20
cargo build 2>&1 | head -50
pytest | tail -100

# GOOD — full output preserved, then view what you need
make > /tmp/make-output.log 2>&1
tail -20 /tmp/make-output.log

# GOOD — tee preserves full output to disk while also showing it
make 2>&1 | tee /tmp/make-output.log

# GOOD — let the execution tool handle output capture natively
make
```

**Proactive redirection:** Execution tools often have an upper limit on captured output lines. If the command is expected to produce very long output (large builds, verbose test suites, log dumps), proactively redirect to a file rather than relying on the execution tool's capture:

```bash
# For commands expected to produce long output
cargo build --verbose > /tmp/build.log 2>&1
tail -50 /tmp/build.log
```

Clean up temporary files when they are no longer needed.

## Common Rationalizations

| Rationalization | Reality |
|-----------------|---------|
| "I only need the last few lines" | You don't know that yet. Errors, warnings, and context appear earlier in the output. |
| "The output is too large" | Redirect to a file. Read the parts you need. Delete the file later. |
| "It's just a quick check" | Quick checks on incomplete data produce wrong conclusions. Capture everything. |
| "The execution tool will truncate anyway" | Many execution tools save full output to a file when truncating. Piping through tail never does. |
