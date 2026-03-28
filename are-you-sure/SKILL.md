---
name: are-you-sure
description: Use when about to state a conclusion, diagnosis, recommendation, or any technical assertion — requires actively arguing against your own position before committing to it, to catch first-match bias, confirmation bias, and shallow analysis.
---

# Are You Sure

Before stating any conclusion, argue against it. If it survives, state it. If it doesn't, investigate further.

## The Rule

Apply the devil's advocate pattern before any claim:

1. **Initial conclusion** — what you believe to be true
2. **Strongest counter-argument** — alternative explanations, contradicting evidence, gaps in your investigation
3. **Final position** — the original holds (and why the counter fails), or you've changed your mind

```markdown
# BAD — first match, no challenge
"The timeout is caused by the database query. I'll add an index."

# GOOD — devil's advocate applied
"My initial conclusion is the timeout is caused by the database query —
it takes 3.2s in the slow query log.

However, the network trace shows 1.8s of that is connection pool
exhaustion, not query execution. Adding an index wouldn't help if the
pool is starved. The connection pool is sized at 5 but there are 20
concurrent requests.

Revised conclusion: the root cause is connection pool sizing, not
query performance. I'll increase the pool size and re-measure before
considering an index."
```

## What Triggers This

- Technical assertions (API behavior, how something works)
- Root cause diagnoses ("the bug is caused by X")
- Solution recommendations ("you should do X")
- Any judgment call stated as fact

## What Does NOT Trigger This

- Restating what the user said or asked
- Mechanical operations (running a command, reading a file)
- Asking the user a question
- Code the agent writes (architecture decisions are separate from factual claims)
- Universal truths (1 + 1 = 2)

## Common Rationalizations

| Rationalization | Reality |
|-----------------|---------|
| "This is obvious" | Obvious conclusions are where blind spots hide. Challenge it anyway. |
| "I already considered alternatives" | If you didn't state them, you didn't consider them rigorously. Make it visible. |
| "It'll slow me down" | A wrong conclusion wastes more time than 30 seconds of self-challenge. |
| "I found strong evidence" | Strong evidence for one theory doesn't rule out other theories. Look for disconfirming evidence. |
| "There's only one possible explanation" | That belief is itself the bias. There is almost never only one explanation. |
| "I'll verify after implementing" | Implementing the wrong fix and then discovering it wastes far more time. Challenge now. |
| "The user wants a quick answer" | The user wants a correct answer. Speed without accuracy is waste. |
| "I checked multiple sources" | Multiple sources agreeing doesn't mean you asked the right question. Did you search for why you might be wrong? |
