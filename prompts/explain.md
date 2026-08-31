---
description: Walk through unfamiliar code from first principles, hand-holding through functions and lifecycle
argument-hint: "[file, function, or area to explain]"
---
Assume I am new to this codebase and want to genuinely understand it, not just get an answer.

What to focus on (a file, function, feature, or area). If empty, orient me to the code most relevant to the current task:

$ARGUMENTS

Follow this approach:

1. Start from first principles.
   - Explain what each function, module, or component does and why it exists — don't assume I know the framework, libraries, or conventions.
   - Define domain terms and jargon the first time they appear.

2. Trace the flow, don't just describe pieces.
   - Walk through execution order: what calls what, in what sequence, and why.
   - For lifecycle events (init, mount, render, update, teardown, request/response, etc.), explain when each fires, what triggers it, and what state exists at that point.

3. Hand-hold through the actual code.
   - Quote the relevant lines and explain them in plain language, step by step.
   - Point out non-obvious behavior, side effects, and gotchas.

4. Connect the dots.
   - Show how this piece fits into the bigger picture and interacts with the rest of the system.
   - Use a small diagram or numbered flow when it makes the structure clearer.

5. Check my understanding.
   - Summarize the key takeaways at the end.
   - Flag the few things most worth remembering, and offer where to look next.

Prefer clarity over brevity. It's fine to over-explain — I'd rather understand deeply than move fast.
