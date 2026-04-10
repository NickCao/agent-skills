---
name: project-workflow
description: Use when explicitly asked to discover and document a project's development workflow by indexing the repository
---

# Project Workflow Discovery

Index a repository to discover its development workflow and write it to `.workflow/workflow.yaml`.

## When to Use

Only when explicitly asked. Typically invoked via a headless `opencode` run or the `/workflow-init` command.

## Process

1. Analyze the repository:
   - Documentation: README, CONTRIBUTING, docs/
   - Git history: `git log --oneline -50`, branch naming, merge patterns
   - CI/CD: `.github/workflows/`, `.gitlab-ci.yml`, Jenkinsfile
   - Build configs: `package.json` scripts, `Makefile`, `Dockerfile`
   - Code structure: source layout, module patterns, language
   - Test patterns: framework, file locations, naming conventions
   - Linting/formatting: `.eslintrc`, `.prettierrc`, `.editorconfig`

2. Identify the workflow phases the project follows. Common phases include:
   - Planning, Implementation, Testing, Verification, Documentation, Commit
   - Not every project has all phases. Discover what exists.

3. For each phase, identify:
   - Conventions the project follows
   - Gate criteria (what must be true before moving on)

4. Identify project-wide conventions:
   - Branch naming patterns
   - Commit message format
   - Code style and language

5. Write the result to `.workflow/workflow.yaml` using this schema:

```yaml
version: 1
metadata:
  last_indexed: "<current ISO timestamp>"

phases:
  - id: <short-identifier>
    name: <Human Readable Name>
    description: <one sentence>
    conventions:
      - <convention string>
    gate:
      - <criteria string>

transitions:
  - from: <phase-id>
    to: <phase-id>

project_conventions:
  branching:
    pattern: "<glob pattern>"
    main_branch: <branch name>
  commits:
    format: <format name>
  code_style:
    language: <primary language>
    linter: <linter name>
    formatter: <formatter name>
```

## Rules

- Only include phases you find evidence for. Do not invent phases.
- Conventions must be specific and actionable, not generic advice.
- Gate criteria should be verifiable (not subjective).
- If the project has no clear workflow, create a minimal one from what you observe.
- The `transitions` array defines the order. Each phase should transition to exactly one next phase.
