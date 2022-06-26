// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import { RenderFunction } from "https://deno.land/x/fresh@1.0.0-rc.4/server.ts";
import { IS_BROWSER } from "https://deno.land/x/fresh@1.0.0-rc.4/runtime.ts";
import { compiledShortcuts } from "./classes.ts";

import {
  default as initParcel,
  transform,
} from "https://esm.sh/@parcel/css-wasm@1.10.1";
import {
  DOMParser,
  Element,
  initParser,
} from "https://deno.land/x/deno_dom@v0.1.31-alpha/deno-dom-wasm-noinit.ts";
import {
  createGenerator,
  UnoGenerator,
  UserConfig,
} from "https://esm.sh/@unocss/core@0.41.0";
import presetUno from "https://esm.sh/@unocss/preset-uno@0.41.0";
import presetIcons from "https://esm.sh/@unocss/preset-icons@0.41.0?no-require";
import presetWebFonts from "https://esm.sh/@unocss/preset-web-fonts@0.41.0";
import presetTypography from "https://esm.sh/@unocss/preset-typography@0.41.0";

const wasmInitUrl =
  "https://cdn.esm.sh/@parcel/css-wasm@1.10.1/parcel_css_node_bg.wasm";
if (!IS_BROWSER) {
  // @ts-ignore: provide absolute path to wasm module
  await initParcel(new URL(wasmInitUrl));
  await initParser();
}

// @parcel/css: css parser, transformer and minifier

const minify = (css: string | Uint8Array, filename = "styles.css") => {
  const { code } = transform({
    filename,
    code: css instanceof Uint8Array ? css : new TextEncoder().encode(css),
    minify: true,
  });
  return new TextDecoder().decode(code);
};

// unocss: on-demand atomic css

const cssResetUrl =
    "https://esm.sh/modern-normalize@1.1.0/modern-normalize.css",
  cssReset = minify(await fetch(cssResetUrl).then((res) => res.text()));

let uno: ReturnType<typeof createGenerator> | undefined;

const setup = (config: UserConfig = {
  presets: [
    presetUno({ dark: "class", variablePrefix: "uno-" }),
    presetIcons({
      cdn: "https://esm.sh/",
      extraProperties: {
        "display": "inline-block",
        "vertical-align": "middle",
      },
    }),
    presetTypography(),
    presetWebFonts(),
  ],
  preflights: [{ getCSS: () => cssReset }],
}): UnoGenerator => uno = createGenerator(config);

const render: RenderFunction = async (ctx, render) => {
  if (!uno) throw new Error("fresh_unocss: setup() must be called!");

  // get styles from prev. render in same ctx
  let [classes = "", styles = ""] = (ctx.state.get("uno") ?? []) as string[];
  // remove prev styles
  const prevStylesIndex = ctx.styles.findIndex((s) => s === styles);
  if (prevStylesIndex > -1) ctx.styles.splice(prevStylesIndex, 1);

  // extract classes
  const html = render(),
    dom = new DOMParser().parseFromString(html, "text/html")!;
  classes += " " + Array.from(dom.querySelectorAll("[class]") as unknown as //
  ArrayLike<Element>).map((e) => e.getAttribute("class")).join(" ");

  // inform uno of compiled class aliases
  uno.config.shortcuts.push(...compiledShortcuts());
  uno.config.shortcuts = [...new Set(uno.config.shortcuts)];
  // generate new css
  styles = minify((await uno.generate(classes)).css);
  ctx.styles.unshift(styles);

  // persist for next render in same ctx
  ctx.state.set("uno", [classes, styles]);
};

export { minify, render, setup };
