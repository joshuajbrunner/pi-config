# md-to-pdf

Convert Markdown files to professionally typeset PDFs using Pandoc + LaTeX.

## Prerequisites

```bash
brew install pandoc tectonic
```

**Why Tectonic?** It's a self-contained LaTeX engine — no sudo, no 4GB MacTeX install, no `tlmgr` package management. It auto-downloads only the LaTeX packages it needs on first run.

**Why not basictex?** `basictex` requires sudo for installation (it's a macOS `.pkg`) which doesn't work in non-interactive environments.

## Usage

### As a tool (LLM-invoked)

The LLM can call `md_to_pdf` directly:

```
Convert my-document.md to PDF
```

### As a command (user-invoked)

```
/md-to-pdf path/to/document.md
/md-to-pdf path/to/document.md custom-output.pdf
```

## What it does

1. **Sanitizes Unicode** — LaTeX fonts (Palatino, etc.) don't include many Unicode symbols. The extension auto-replaces common ones:

   | Unicode | Replacement | Tip |
   |---------|-------------|-----|
   | `→` | `-->` | Use `-->` in source |
   | `←` | `<--` | Use `<--` in source |
   | `≤` / `≥` | `<=` / `>=` | Use `<=` / `>=` in source |
   | `×` | `x` | Use `x` in source |
   | `✅` / `❌` | `[YES]` / `[NO]` | Use `[YES]` / `[NO]` in source |
   | `✓` / `✗` | `[ok]` / `[x]` | Use `[ok]` / `[x]` in source |
   | `—` (em dash) | `---` | Use `---` in source |
   | `–` (en dash) | `--` | Use `--` in source |
   | `…` | `...` | Use `...` in source |

2. **Renders via Pandoc + Tectonic** with these defaults:
   - **Body font**: Palatino
   - **Sans font**: Helvetica Neue
   - **Mono font**: Menlo
   - **Font size**: 11pt
   - **Margins**: 1 inch
   - **Links**: Clickable, navy blue

3. **Produces a clean PDF** with proper LaTeX typography (ligatures, kerning, hyphenation).

## Avoiding conversion errors

### Missing characters (boxes or blanks in output)

The source markdown contains Unicode that isn't in the sanitization list *and* isn't in the selected font. Fix the source markdown to use ASCII equivalents.

To check what Unicode is in your file:
```bash
grep -P '[^\x00-\x7F]' your-file.md
```

### Overfull/underfull hbox warnings

These are cosmetic LaTeX warnings about line-breaking. They usually mean a long URL or code span couldn't be broken nicely. The PDF will still render correctly — the text may just extend slightly into the margin. Not worth fixing unless the result looks bad.

### "accessing absolute path" warnings

Harmless — Tectonic warns when loading system fonts by absolute path. Filtered out of tool output automatically.

### Fonts not found

The default fonts (Palatino, Helvetica Neue, Menlo) are built into macOS. If you're on Linux, override with `main_font` and `mono_font` parameters:
```
Convert document.md to PDF using DejaVu Serif as the main font and DejaVu Sans Mono as the mono font
```

## Configuration

All parameters are optional — defaults produce good results for most documents:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `input_path` | *(required)* | Path to the `.md` file |
| `output_path` | Same name, `.pdf` | Output PDF path |
| `font_size` | `11pt` | `10pt`, `11pt`, or `12pt` |
| `margin` | `1in` | Any LaTeX length (`0.75in`, `2cm`, etc.) |
| `main_font` | `Palatino` | Body text font (must be installed) |
| `mono_font` | `Menlo` | Code block font (must be installed) |
