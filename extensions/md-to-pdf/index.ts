/**
 * md-to-pdf — Convert Markdown files to PDF using Pandoc + Tectonic (LaTeX)
 *
 * Registers:
 *   Tool:    md_to_pdf   — callable by the LLM to convert .md → .pdf
 *   Command: /md-to-pdf  — user-invoked from the TUI
 *
 * Prerequisites (macOS):
 *   brew install pandoc tectonic
 *
 * The conversion pipeline:
 *   1. Replaces Unicode characters that most LaTeX fonts can't render
 *      (→, ←, ≤, ≥, ×, ✅, ❌, etc.) with safe ASCII/LaTeX equivalents
 *   2. Pipes sanitized markdown through Pandoc with Tectonic as the PDF engine
 *   3. Uses system fonts (Palatino, Helvetica Neue, Menlo) via fontspec
 *
 * Why Tectonic over basictex/MacTeX?
 *   - Self-contained: no sudo, no 4GB MacTeX install, no tlmgr
 *   - Auto-downloads only the LaTeX packages it needs
 *   - Single binary via `brew install tectonic`
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { access, stat } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ---------- Unicode sanitization ----------

const UNICODE_REPLACEMENTS: [RegExp, string][] = [
  [/→/g, "-->"],
  [/←/g, "<--"],
  [/≤/g, "<="],
  [/≥/g, ">="],
  [/×/g, "x"],
  [/✅/g, "[YES]"],
  [/❌/g, "[NO]"],
  [/✓/g, "[ok]"],
  [/✗/g, "[x]"],
  [/—/g, "---"],
  [/–/g, "--"],
  [/…/g, "..."],
  [/•/g, "-"],
  [/∼/g, "~"],
];

function sanitizeUnicode(text: string): string {
  let result = text;
  for (const [pattern, replacement] of UNICODE_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ---------- Dependency checking ----------

async function whichCommand(cmd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [cmd]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function checkDependencies(): Promise<{ ok: boolean; missing: string[] }> {
  const required = ["pandoc", "tectonic"];
  const missing: string[] = [];
  for (const cmd of required) {
    if (!(await whichCommand(cmd))) missing.push(cmd);
  }
  return { ok: missing.length === 0, missing };
}

// ---------- Conversion ----------

interface ConvertOptions {
  inputPath: string;
  outputPath?: string;
  fontSize?: string;
  margin?: string;
  mainFont?: string;
  monoFont?: string;
}

async function convertMarkdownToPdf(opts: ConvertOptions): Promise<{ outputPath: string; warnings: string[] }> {
  const {
    inputPath,
    fontSize = "11pt",
    margin = "1in",
    mainFont = "Palatino",
    monoFont = "Menlo",
  } = opts;

  const absInput = resolve(inputPath);

  // Verify input exists
  await access(absInput);

  // Derive output path
  const outputPath = opts.outputPath
    ? resolve(opts.outputPath)
    : resolve(dirname(absInput), basename(absInput, extname(absInput)) + ".pdf");

  // Read and sanitize
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(absInput, "utf8");
  const sanitized = sanitizeUnicode(raw);

  // Build pandoc args
  const args = [
    "--from=markdown",
    "--to=pdf",
    `--output=${outputPath}`,
    "--pdf-engine=tectonic",
    `-V`, `geometry:margin=${margin}`,
    `-V`, `fontsize=${fontSize}`,
    `-V`, `colorlinks=true`,
    `-V`, `linkcolor=NavyBlue`,
    `-V`, `urlcolor=NavyBlue`,
    `--include-in-header=/dev/stdin`,
  ];

  // LaTeX header for font configuration
  const header = [
    "\\usepackage{fontspec}",
    `\\setmainfont{${mainFont}}`,
    `\\setsansfont{Helvetica Neue}`,
    `\\setmonofont{${monoFont}}`,
  ].join("\n");

  // Run pandoc with sanitized markdown piped to stdin for the header,
  // and the sanitized content as a temp file
  const { writeFile: writeTmp, unlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { randomUUID } = await import("node:crypto");

  const tmpInput = join(tmpdir(), `md-to-pdf-${randomUUID()}.md`);
  const tmpHeader = join(tmpdir(), `md-to-pdf-header-${randomUUID()}.tex`);

  try {
    await writeTmp(tmpInput, sanitized);
    await writeTmp(tmpHeader, header);

    // Replace /dev/stdin with the header file
    const finalArgs = [
      tmpInput,
      "--from=markdown",
      "--to=pdf",
      `--output=${outputPath}`,
      "--pdf-engine=tectonic",
      `-V`, `geometry:margin=${margin}`,
      `-V`, `fontsize=${fontSize}`,
      `-V`, `colorlinks=true`,
      `-V`, `linkcolor=NavyBlue`,
      `-V`, `urlcolor=NavyBlue`,
      `--include-in-header=${tmpHeader}`,
    ];

    const { stdout, stderr } = await execFileAsync("pandoc", finalArgs, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });

    // Collect warnings (filter out the harmless "accessing absolute path" ones)
    const warnings = (stderr || "")
      .split("\n")
      .filter((line) => line.trim())
      .filter((line) => !line.includes("accessing absolute path"))
      .filter((line) => !line.includes("warnings were issued"));

    return { outputPath, warnings };
  } finally {
    // Clean up temp files
    await unlink(tmpInput).catch(() => {});
    await unlink(tmpHeader).catch(() => {});
  }
}

// ---------- Extension ----------

export default function (pi: ExtensionAPI) {
  // Register tool for LLM use
  pi.registerTool({
    name: "md_to_pdf",
    label: "Markdown to PDF",
    description: [
      "Convert a Markdown file to a professionally typeset PDF using Pandoc + LaTeX (Tectonic engine).",
      "",
      "Prerequisites: `brew install pandoc tectonic`",
      "",
      "Conversion notes:",
      "- Unicode symbols (→, ≤, ✅, etc.) are auto-replaced with ASCII equivalents",
      "  since most LaTeX fonts lack these glyphs. Use ASCII in your markdown for",
      "  best results: --> instead of →, <= instead of ≤, [YES]/[NO] instead of ✅/❌.",
      "- Em dashes (—) are replaced with ---. Use --- in source markdown.",
      "- Output uses Palatino (body), Helvetica Neue (sans), Menlo (mono).",
      "- Links are rendered as clickable navy blue text.",
      "- Default: 1in margins, 11pt font.",
      "- If the PDF has missing characters or boxes, the source markdown likely",
      "  contains Unicode that wasn't in the sanitization list. Fix the source.",
    ].join("\n"),
    parameters: Type.Object({
      input_path: Type.String({
        description: "Path to the .md file to convert (relative or absolute)",
      }),
      output_path: Type.Optional(
        Type.String({
          description:
            "Output .pdf path. Defaults to same directory/name as input with .pdf extension",
        })
      ),
      font_size: Type.Optional(
        Type.String({
          description: "Font size (e.g. '10pt', '11pt', '12pt'). Default: '11pt'",
        })
      ),
      margin: Type.Optional(
        Type.String({
          description: "Page margin (e.g. '1in', '0.75in', '2cm'). Default: '1in'",
        })
      ),
      main_font: Type.Optional(
        Type.String({
          description:
            "Main body font. Must be installed on the system. Default: 'Palatino'",
        })
      ),
      mono_font: Type.Optional(
        Type.String({
          description:
            "Monospace font for code blocks. Default: 'Menlo'",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      // Check dependencies first
      const deps = await checkDependencies();
      if (!deps.ok) {
        return {
          content: [
            {
              type: "text",
              text: [
                `Error: Missing required dependencies: ${deps.missing.join(", ")}`,
                "",
                "Install with:",
                "  brew install pandoc tectonic",
                "",
                "Tectonic is a self-contained LaTeX engine — no MacTeX or basictex needed.",
              ].join("\n"),
            },
          ],
          details: { error: true, missing: deps.missing },
        };
      }

      try {
        const result = await convertMarkdownToPdf({
          inputPath: params.input_path,
          outputPath: params.output_path,
          fontSize: params.font_size,
          margin: params.margin,
          mainFont: params.main_font,
          monoFont: params.mono_font,
        });

        const fileStats = await stat(result.outputPath);
        const sizeKB = (fileStats.size / 1024).toFixed(0);

        const lines = [`Created ${result.outputPath} (${sizeKB} KB)`];
        if (result.warnings.length > 0) {
          lines.push("", "Warnings:", ...result.warnings.map((w) => `  ${w}`));
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: {
            outputPath: result.outputPath,
            sizeKB: Number(sizeKB),
            warnings: result.warnings,
          },
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error converting ${params.input_path}: ${err.message}`,
            },
          ],
          details: { error: true, message: err.message },
        };
      }
    },
  });

  // Register /md-to-pdf command for user invocation
  pi.registerCommand("md-to-pdf", {
    description: "Convert a Markdown file to PDF. Usage: /md-to-pdf <path-to-file.md> [output.pdf]",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      if (parts.length === 0 || !parts[0]) {
        ctx.ui.notify("Usage: /md-to-pdf <input.md> [output.pdf]", "warning");
        return;
      }

      // Check dependencies
      const deps = await checkDependencies();
      if (!deps.ok) {
        ctx.ui.notify(
          `Missing: ${deps.missing.join(", ")}. Run: brew install pandoc tectonic`,
          "error"
        );
        return;
      }

      const inputPath = parts[0];
      const outputPath = parts[1];

      ctx.ui.setStatus("md-to-pdf", "Converting...");
      try {
        const result = await convertMarkdownToPdf({ inputPath, outputPath });
        const fileStats = await stat(result.outputPath);
        const sizeKB = (fileStats.size / 1024).toFixed(0);

        ctx.ui.notify(`Created ${result.outputPath} (${sizeKB} KB)`, "success");

        if (result.warnings.length > 0) {
          ctx.ui.notify(
            `${result.warnings.length} warning(s) — check output for missing characters`,
            "warning"
          );
        }
      } catch (err: any) {
        ctx.ui.notify(`Conversion failed: ${err.message}`, "error");
      } finally {
        ctx.ui.setStatus("md-to-pdf", "");
      }
    },
  });
}
