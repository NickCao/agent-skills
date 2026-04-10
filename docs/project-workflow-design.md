# Project Workflow Discovery & Enforcement

## Overview

Two-part system that discovers a project's development workflow and makes the agent follow it.

- **Skill** (`skills/project-workflow/SKILL.md`) -- discovers the workflow by indexing the repo
- **Plugin** (`src/workflow/`) -- enforces the workflow by modeling phases as primary agents with review-gated transitions

The workflow is only active when `.workflow/workflow.yaml` exists. Without it, the plugin has zero impact.

## Architecture

```
Skill (discovery)                    Plugin (enforcement)
┌─────────────────────┐              ┌──────────────────────────┐
│  project-workflow    │              │  src/workflow/           │
│                      │              │                          │
│  - Index repo        │──────────>   │  - Read workflow YAML    │
│  - Discover phases   │  writes      │  - Register phase agents │
│  - Write YAML graph  │  .workflow/  │  - Register review agent │
│                      │  workflow.   │  - Custom tools          │
│                      │  yaml        │  - State management      │
└─────────────────────┘              └──────────────────────────┘
```

## Workflow YAML Schema

Location: `.workflow/workflow.yaml` (committed to repo).

```yaml
version: 1
metadata:
  last_indexed: "2026-04-10T10:30:00Z"

phases:
  - id: plan
    name: Planning
    description: Define requirements and approach
    conventions:
      - Use TODO lists for task tracking
      - Reference existing patterns in the codebase
    gate:
      - Plan documented or task list created

  - id: implement
    name: Implementation
    description: Write code following project patterns
    conventions:
      - Follow TypeScript strict mode
      - Use existing module patterns

  - id: test
    name: Testing
    conventions:
      - Use vitest for unit tests
      - Write tests before implementation

  - id: verify
    name: Verification
    conventions:
      - Run linting (eslint)
      - Run type checking (tsc --noEmit)
      - Run full test suite

  - id: commit
    name: Commit & Document
    conventions:
      - Use conventional commits
      - Update relevant docs

transitions:
  - from: plan
    to: implement
  - from: implement
    to: test
  - from: test
    to: verify
  - from: verify
    to: commit

project_conventions:
  branching:
    pattern: "feature/*, fix/*"
    main_branch: main
  commits:
    format: conventional
  code_style:
    language: TypeScript
    linter: ESLint
    formatter: Prettier
```

### Schema Rules

- `version` must be `1`.
- `phases` is a non-empty array. Each phase requires an `id`.
- `conventions` are specific, actionable strings (not generic advice).
- `gate` criteria are verifiable conditions (not subjective).
- `transitions` defines ordering. Each phase transitions to exactly one next phase.
- The last phase has no outgoing transition -- completing it ends the workflow.

## Workflow Phases as Primary Agents

Each workflow phase becomes an OpenCode **primary agent**. The user switches between them with the Tab key. Context is shared across all phases within the same session.

A single **hidden review subagent** (`workflow-review`) gates transitions between phases.

```
Primary Agents (Tab to switch):
┌──────────────┐  ┌───────────────────┐  ┌──────────────┐
│ workflow-plan │─>│ workflow-implement │─>│ workflow-test │─> ...
└──────┬───────┘  └─────────┬─────────┘  └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
  ┌────────────────────────────────────────────────────┐
  │  workflow-review (subagent, hidden)                │
  │  - Checks phase gates                             │
  │  - Calls workflow_advance to transition            │
  └────────────────────────────────────────────────────┘
```

### Agent Properties

**Phase agents** (one per phase):
- `mode: primary`
- System prompt includes phase conventions and gate criteria
- Instructs agent to invoke `@workflow-review` when done
- `workflow_advance` tool permission: **deny**

**Review agent** (single, shared):
- `mode: subagent`, `hidden: true`
- Prompt includes all phase gate criteria
- `workflow_advance` tool permission: **allow**
- `edit` permission: **deny**

## Task Execution Flow

```
User: "Add user authentication"
  │
  ▼
workflow-plan (primary agent, read-only tools)
  │  Plans the task using project conventions
  │  When done -> invokes @workflow-review
  │
  ▼
workflow-review (hidden subagent)
  │  Calls workflow_status to check current phase
  │  Checks planning gate criteria
  │  PASS -> calls workflow_advance -> "implement"
  │  FAIL -> returns feedback, user stays in plan phase
  │
  ▼
workflow-implement (primary agent, full tools)
  │  Writes code following project conventions
  │  When done -> invokes @workflow-review
  │
  ▼
workflow-review (hidden subagent)
  │  Checks implementation gate criteria
  │  PASS -> calls workflow_advance -> "test"
  │
  ▼
... continues through all phases ...
  │
  ▼
workflow-review returns "done" -- all phases complete
```

## Custom Tools

### `workflow_status`

Returns the current workflow phase, conventions, gate criteria, and progress.

Available to all agents. No restrictions.

### `workflow_advance`

Transitions to the next workflow phase. Restricted to the `workflow-review` agent via:

1. **Permission config**: Phase agents have `workflow_advance: "deny"`, review agent has `workflow_advance: "allow"`
2. **Runtime check**: The tool verifies `context.agent === "workflow-review"` and throws if not

### Terminal State

When the last phase completes (no outgoing transition), `workflow_advance` returns `status: "done"`. The workflow state enters a terminal state where `isDone()` returns `true` and `status()` reports `current: "done"` with all phases listed as completed.

## State Management

Phase state is tracked per-session in memory using a `Map<string, WorkflowState>`. This matches the existing `agentBySession` pattern in `src/index.ts`.

State is initialized lazily on the first `workflow_status` or `workflow_advance` call for a given session.

No compaction hooks. Since all phase agents are primary agents sharing the same session, context is naturally preserved in the conversation history.

## Module Structure

```
src/workflow/
  index.ts          Entry point. Reads .workflow/workflow.yaml, returns null
                    if absent. Otherwise returns agents, tools, and config.

  schema.ts         WorkflowConfig types and YAML parser with validation.

  state.ts          WorkflowState class. Per-session phase tracking with
                    advance() returning the next phase or "done".

  agents.ts         generateAgents(). Produces AgentConfig records for each
                    phase (primary) and the review subagent (hidden).

  tools.ts          createWorkflowTools(). Returns workflow_status and
                    workflow_advance tool definitions.
```

Wired into the plugin at `src/index.ts`:
- `config` hook registers workflow agents (if workflow file present)
- `tool` export registers workflow tools (if workflow file present)

## Skill: Repo Indexing

The `project-workflow` skill is invoked explicitly (typically via headless `opencode` run). It analyzes:

1. Documentation (README, CONTRIBUTING, docs/)
2. Git history (commit patterns, branch naming, merge strategy)
3. CI/CD configs (.github/workflows/, .gitlab-ci.yml, Jenkinsfile)
4. Build configs (package.json scripts, Makefile, Dockerfile)
5. Code structure (source layout, module patterns, language)
6. Test patterns (framework, file locations, naming conventions)
7. Linting/formatting (.eslintrc, .prettierrc, .editorconfig)

It writes the result to `.workflow/workflow.yaml`. No smart caching -- re-indexing happens only when the user explicitly invokes the skill again.

## Conditional Activation

The plugin calls `setupWorkflow(directory)` at startup. If `.workflow/workflow.yaml` does not exist, `setupWorkflow` returns `null` and the plugin skips all workflow registration. No agents, no tools, no state tracking. The plugin behaves exactly as if the workflow module doesn't exist.

```typescript
const workflow = setupWorkflow(directory);

// In config hook:
if (workflow) {
  for (const [name, agentConfig] of Object.entries(workflow.agents)) {
    config.agent[name] = agentConfig;
  }
}

// Tool export:
...(workflow ? { tool: workflow.tools } : {}),
```
