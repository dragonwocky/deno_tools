// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import prism from "https://esm.sh/prismjs@1.28.0";
import { type HtmlExtension } from "https://esm.sh/micromark-util-types@1.0.2/index.d.ts";
import { type Preset } from "https://esm.sh/@unocss/core@0.43.0";

type Palette = {
  "fg": string;
  "bg": string;
  "comment": string;
  "constant": string;
  "entity": string;
  "punctuation": string;
  "tag": string;
  "keyword": string;
  "string": string;
  "variable": string;
  "markup-heading": string;
  "markup-italic": string;
  "markup-bold": string;
  "inserted": string;
  "inserted-bg": string;
  "deleted": string;
  "deleted-bg": string;
  "highlight-bg": string;
  "highlight-border": string;
};

// unocss preset for use with fresh_unocss
// default colors from https://unpkg.com/browse/@primer/primitives@7.8.4/dist/scss/colors/

const presetPrism = (
  { dark = "class", lightPalette = {}, darkPalette = {} }: Partial<{
    dark: "class" | "media";
    lightPalette: Partial<Palette>;
    darkPalette: Partial<Palette>;
  }> = {},
): Preset => {
  const darkModeSelector = dark === "media"
    ? "@media (prefers-color-scheme: dark){ :root"
    : ".dark";
  return {
    name: "preset-prism",
    preflights: [{
      layer: "typography",
      getCSS: () => `
      :root {
        --prism-fg: ${lightPalette["fg"] ?? "#24292f"};
        --prism-bg: ${lightPalette["bg"] ?? "#ffffff"};
        --prism-comment: ${lightPalette["comment"] ?? "#6e7781"};
        --prism-constant: ${lightPalette["constant"] ?? "#0550ae"};
        --prism-entity: ${lightPalette["entity"] ?? "#8250df"};
        --prism-punctuation: ${lightPalette["punctuation"] ?? "#24292f"};
        --prism-tag: ${lightPalette["tag"] ?? "#116329"};
        --prism-keyword: ${lightPalette["keyword"] ?? "#cf222e"};
        --prism-string: ${lightPalette["string"] ?? "#0a3069"};
        --prism-variable: ${lightPalette["variable"] ?? "#953800"};
        --prism-markup-heading: ${lightPalette["markup-heading"] ?? "#005cc5"};
        --prism-markup-italic: ${lightPalette["markup-italic"] ?? "#24292e"};
        --prism-markup-bold: ${lightPalette["markup-bold"] ?? "#24292e"};
        --prism-inserted: ${lightPalette["inserted"] ?? "#22863a"};
        --prism-inserted-bg: ${lightPalette["inserted-bg"] ?? "#f0fff4"};
        --prism-deleted: ${lightPalette["deleted"] ?? "#b31d28"};
        --prism-deleted-bg: ${lightPalette["deleted-bg"] ?? "#ffeef0"};
        --prism-highlight-bg: ${
        lightPalette["highlight-bg"] ?? "rgb(96, 165, 250, 0.1)"
      };
        --prism-highlight-border: ${
        lightPalette["highlight-border"] ?? "#60a5fa"
      };
      }
      ${darkModeSelector} {
        --prism-fg: ${darkPalette["fg"] ?? "#c9d1d9"};
        --prism-bg: ${darkPalette["bg"] ?? "#0d1117"};
        --prism-comment: ${darkPalette["comment"] ?? "#8b949e"};
        --prism-constant: ${darkPalette["constant"] ?? "#79c0ff"};
        --prism-entity: ${darkPalette["entity"] ?? "#d2a8ff"};
        --prism-punctuation: ${darkPalette["punctuation"] ?? "#c9d1d9"};
        --prism-tag: ${darkPalette["tag"] ?? "#7ee787"};
        --prism-keyword: ${darkPalette["keyword"] ?? "#ff7b72"};
        --prism-string: ${darkPalette["string"] ?? "#a5d6ff"};
        --prism-variable: ${darkPalette["variable"] ?? "#ffa657"};
        --prism-markup-heading: ${darkPalette["markup-heading"] ?? "#1f6feb"};
        --prism-markup-italic: ${darkPalette["markup-italic"] ?? "#c9d1d9"};
        --prism-markup-bold: ${darkPalette["markup-bold"] ?? "#c9d1d9"};
        --prism-inserted: ${darkPalette["inserted"] ?? "#aff5b4"};
        --prism-inserted-bg: ${darkPalette["inserted-bg"] ?? "#033a16"};
        --prism-deleted: ${darkPalette["deleted"] ?? "#ffdcd7"};
        --prism-deleted-bg: ${darkPalette["deleted-bg"] ?? "#67060c"};
        --prism-highlight-bg: ${
        darkPalette["highlight-bg"] ?? "rgba(55, 65, 81, 0.5)"
      };
        --prism-highlight-border: ${
        darkPalette["highlight-border"] ?? "rgb(59, 130, 246)"
      };
      } ${dark === "media" ? "}" : ""}
      .code-block {
        position: relative;
        padding: 1.25rem 0;
        line-height: 1.75;
        overflow-x: auto;
      }
      .code-block, code {
        background: var(--prism-bg);
        color: var(--prism-fg);
        border-radius: 0.375rem;
      }
      .code-block > code {
        display: inline-block;
        min-width: max-content;
        width: calc(100% - 3rem);
      }
      .code-block .code-line {
        padding: 0 1.5rem;
        min-width: max-content;
        width: 100%;
      }
      .code-block > code[data-meta] {
        margin-top: 1.25rem;
      }
      .code-block > code[data-meta]::before {
        content: attr(data-meta);
        position: absolute;
        top: 0;
        left: 0;
        font-size: 0.875em;
        font-weight: bold;
        padding: 0.2rem 0.5rem 0 0.5rem;
        background: var(--prism-highlight-bg);
        border-bottom-right-radius: 0.375rem;
      }
      .code-block .highlighted-line {
        background-color: var(--prism-highlight-bg);
        box-shadow: inset 4px 0 var(--prism-highlight-border); 
      }
      .code-block > .show-line-numbers .code-line[data-line]::before {
        content: attr(data-line);
        display: inline-block;
        text-align: right;
        width: 3ch;
        margin-right: 2ch;
        margin-left: -0.5ch;
        opacity: 0.7;
      }
      .code-block .token.keyword {
        color: var(--prism-keyword);
      }
      .code-block .token.tag .token.class-name,
      .code-block .token.tag .token.script .token.punctuation {
        color: var(--prism-punctuation);
      }
      .code-block .token.operator,
      .code-block .token.number,
      .code-block .token.boolean,
      .code-block .token.builtin,
      .code-block .token.tag .token.punctuation,
      .code-block .token.tag .token.script .token.script-punctuation,
      .code-block .token.tag .token.attr-name {
        color: var(--prism-constant);
      }
      .code-block .token.function {
        color: var(--prism-entity);
      }
      .code-block .token.string,
      .code-block .token.char,
      .code-block .token.url,
      .code-block .token.regex {
        color: var(--prism-string);
      }
      .code-block .token.comment {
        color: var(--prism-comment);
      }
      .code-block .token.class-name {
        color: var(--prism-variable);
      }
      .code-block .token.regex .regex-delimiter {
        color: var(--prism-constant);
      }
      .code-block .token.tag .token.tag,
      .code-block .token.symbol,
      .code-block .token.property {
        color: var(--prism-tag);
      }
      .code-block .token.important {
        color: var(--prism-heading);
      }
      .code-block .token.important {
        color: var(--prism-list);
      }
      .code-block .token.important {
        color: var(--prism-italic);
        font-style: italic;
      }
      .code-block .token.important {
        color: var(--prism-bold);
        font-weight: bold;
      }
      .code-block .token.inserted {
        color: var(--prism-inserted);
        background: var(--prism-inserted-bg);
      }
      .code-block .token.deleted {
        color: var(--prism-deleted);
        background: var(--prism-deleted-bg);
      }
    `,
    }],
  };
};

interface CodeBlock {
  meta: string;
  language: string;
  highlightedLines: number[];
  codeLines: string[];
  showLineNumbers: boolean;
}

const defaultCodeBlockRenderer = (codeBlock: CodeBlock) => {
  const grammar = codeBlock.language
      ? prism.languages[codeBlock.language]
      : undefined,
    withSyntaxHighlighting = grammar
      ? prism.highlight(
        codeBlock.codeLines.join("\n"),
        grammar,
        codeBlock.language,
      )
        .split("\n")
      : codeBlock.codeLines,
    wrappedCodeLines = withSyntaxHighlighting.map((line, i) =>
      `<div class="code-line${
        codeBlock.highlightedLines.includes(i + 1) ? " highlighted-line" : ""
      }" data-line="${i + 1}">${line || "\n"}</div>`
    ).join("");
  return `<pre class="code-block"><code
    class="${codeBlock.language ? `language-${codeBlock.language}` : ""}${
    codeBlock.showLineNumbers ? ` show-line-numbers` : ""
  }"${codeBlock.language ? ` data-language="${codeBlock.language}"` : ""}${
    codeBlock.meta ? ` data-meta="${codeBlock.meta}"` : ""
  }>${wrappedCodeLines}</code></pre>`;
};

// inspired by https://github.com/timlrx/rehype-prism-plus
// works by hijacking https://github.com/micromark/micromark/blob/main/packages/micromark/dev/lib/compile.js

const prismHtml = (
  { renderCodeBlock = defaultCodeBlockRenderer, showLineNumbers = true }:
    Partial<{
      renderCodeBlock: (codeBlock: CodeBlock) => string;
      showLineNumbers: boolean;
    }> = {},
): HtmlExtension => ({
  enter: {
    codeFenced() {
      this.lineEndingIfNeeded();
      this.setData("fencesCount", 0);
    },
  },
  exit: {
    codeFencedFenceInfo() {
      const [codeLanguage = "plaintext", highlightStr = ""] = //
          (this.resume() ?? "").trim().split(":"),
        highlightedCodeLines = /{[\d,-]+}/.test(highlightStr)
          ? highlightStr.slice(1, -1).split(",")
            .map((num) => {
              const isRange = num.includes("-");
              if (!isRange) return Number(num);
              const [rangeStart, rangeEnd] = num.split("-")
                .map(Number).sort((a, b) => a - b);
              return Array.from(
                { length: rangeEnd - rangeStart },
                (_, i) => rangeStart + i,
              );
            }).flat()
          : [];
      this.setData("codeLanguage", this.encode(codeLanguage));
      this.setData("highlightedCodeLines", highlightedCodeLines);
    },
    codeFencedFenceMeta() {
      const codeMeta = (this.resume() ?? "").trim();
      this.setData("codeMeta", codeMeta);
    },
    codeFencedFence() {
      const fencesCount = this.getData("fencesCount") || 0;
      if (!fencesCount) this.setData("slurpOneLineEnding", true);
      this.setData("fencesCount", fencesCount + 1);
    },
    lineEnding(token) {
      if (this.getData("slurpAllLineEndings")) return;
      if (this.getData("slurpOneLineEnding")) {
        return this.setData("slurpOneLineEnding");
      } else if (this.getData("fencesCount")) {
        const codeLines = this.getData("codeLines") as string[] ?? [];
        codeLines.push("");
        return this.setData("codeLines", codeLines);
      } else if (this.getData("inCodeText")) return this.raw(" ");
      this.raw(this.encode(this.sliceSerialize(token)));
    },
    codeFlowValue(token) {
      const codeLines = this.getData("codeLines") as string[] ?? [];
      codeLines.push(this.sliceSerialize(token));
      this.setData("codeLines", codeLines);
      this.setData("slurpOneLineEnding", true);
    },
    codeFenced() {
      this.raw(renderCodeBlock({
        meta: (this.getData("codeMeta") ?? "") as string,
        language: (this.getData("codeLanguage") ?? "") as string,
        highlightedLines:
          (this.getData("highlightedCodeLines") ?? []) as number[],
        codeLines: (this.getData("codeLines") ?? []) as string[],
        showLineNumbers,
      }));

      // special case: fence not closed, micromark considers following line ending
      // outside code block, commonmark wants to treat it as part of the code
      const fencesCount = this.getData("fencesCount"),
        stillWithinFences = fencesCount !== undefined && fencesCount < 2,
        runsToEndOfContainer = stillWithinFences &&
          // @ts-expect-error: `tightStack` is always set.
          data.tightStack.length > 0 &&
          !this.getData("lastWasTag");
      if (runsToEndOfContainer) this.raw("\n");
      if (stillWithinFences) this.lineEndingIfNeeded();

      // reset data
      this.setData("flowCodeSeenData");
      this.setData("fencesCount");
      this.setData("slurpOneLineEnding");
      this.setData("codeMeta");
      this.setData("codeLanguage");
      this.setData("highlightedCodeLines");
      this.setData("codeLines");
    },
  },
});

export { defaultCodeBlockRenderer, presetPrism, prismHtml };
