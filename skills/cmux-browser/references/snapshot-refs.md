# Snapshot and Refs

Element refs from snapshots make browser automation compact and reliable.

## How Refs Work

Traditional flow:
```
full DOM/HTML -> selector guessing -> action
```

cmux flow:
```
snapshot -> refs (e1/e2/...) -> direct action
```

## The Snapshot Command

```bash
cmux browser surface:7 snapshot                          # basic snapshot
cmux browser surface:7 snapshot --interactive            # with element refs
cmux browser surface:7 snapshot --interactive --compact --max-depth 3  # condensed
cmux browser surface:7 snapshot --selector "form#login" --interactive  # scoped
```

## Using Refs

```bash
cmux browser surface:7 click e6
cmux browser surface:7 fill e10 "user@example.com"
cmux browser surface:7 fill e11 "password123"
cmux browser surface:7 click e12
```

## Ref Lifecycle

Refs are **invalidated** when the page structure changes:

```bash
cmux browser surface:7 snapshot --interactive
# e1 is "Next" button

cmux browser surface:7 click e1
# Page changed -- old refs are now stale!

# MUST re-snapshot
cmux browser surface:7 snapshot --interactive
# Now e1 might be something different
```

## Best Practices

1. **Snapshot before interacting** -- never use refs from a previous page state
2. **Re-snapshot after navigation/modal/DOM changes**
3. **Use `--snapshot-after`** on mutating actions for convenience
4. **Scope snapshots with `--selector`** for very large pages

## Troubleshooting

### `not_found` / stale ref

The ref no longer exists. Re-snapshot:
```bash
cmux browser surface:7 snapshot --interactive
```

### Element not visible due to timing

Wait for it, then scroll into view:
```bash
cmux browser surface:7 wait --selector "#target" --timeout-ms 10000
cmux browser surface:7 scroll --dy 400
cmux browser surface:7 snapshot --interactive
```

### Too many elements in snapshot

Scope to a specific container:
```bash
cmux browser surface:7 snapshot --selector "form#checkout" --interactive
```
