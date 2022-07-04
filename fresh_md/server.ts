// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import {
  extract,
  test,
} from "https://deno.land/std@0.146.0/encoding/front_matter.ts";
import { emojify } from "https://deno.land/x/emoji@0.2.1/mod.ts";
import { type Preset } from "https://esm.sh/@unocss/core@0.41.0";
import { gfm, gfmHtml } from "https://esm.sh/micromark-extension-gfm@2.0.1";
import { math, mathHtml } from "https://esm.sh/micromark-extension-math@2.0.2";
import {
  type Extension,
  type HtmlExtension,
} from "https://esm.sh/micromark-util-types@1.0.2/index.d.ts";
import { micromark } from "https://esm.sh/micromark@3.0.10";
import prism from "https://esm.sh/prismjs@1.28.0";
import sanitizeHtml from "https://esm.sh/sanitize-html@2.7.0";

// TODO(dragonwocky): title anchors

// transform gfm content to html with emoji aliasing,
// katex, and prism-based syntax highlighting. note that
// additional css is required for e.g. line numbers.
// these styles have been made exported as an unocss
// preset for use with fresh_unocss

// by default, only markdown + html + js will be syntax highlighted.
// support for additional languages can be imported like so:
import "https://esm.sh/prismjs@1.28.0/components/prism-typescript?no-check";
import "https://esm.sh/prismjs@1.28.0/components/prism-diff?no-check";

let config: {
  markdownExtensions: Extension[];
  htmlExtensions: HtmlExtension[];
  sanitizeHtml: boolean;
  sanitizeHtmlOpts: sanitizeHtml.IOptions;
  emojifyAliases: boolean;
  showLineNumbers: boolean;
};

// inspired by https://github.com/timlrx/rehype-prism-plus
// works by hijacking https://github.com/micromark/micromark/blob/main/packages/micromark/dev/lib/compile.js
const prismHtml: HtmlExtension = {
  enter: {
    codeFenced() {
      this.lineEndingIfNeeded();
      this.tag("<pre><code");
      this.setData("fencesCount", 0);
    },
  },
  exit: {
    codeFencedFenceInfo() {
      // e.g. ```ts:file.ts
      const codeInfo = this.resume(),
        [codeLang, codeFilename] = (codeInfo ?? "").trim().split(":");
      this.setData("codeLang", codeLang ?? "plaintext");
      this.setData("codeFilename", codeFilename ?? "");
    },
    codeFencedFenceMeta() {
      // after fence info, sep. by spaces e.g. ```ts {1,3-4}
      const codeMetaRules = (this.resume() ?? "").trim().split(" "),
        highlightLinesRule = codeMetaRules
          .find((metaRule) => /{[\d,-]+}/.test(metaRule)),
        highlightedLines = highlightLinesRule
          ? highlightLinesRule.slice(1, -1).split(",")
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
      this.setData("highlightedLines", highlightedLines);
    },
    codeFencedFence() {
      const codeLang = this.getData("codeLang") as string ?? "",
        codeFilename = this.getData("codeLang") as string ?? "",
        fencesCount = this.getData("fencesCount") || 0;
      if (!fencesCount) {
        this.tag(
          ` class="${codeLang ? `language-${this.encode(codeLang)}` : ""}${
            config.showLineNumbers ? " show-line-numbers" : ""
          }" data-language="${this.encode(codeLang)}" ${
            codeFilename ? ` data-filename="${this.encode(codeFilename)}"` : ""
          }>`,
        );
        this.setData("slurpOneLineEnding", true);
      }
      this.setData("fencesCount", fencesCount + 1);
    },
    lineEnding(token) {
      if (this.getData("slurpAllLineEndings")) return;
      if (this.getData("slurpOneLineEnding")) {
        return this.setData("slurpOneLineEnding");
      } else if (this.getData("fencesCount")) {
        const codeLines = this.getData("codeLines") as string[] ?? [];
        codeLines.push(" ");
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
      const codeLines = this.getData("codeLines") as string[] ?? [],
        codeLang = this.getData("codeLang") as string ?? "",
        highlightedLines = this.getData("highlightedLines") as number[] ?? [],
        fencesCount = this.getData("fencesCount");

      const grammar = codeLang ? prism.languages[codeLang] : undefined,
        syntaxHighlightedCode = grammar
          ? prism.highlight(codeLines.join("\n"), grammar, codeLang)
          : codeLines.join("\n"),
        processedCodeLines = syntaxHighlightedCode.split("\n").map((line, i) =>
          `<div class="code-line${
            highlightedLines.includes(i + 1) ? " highlighted-line" : ""
          }" data-line="${i + 1}">${line === " " ? "\n" : line}</div>`
        ).join("");
      this.raw(processedCodeLines);

      // special case: fence not closed, micromark considers following line ending
      // outside code block, commonmark wants to treat it as part of the code
      const stillWithinFences = fencesCount !== undefined && fencesCount < 2,
        runsToEndOfContainer = stillWithinFences &&
          // @ts-expect-error: `tightStack` is always set.
          data.tightStack.length > 0 &&
          !this.getData("lastWasTag");
      if (runsToEndOfContainer) this.raw("\n");

      this.tag("</code></pre>");
      if (stillWithinFences) this.lineEndingIfNeeded();

      // reset data
      this.setData("flowCodeSeenData");
      this.setData("fencesCount");
      this.setData("slurpOneLineEnding");
      this.setData("codeLang");
      this.setData("codeLines");
      this.setData("highlightedLines");
    },
  },
};

const setup = (userConfig: Partial<typeof config> = {}) =>
  config = {
    markdownExtensions: userConfig.markdownExtensions ?? [gfm(), math()],
    htmlExtensions: userConfig.htmlExtensions ??
      [gfmHtml(), mathHtml(), prismHtml],
    sanitizeHtml: userConfig.sanitizeHtml ?? true,
    sanitizeHtmlOpts: userConfig.sanitizeHtmlOpts ?? {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        "img",
        "video",
        "svg",
        "path",
        "details",
        "summary",
      ],
      allowedAttributes: {
        video: [
          "src",
          "alt",
          "height",
          "width",
          "autoplay",
          "muted",
          "loop",
          "playsinline",
        ],
        img: ["src", "srcset", "alt", "title", "width", "height", "loading"],
        a: ["aria-hidden", "href", "tabindex", "rel", "target"],
        svg: ["viewbox", "width", "height", "aria-hidden"],
        path: ["fill-rule", "d"],
        "*": ["class", "id", "data-*"],
      },
    },
    emojifyAliases: userConfig.emojifyAliases ?? true,
    showLineNumbers: userConfig.showLineNumbers ?? true,
  };
setup();

// colors from https://unpkg.com/browse/@primer/primitives@7.8.4/dist/scss/colors/
const presetPrism = (
  { dark = "class" }: Partial<{ dark: "class" | "media" }> = {},
): Preset => {
  const darkModeSelector = dark === "media"
    ? "@media (prefers-color-scheme: dark){ :root"
    : ".dark";
  return {
    name: "preset-prism",
    preflights: [{
      getCSS: () => `
      :root {
        --prism-fg: #24292f;
        --prism-bg: #ffffff;
        --prism-comment: #6e7781;
        --prism-constant: #0550ae;
        --prism-entity: #8250df;
        --prism-punctuation: #24292f;
        --prism-tag: #116329;
        --prism-keyword: #cf222e;
        --prism-string: #0a3069;
        --prism-variable: #953800;
        --prism-markup-heading: #005cc5;
        --prism-markup-list: #735c0f;
        --prism-markup-italic: #24292e;
        --prism-markup-bold: #24292e;
        --prism-inserted: #22863a;
        --prism-inserted-bg: #f0fff4;
        --prism-deleted: #b31d28;
        --prism-deleted-bg: #ffeef0;
        --prism-highlight-bg: rgb(96, 165, 250, 0.1);
        --prism-highlight-border: #60a5fa;
      }
      ${darkModeSelector} {
        --prism-fg: #c9d1d9;
        --prism-bg: #0d1117;
        --prism-comment: #8b949e;
        --prism-constant: #79c0ff;
        --prism-entity: #d2a8ff;
        --prism-punctuation: #c9d1d9;
        --prism-tag: #7ee787;
        --prism-keyword: #ff7b72;
        --prism-string: #a5d6ff;
        --prism-variable: #ffa657;
        --prism-markup-heading: #1f6feb;
        --prism-markup-list: #f2cc60;
        --prism-markup-italic: #c9d1d9;
        --prism-markup-bold: #c9d1d9;
        --prism-inserted: #aff5b4;
        --prism-inserted-bg: #033a16;
        --prism-deleted: #ffdcd7;
        --prism-deleted-bg: #67060c;
        --prism-highlight-bg: rgba(55, 65, 81, 0.5);
        --prism-highlight-border: rgb(59, 130, 246);
      } ${dark === "media" ? "}" : ""}
      pre, code {
        background: var(--prism-bg);
        color: var(--prism-fg);
      }
      pre > code {
        display: inline-block;
        width: 100%;
      }
      pre > code .code-line {
        padding: 0 1.5rem;
        min-width: max-content;
      }
      pre > code .token.keyword {
        color: var(--prism-keyword);
      }
      pre > code .token.tag .token.class-name,
      pre > code .token.tag .token.script .token.punctuation {
        color: var(--prism-punctuation);
      }
      pre > code .token.operator,
      pre > code .token.number,
      pre > code .token.boolean,
      pre > code .token.builtin,
      pre > code .token.tag .token.punctuation,
      pre > code .token.tag .token.script .token.script-punctuation,
      pre > code .token.tag .token.attr-name {
        color: var(--prism-constant);
      }
      pre > code .token.function {
        color: var(--prism-entity);
      }
      pre > code .token.string,
      pre > code .token.char,
      pre > code .token.url,
      pre > code .token.regex {
        color: var(--prism-string);
      }
      pre > code .token.comment {
        color: var(--prism-comment);
      }
      pre > code .token.class-name {
        color: var(--prism-variable);
      }
      pre > code .token.regex .regex-delimiter {
        color: var(--prism-constant);
      }
      pre > code .token.tag .token.tag,
      pre > code .token.symbol,
      pre > code .token.property {
        color: var(--prism-tag);
      }
      pre > code .token.important {
        color: var(--prism-heading);
      }
      pre > code .token.important {
        color: var(--prism-list);
      }
      pre > code .token.important {
        color: var(--prism-italic);
        font-style: italic;
      }
      pre > code .token.important {
        color: var(--prism-bold);
        font-weight: bold;
      }
      pre > code .token.inserted {
        color: var(--prism-inserted);
        background: var(--prism-inserted-bg);
      }
      pre > code .token.deleted {
        color: var(--prism-deleted);
        background: var(--prism-deleted-bg);
      }
      .highlighted-line {
        background-color: var(--prism-highlight-bg);
        box-shadow: inset 4px 0 var(--prism-highlight-border); 
      }
      pre > .show-line-numbers .code-line[data-line]::before {
        content: attr(data-line);
        display: inline-block;
        text-align: right;
        width: 3ch;
        margin-right: 2ch;
        margin-left: -0.5ch;
        opacity: 0.7;
      }
    `,
    }],
  };
};

const compile = <Frontmatter = Record<string, string>>(markdown: string) => {
  if (!config) throw new Error("fresh_md: setup() must be called!");

  // e.g. :coffee: -> ☕️
  if (config.emojifyAliases) markdown = emojify(markdown);

  // extract yaml data from top of file
  const hasFrontmatter = test(markdown),
    { attrs: frontmatter, body } = hasFrontmatter
      ? extract<Frontmatter>(markdown)
      : { attrs: {} as Frontmatter, body: markdown };

  // transform markdown to html with xss escaping
  let html = micromark(body, "utf8", {
    extensions: config.markdownExtensions,
    htmlExtensions: config.htmlExtensions,
    allowDangerousHtml: true,
  });
  if (config.sanitizeHtml) html = sanitizeHtml(html, config.sanitizeHtmlOpts);

  return { frontmatter, markdown: body, html };
};

export { compile, presetPrism, setup };
