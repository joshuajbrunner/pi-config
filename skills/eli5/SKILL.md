---
name: eli5
description: Simplify and re-explain complex topics in plain, approachable language. Use when the user says "dumb it down", "explain like I'm 5", "eli5", "simplify this", "I don't understand", or asks for a beginner-friendly explanation. Treats the user as a junior developer learning the ropes.
---

# ELI5 --- Explain Like I'm 5

Re-explain the current topic (or a specified topic) in the simplest possible terms.

## How to Explain

Follow these rules when simplifying:

1. **Use plain language.** Avoid jargon. If you must use a technical term, define it immediately in one short sentence.
2. **Use analogies and metaphors.** Relate abstract concepts to everyday, concrete things (folders, mailboxes, assembly lines, restaurants, etc.).
3. **Short sentences, short paragraphs.** No walls of text. Aim for 1--2 sentence paragraphs.
4. **Build up from zero.** Don't assume prior knowledge. Start from the simplest foundation and layer on detail gradually.
5. **Use concrete examples.** Show tiny, runnable code snippets or step-by-step scenarios rather than abstract descriptions.
6. **Summarize first, detail second.** Lead with a one-liner "the big idea" summary, then expand.
7. **Check understanding.** End with a brief "In short..." recap and optionally ask if the user wants to go deeper on any part.

## Tone

- Friendly, encouraging, zero condescension.
- Think "patient senior dev pair-programming with a junior" --- not "professor lecturing a student."
- Use "we" language: "What we're doing here is..." / "Think of it like..."

## When Invoked

- If the conversation already contains a complex explanation, **re-explain that same topic** using the rules above. Do not ask what to explain --- just simplify whatever was last discussed.
- If invoked with a specific topic (e.g., `/skill:eli5 dependency injection`), explain that topic from scratch.
- If there is no prior context and no topic given, ask the user what they'd like explained.
