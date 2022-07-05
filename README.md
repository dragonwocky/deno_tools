# deno_tools

A collection of tools and utils for Deno and the Deno ecosystem.

## `resource_bundler.ts`

Bundles static module assets/resources into a single-file archive,
e.g. for use with `deno compile`.

**Installation:**

```
deno install -A -r https://raw.githubusercontent.com/dragonwocky/deno_tools/main/resource_bundler.ts
```

**Packing a folder of resources into a single-file bundle:**

```
resource_bundler pack <input> [output=./resources.ts]
```

**Unpacking a previously generated bundle to a folder:**

```
resource_bundler unpack <input> <output>
```

## `fresh_unocss`

Integrates [UnoCSS](https://github.com/unocss/unocss) (an on-demand atomic CSS engine)
with [Fresh](https://fresh.deno.dev) (a next-gen web framework for Deno).

#### Usage

After scaffolding a new project with the Fresh init script,
add `fresh_unocss` to your project's `import_map.json`:

```json
"$unocss/": "https://raw.githubusercontent.com/dragonwocky/deno_tools/main/fresh_unocss/",
```

> **Warning:** This project lives temporarily in this repository until a proper
> plugin system is available for Fresh. To avoid dependency issues, consider
> replacing `main` with the latest commit hash of this repository.

Add the render function to your project's `main.ts` entrypoint and call the `setup()` function:

```ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { render, setup } from "$unocss/server.ts";
setup();

await start(manifest, { render });
```

`fresh_unocss` supports class interpretation and class compilation via
the [`fresh_unocss/runtime.ts`](./fresh_unocss/runtime.ts) module.
Variant group expansion is available in both modes, to convert e.g.
`dark:(font-bold m(x-1 y-2) border-(red-200 1))` to
`dark:font-bold dark:mx-1 dark:my-2 dark:border-red-200 dark:border-1`.

> **Warning:** Class processing and generation occurs server-side only.
> If additional utility classes are likely to be required on the client-side,
> they should be temporarily added to placeholder elements in interactive islands.

E.g.

```tsx
/** @jsx h */
import { h } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";
import { compile, interpret } from "$unocss/runtime.ts";

export default () => {
  return (
    <div class={compile`font-bold`}>
      This will be rendered client-side with the class `uno-be1c65b3`.
      {!IS_BROWSER && (
        <div class={interpret`text-red-700`}>
          This will not be rendered client-side, but styling for the `text-red-700` class will
          still be generated.
        </div>
      )}
    </div>
  );
};
```

#### Configuration

The default configuration can be found within [`fresh_unocss/server.ts`](./fresh_unocss/server.ts).
It comes with [`@unocss/preset-uno`](https://github.com/unocss/unocss/tree/main/packages/preset-uno),
[`@unocss/preset-icons`](https://github.com/unocss/unocss/tree/main/packages/preset-icons),
[`@unocss/preset-typography`](https://github.com/unocss/unocss/tree/main/packages/preset-typography),
[Inter](https://rsms.me/inter/), [Fira Code](https://github.com/tonsky/FiraCode),
and [modern-normalize](https://github.com/sindresorhus/modern-normalize).

Custom configuration can be provided as a [config](https://github.com/unocss/unocss#configurations)
object to the first argument of the `setup()` function. To override the defaults, the second argument
of the `setup()` function should to set to false. To extend the defaults, the second argument should
be set to true or left unset.

## `fresh_md`

Integrates [micromark](https://github.com/micromark/micromark) (a tiny Markdown parser)
with [Fresh](https://fresh.deno.dev) (a next-gen web framework for Deno).

#### Usage

After scaffolding a new project with the Fresh init script,
add `fresh_md` to your project's `import_map.json`:

```json
"$md/": "https://raw.githubusercontent.com/dragonwocky/deno_tools/main/fresh_md/",
```

> **Warning:** This project lives temporarily in this repository until a proper
> plugin system is available for Fresh. To avoid dependency issues, consider
> replacing `main` with the latest commit hash of this repository.

`fresh_md` takes a Markdown string, processes it and applies the configured
extensions, and returns an object containing parsed frontmatter and generated HTML.

E.g.

```tsx
/** @jsx h */
import { h } from "preact";
import { Head } from "$fresh/runtime.ts";
import { Handlers, type PageProps } from "$fresh/server.ts";
import { compile } from "$md/server.ts";
import { Status, STATUS_TEXT } from "$std/http/mod.ts";
import { interpret } from "$unocss/runtime.ts";

type Post = {
  html: string;
  frontmatter: { title: string };
};

export const handler: Handlers<Post> = {
  async GET(_, context) {
    const { post } = context.params,
      filename = new URL(`../data/posts/${post}.md`, import.meta.url);
    try {
      if (!post) throw new Error();
      await Deno.stat(filename);
    } catch {
      return new Response(STATUS_TEXT[Status.NotFound], {
        status: Status.NotFound,
        statusText: STATUS_TEXT[Status.NotFound],
      });
    }
    const markdown = await Deno.readTextFile(filename),
      { html, frontmatter } = compile<Post["frontmatter"]>(markdown);
    return context.render({ html, frontmatter });
  },
};

export default function Blog(props: PageProps<Post>) {
  const {
    html,
    frontmatter: { title },
  } = props.data;
  return (
    <main class={interpret`font-sans flex`}>
      <Head>
        <title>{title}</title>
      </Head>
      <article
        class={interpret`mx-auto prose prose-neutral`}
        dangerouslySetInnerHTML={{ __html: html }}
      ></article>
    </main>
  );
}
```

##### Styling

Styles for heading anchors and code blocks (e.g. for syntax highlighting, line numbers,
and line highlighting) are available as UnoCSS presets for use with `fresh_unocss`.
They should be applied as extensions of the default configuration in `main.ts`, like so:

```ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";

import { render, setup } from "$unocss/server.ts";
import { presetHeadingAnchors, presetPrism } from "$md/server.ts";
setup({ presets: [presetHeadingAnchors(), presetPrism()] }, true);

await start(manifest, { render });
```

Styles for inline math and math blocks should be included from a CDN:

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css"
  integrity="sha384-Xi8rHCmBmhbuyyhbI88391ZKP2dmfnOl4rT9ZfRI7mLTdk1wblIUnrIq35nqwEvC"
  crossorigin="anonymous"
/>
```

##### Code Highlighting

By default, Prism will only syntax highlight Markdown, HTML, JavaScript and TypeScript.
Support for additional languages should be imported in the `main.ts` file
([full list](https://github.com/PrismJS/prism/tree/master/components)):

```js
import "https://esm.sh/prismjs@1.28.0/components/prism-bash?no-check";
```

Line highlights and code block meta are defined at the top of fenced code blocks,
in the format ` ```language:{highlight_lines} code_block_meta `, e.g. ` ```ts:{1-2,4} server.ts `:

![](https://user-images.githubusercontent.com/16874139/177285480-ca3d03f0-4d4c-4b51-8dee-c23cbb3f4073.png)

#### Configuration

The default configuration can be found within [`fresh_md/server.ts`](./fresh_unocss/server.ts).
It comes with [`micromark-extension-gfm`](https://github.com/micromark/micromark-extension-gfm),
[`micromark-extension-math`](https://github.com/micromark/micromark-extension-math)
for server-side [KaTeX](https://katex.org/),
[`Prism`](https://prismjs.com/)-based syntax highlighting with
line numbers and line highlights, [emoji alias replacement](https://deno.land/x/emoji),
and [sanitize-html](https://github.com/apostrophecms/sanitize-html) to prevent XSS
or other unwanted output.

Custom configuration can be provided as a
[userConfig](https://github.com/dragonwocky/deno_tools/blob/main/fresh_md/server.ts#L44-L51)
object to the first argument of the `setup()` function.
