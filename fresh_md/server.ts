// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import {
  extract,
  test,
} from "https://deno.land/std@0.146.0/encoding/front_matter.ts";
import { emojify } from "https://deno.land/x/emoji@0.2.1/mod.ts";
import { gfm, gfmHtml } from "https://esm.sh/micromark-extension-gfm@2.0.1";
import {
  math,
  mathHtml,
} from "https://esm.sh/micromark-extension-math@2.0.2?deps=katex@0.16.0";
import {
  type Extension,
  type HtmlExtension,
} from "https://esm.sh/micromark-util-types@1.0.2/index.d.ts";
import { micromark } from "https://esm.sh/micromark@3.0.10";
import sanitizeHtml from "https://esm.sh/sanitize-html@2.7.0";

import { prismHtml } from "./micromark_prism.ts";
import { headingAnchorsHtml } from "./micromark_heading_anchors.ts";

// transforms gfm content to html via micromark with emoji
// aliasing, katex math, and prism.js syntax highlighting.
// recommended to be used with @unocss/preset-typography
// as in fresh_unocss

// additional heading styling for heading anchors and
// additional code block styling for line numbers, line highlights
// and syntax highlighting are exported as unocss presets

// by default, only markdown + html + js will be syntax highlighted.
// support for additional languages can be imported like so:
import "https://esm.sh/prismjs@1.28.0/components/prism-typescript?no-check";

// the following stylesheet should be included for math formatting:
// <link
//   rel="stylesheet"
//   href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css"
//   integrity="sha384-Xi8rHCmBmhbuyyhbI88391ZKP2dmfnOl4rT9ZfRI7mLTdk1wblIUnrIq35nqwEvC"
//   crossOrigin="anonymous"
// />

let config: {
  markdownExtensions: Extension[];
  htmlExtensions: HtmlExtension[];
  sanitizeHtml: boolean;
  sanitizeHtmlOpts: sanitizeHtml.IOptions;
  emojifyAliases: boolean;
  showLineNumbers: boolean;
};

const setup = (userConfig: Partial<typeof config> = {}) => {
  const showLineNumbers = userConfig.showLineNumbers ?? true;
  return config = {
    markdownExtensions: userConfig.markdownExtensions ??
      [gfm(), math({ singleDollarTextMath: false })],
    htmlExtensions: userConfig.htmlExtensions ??
      [
        gfmHtml(),
        mathHtml(),
        prismHtml({ showLineNumbers }),
        headingAnchorsHtml(),
      ],
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
        "*": ["class", "id", "style", "data-*"],
      },
    },
    emojifyAliases: userConfig.emojifyAliases ?? true,
    showLineNumbers,
  };
};
setup();

const compile = <Frontmatter = Record<string, string>>(markdown: string) => {
  if (!config) throw new Error("fresh_md: setup() must be called!");

  // e.g. :coffee: -> ☕️
  if (config.emojifyAliases) markdown = emojify(markdown);

  // extract yaml data from top of file
  const hasFrontmatter = test(markdown),
    { attrs: frontmatter, body } = hasFrontmatter
      ? extract<Frontmatter>(markdown)
      : { attrs: {} as Frontmatter, body: markdown };

  // transform markdown to html with xss prevention
  let html = micromark(body, "utf8", {
    extensions: config.markdownExtensions,
    htmlExtensions: config.htmlExtensions,
    allowDangerousHtml: true,
  });
  if (config.sanitizeHtml) html = sanitizeHtml(html, config.sanitizeHtmlOpts);

  return { frontmatter, markdown: body, html };
};

export { compile, setup };
export { presetPrism } from "./micromark_prism.ts";
export { presetHeadingAnchors } from "./micromark_heading_anchors.ts";
