---
name: always-search
description: Use when about to make any factual claim — API behavior, library features, configuration options, platform specifics, version details, or any technical assertion — without a verifiable reference link. Requires searching online resources and citing authoritative sources before stating facts.
---

# Always Search

Every factual claim requires a verifiable source link. No source, no claim.

## The Rule

Before stating any factual claim, search online resources for an authoritative source. Include the source link in your response. If no authoritative source can be found, omit the claim entirely — do not guess.

```markdown
# BAD — unsourced factual claim
"The `fs.readFile` function in Node.js accepts an optional encoding parameter
that defaults to returning a Buffer."

# GOOD — claim backed by source
"The `fs.readFile` function accepts an optional `options` parameter where
encoding can be specified; without it, the raw buffer is returned.
(https://nodejs.org/api/fs.html#fsreadfilepath-options-callback)"

# GOOD — no source found, claim omitted
"I could not find authoritative documentation confirming the default behavior
of this parameter, so I won't speculate."
```

Use whatever search tools are available — WebFetch, web search MCP servers, or any other mechanism. The tool does not matter; the source link does.

## What Counts as a Factual Claim

- API signatures, function parameters, return types, default values
- Library or framework behavior, configuration options
- Platform, OS, or runtime behavior
- Version compatibility, deprecation status
- Error meanings, status codes, protocol specifications
- Best practices or conventions cited as authoritative

## What Does NOT Require a Citation

- Code the agent writes (logic, architecture decisions)
- Opinions, recommendations, and trade-off analysis
- Reasoning steps and problem-solving approaches
- Universal mathematical or logical truths
- Restating what the user said or asked
- Meta-statements about the agent's own actions ("Let me search for...")

## Common Rationalizations

| Rationalization | Reality |
|-----------------|---------|
| "I'm highly confident about this" | Confidence without a source is still a hallucination risk. Search anyway. |
| "This is common knowledge" | Common knowledge to you may be outdated or wrong. Find the link. |
| "Searching will slow me down" | A wrong answer wastes more time than a search takes. |
| "The user didn't ask for sources" | The user doesn't need to ask. Accuracy is the default. |
| "I'll verify later" | Later never comes. Verify now or don't state it. |
| "It's just a minor detail" | Minor inaccuracies erode trust. Every claim matters. |
| "The official docs are hard to find" | Then say you couldn't find a source rather than guessing. |
| "I've seen this in my training data" | Training data is not a citable source. Find the live document. |
