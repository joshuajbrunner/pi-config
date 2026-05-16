# Browser Command Reference

Full command mapping for `cmux browser` commands.

## Navigation

```bash
cmux browser open <url>                        # opens in caller's workspace
cmux browser open <url> --workspace <ref>      # opens in specific workspace
cmux browser <surface> goto <url>
cmux browser <surface> back
cmux browser <surface> forward
cmux browser <surface> reload
cmux browser <surface> get url
cmux browser <surface> get title
```

## Snapshot and Inspection

```bash
cmux browser <surface> snapshot --interactive
cmux browser <surface> snapshot --interactive --compact --max-depth 3
cmux browser <surface> snapshot --selector "form#checkout" --interactive
cmux browser <surface> get text <ref-or-selector>
cmux browser <surface> get html <ref-or-selector>
cmux browser <surface> get value <selector>
cmux browser <surface> get attr <selector> --attr <name>
cmux browser <surface> get count <selector>
cmux browser <surface> get box <selector>
cmux browser <surface> get styles <selector> --property <name>
cmux browser <surface> eval '<javascript>'
```

## Interaction

```bash
cmux browser <surface> click <ref>
cmux browser <surface> dblclick <ref>
cmux browser <surface> hover <ref>
cmux browser <surface> focus <ref>
cmux browser <surface> fill <ref> "text"         # clears and sets value
cmux browser <surface> fill <ref> ""             # clears input
cmux browser <surface> type <ref> "text"         # types character by character
cmux browser <surface> press <key>               # Enter, Tab, Escape, etc.
cmux browser <surface> keydown <key>
cmux browser <surface> keyup <key>
cmux browser <surface> select <ref> "value"
cmux browser <surface> check <ref>
cmux browser <surface> uncheck <ref>
cmux browser <surface> scroll [--selector <css>] [--dx <n>] [--dy <n>]
cmux browser <surface> scroll-into-view <ref>
```

## Wait

```bash
cmux browser <surface> wait --selector "#ready" --timeout-ms 10000
cmux browser <surface> wait --text "Done" --timeout-ms 10000
cmux browser <surface> wait --url-contains "/dashboard" --timeout-ms 10000
cmux browser <surface> wait --load-state complete --timeout-ms 15000
cmux browser <surface> wait --function "js expression" --timeout-ms 10000
```

## Session and State

```bash
cmux browser <surface> cookies get
cmux browser <surface> cookies set <name> <value>
cmux browser <surface> cookies clear
cmux browser <surface> storage local get <key>
cmux browser <surface> storage local set <key> <value>
cmux browser <surface> storage session get <key>
cmux browser <surface> storage session set <key> <value>
cmux browser <surface> storage local clear
cmux browser <surface> storage session clear
cmux browser <surface> state save <path>
cmux browser <surface> state load <path>
```

## Browser Tabs

```bash
cmux browser <surface> tab list
cmux browser <surface> tab new <url>
cmux browser <surface> tab switch <index>
cmux browser <surface> tab close <index>
```

## Diagnostics

```bash
cmux browser <surface> console list
cmux browser <surface> console clear
cmux browser <surface> errors list
cmux browser <surface> errors clear
cmux browser <surface> highlight <selector>
cmux browser <surface> screenshot [--path <file>]
cmux browser <surface> download wait --timeout-ms 10000
```

## Profiles

```bash
cmux browser profiles list
cmux browser profiles add <name>
cmux browser profiles rename <old> <new>
cmux browser profiles clear <name> [--force]
cmux browser profiles delete <name>
cmux browser import [--from <browser>] [--profile <name>] [--domain <domain>]
```

## Advanced

```bash
cmux browser <surface> find --role button
cmux browser <surface> find --text "Submit"
cmux browser <surface> find --label "Email"
cmux browser <surface> find --testid "submit-btn"
cmux browser <surface> frame <name-or-url>
cmux browser <surface> dialog accept|dismiss
cmux browser <surface> viewport --width 1280 --height 720
cmux browser <surface> addinitscript '<js>'
cmux browser <surface> addstyle '<css>'
cmux browser <surface> identify
```

## Useful Flags

- `--json` -- machine-readable output
- `--snapshot-after` -- return fresh snapshot after mutating action
- `--timeout-ms <ms>` -- timeout for wait operations
- `--interactive` -- include element refs in snapshot
- `--compact` -- shorter snapshot output
- `--max-depth <n>` -- limit DOM depth in snapshot

## Known WKWebView Gaps (not supported)

- `browser.viewport.set`
- `browser.geolocation.set`
- `browser.offline.set`
- `browser.trace.start|stop`
- `browser.network.route|unroute|requests`
- `browser.screencast.start|stop`
- `browser.input_mouse|input_keyboard|input_touch`
