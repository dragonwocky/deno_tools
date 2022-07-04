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

**Usage:**

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

**Configuration:**

The default configuration can be found within [`fresh_unocss/server.ts`](./fresh_unocss/server.ts).
It comes with [`@unocss/preset-uno`](https://github.com/unocss/unocss/tree/main/packages/preset-uno),
[`@unocss/preset-icons`](https://github.com/unocss/unocss/tree/main/packages/preset-icons),
[`@unocss/preset-typography`](https://github.com/unocss/unocss/tree/main/packages/preset-typography),
[Inter](https://rsms.me/inter/), [Fira Code](https://github.com/tonsky/FiraCode),
and [modern-normalize](https://github.com/sindresorhus/modern-normalize). It can
be overriden by providing a [config](https://github.com/unocss/unocss#configurations)
object to the first argument of the `setup()` function.
