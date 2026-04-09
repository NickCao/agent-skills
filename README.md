# agent-skills

OpenCode plugin that provides a collection of agent skills.

## Installation

Add to the `plugin` array in your `opencode.json` (global or project-level):

```json
{
  "plugin": ["opencode-agent-skills@git+https://github.com/NickCao/agent-skills.git"]
}
```

Restart OpenCode. The plugin auto-installs via Bun and registers all skills automatically.

## Skills

- **always-search** - Requires searching online resources and citing authoritative sources before stating facts.
- **are-you-sure** - Requires actively arguing against your own position before committing to it.
- **long-running-commands** - Dispatches long-running commands to terminal multiplexers instead of blocking.
- **no-tail** - Prevents piping command output through `tail` or `head` which permanently discards data.
