---
description: Verify the agent's work with applicable builds, tests, live app/API checks, and a final summary
argument-hint: "[custom verification instructions]"
---
Verify the work completed in this task end-to-end.

Custom verification instructions from the user, if any:

$ARGUMENTS

Follow this process:

1. Determine what verification is applicable for this repository and change set.
   - Inspect available scripts, test commands, documentation, and project structure.
   - Do not invent unavailable checks, but do look for unit tests, integration tests, e2e tests, visual tests, architecture tests, type checks, linters, format checks, build commands, and any other project-specific validation.

2. Build the app/package if applicable.
   - Use the project's documented package manager and commands.
   - If there are multiple apps/packages, verify the affected ones.

3. Run all applicable automated checks.
   - Unit tests
   - Integration tests
   - End-to-end tests
   - Visual regression tests
   - Architecture/dependency-boundary tests
   - Type checking
   - Linting/format validation
   - Any project-specific verification commands

4. If this is a web app and live behavior can be verified, verify it against the running app using the browser-use skill.
   - Start required dev server(s) if needed.
   - If currently operating in cmux, use the cmux skill to inspect the current layout and run dev server(s) in cmux rather than blocking the main agent flow.
   - Prefer browser-use for browser automation.
   - Verify the user's custom instructions when provided, for example: navigation, rendering, forms, login flows, and expected UI state.

5. If this exposes or depends on a live API, verify against the live/local API when applicable.
   - Start required API server(s) if needed.
   - Check relevant endpoints, request/response behavior, authentication, error handling, and any user-specified API behavior.

6. Fix issues found during verification when the fix is in scope.
   - After fixing, rerun the relevant checks until they pass or until blocked.
   - If blocked by missing credentials, unavailable services, flaky external dependencies, or environment limitations, clearly explain the blocker and what remains unverified.

7. Shut down any dev servers or temporary processes started during verification.
   - Do not shut down servers that were already running before verification began unless the user explicitly asks.
   - If servers were started in cmux, stop those cmux processes/panes cleanly when possible.

8. Provide a final verification summary.
   - List each verification performed and its result.
   - List any issues discovered.
   - List what was fixed during verification.
   - List anything not verified and why.
   - Include the exact commands/tools used where helpful.
