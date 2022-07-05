// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import {
  type CompileContext,
  type HtmlExtension,
} from "https://esm.sh/micromark-util-types@1.0.2/index.d.ts";
import { slugify } from "https://deno.land/x/slugify@0.3.0/mod.ts";
import { type Preset } from "https://esm.sh/@unocss/core@0.43.0";

interface Heading {
  rank: number;
  text: string;
  slugs: Set<string>;
}

const defaultHeadingWithAnchorRenderer = (heading: Heading) => {
  let duplicates = 0;
  const baseSlug = slugify(heading.text, { lower: true }),
    computedSlug = () => baseSlug + (duplicates > 0 ? `-${duplicates}` : "");
  while (heading.slugs.has(computedSlug())) duplicates++;
  heading.slugs.add(computedSlug());
  return `<h${heading.rank} class="heading"><a aria-hidden="true" tabindex="-1" class="heading-anchor" href="#${computedSlug()}"id="${computedSlug()}"></a><span>${heading.text}</span></h${heading.rank}>`;
};

const presetHeadingAnchors = ({ icon = "ph:link-bold" } = {}): Preset => ({
  name: "preset-heading-slugs",
  shortcuts: {
    "heading": "flex items-center",
    "heading-anchor": `i-${icon} opacity-0 h-5 w-5 -ml-6 mr-1`,
  },
  preflights: [{
    layer: "typography",
    getCSS: () => `
    .heading-anchor {
      scroll-margin: 1.5rem 0;
    }
    :hover > .heading-anchor {
      opacity: 0.7
    }
    `,
  }],
});

// adds id slugs to headings and wraps them in anchor links
// works by hijacking https://github.com/micromark/micromark/blob/main/packages/micromark/dev/lib/compile.js

const headingAnchorsHtml = (
  { renderHeadingWithAnchor = defaultHeadingWithAnchorRenderer }: Partial<{
    renderHeadingWithAnchor: (heading: Heading) => string;
  }> = {},
): HtmlExtension => {
  const compileContextSlugs = (ctx: CompileContext) => {
    if (!ctx.getData("headingSlugs")) ctx.setData("headingSlugs", new Set());
    return ctx.getData("headingSlugs") as Set<string>;
  };
  return {
    exit: {
      setextHeading() {
        // (underlined headers)
        const value = this.resume();
        this.lineEndingIfNeeded();
        this.raw(renderHeadingWithAnchor({
          rank: (this.getData("headingRank") ?? 1) as number,
          text: value,
          slugs: compileContextSlugs(this),
        }));
        this.setData("slurpAllLineEndings");
        this.setData("headingRank");
      },
      atxHeadingSequence(token) {
        // (hashed headers)
        if (this.getData("headingRank")) return;
        const headingRank = this.sliceSerialize(token).length;
        this.setData("headingRank", headingRank);
        this.lineEndingIfNeeded();
      },
      data(token) {
        const data = this.encode(this.sliceSerialize(token));
        if (this.getData("headingRank")) {
          this.setData("headingText", data);
        } else this.raw(data);
      },
      atxHeading() {
        this.raw(renderHeadingWithAnchor({
          rank: (this.getData("headingRank") ?? 1) as number,
          text: (this.getData("headingText") ?? "") as string,
          slugs: compileContextSlugs(this),
        }));
        // reset data
        this.setData("headingRank");
        this.setData("headingText");
      },
    },
  };
};

export { headingAnchorsHtml, presetHeadingAnchors };
