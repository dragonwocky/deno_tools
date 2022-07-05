// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import { RenderFunction } from "https://deno.land/x/fresh@1.0.1/server.ts";
import { getCompiledClassAliases } from "./runtime.ts";

import {
  default as initParcel,
  transform,
} from "https://esm.sh/@parcel/css-wasm@1.10.1";
import {
  createGenerator,
  type UnoGenerator,
  type UserConfig,
} from "https://esm.sh/@unocss/core@0.43.0";
import presetUno from "https://esm.sh/@unocss/preset-uno@0.43.0";
import presetIcons from "https://esm.sh/@unocss/preset-icons@0.43.0?no-require";
import presetWebFonts from "https://esm.sh/@unocss/preset-web-fonts@0.43.0";
import presetTypography from "https://esm.sh/@unocss/preset-typography@0.43.0";

const wasmInitUrl =
  "https://cdn.esm.sh/@parcel/css-wasm@1.10.1/parcel_css_node_bg.wasm";
// @ts-ignore: provide absolute path to wasm module
await initParcel(new URL(wasmInitUrl));

// @parcel/css provides better minification than unocss' builtin
// { minify: true } output option and is necessary to properly
// minify preset-generated css e.g. preflights, @font-face rules

const minify = (css: string | Uint8Array, filename = "styles.css") => {
  const { code } = transform({
    filename,
    code: css instanceof Uint8Array ? css : new TextEncoder().encode(css),
    minify: true,
  });
  return new TextDecoder().decode(code);
};

const cssResetUrl = "https://esm.sh/modern-normalize@1.1.0?css",
  cssReset = await fetch(cssResetUrl).then((res) => res.text());

// unocss: generates on-demand atomic css from strings of
// html on the server-side. imports shortcuts from
// client.ts to support compiled classes

let uno: ReturnType<typeof createGenerator> | undefined;

const setup = (
  config: UserConfig = {},
  extendDefaults = true,
): UnoGenerator => {
  return uno = createGenerator({
    ...config,
    presets: extendDefaults
      ? [
        presetUno({ dark: "class", variablePrefix: "uno-" }),
        presetIcons({
          cdn: "https://esm.sh/",
          extraProperties: {
            "display": "inline-block",
            "vertical-align": "middle",
          },
        }),
        presetTypography({
          cssExtend: {
            // make code blocks look nice
            "pre": {
              "max-width": "100%",
              "min-width": "100%",
              "display": "inline-block",
              "padding": "1.25rem 0",
            },
            "code:not(pre code)": {
              "padding": "0 0.3em",
              "margin": "0 0.1em",
            },
            "pre, code": {
              "color": "var(--prism-fg, var(--un-prose-code))",
              "background": "var(--prism-bg, transparent)",
            },
            "pre, code:not(pre code)": {
              "border": "1px solid var(--un-prose-borders)",
              "border-radius": "0.375rem",
            },
            // disable unnecessary margins at the bottom of <details> elems
            "details > *:last-child": {
              "margin-bottom": "0",
            },
          },
        }),
        presetWebFonts({
          fonts: {
            sans: "Inter",
            mono: "Fira Code",
          },
        }),
        ...(config.presets ?? []),
      ]
      : config.presets,
    preflights: extendDefaults
      ? [{ getCSS: () => cssReset }, ...(config.preflights ?? [])]
      : config.preflights,
  });
};

const render: RenderFunction = async (ctx, render) => {
  if (!uno) throw new Error("fresh_unocss: setup() must be called!");

  // get styles from prev. render in same ctx
  let [html = "", styles = ""] = (ctx.state.get("uno") ?? []) as string[];
  // remove prev styles
  const prevStylesIndex = ctx.styles.findIndex((s) => s === styles);
  if (prevStylesIndex > -1) ctx.styles.splice(prevStylesIndex, 1);

  // render page and components
  html += render();
  // inform uno of compiled class aliases (must be done post-render)
  uno.config.shortcuts.push(...getCompiledClassAliases());
  uno.config.shortcuts = [...new Set(uno.config.shortcuts)];
  // generate new css
  styles = minify((await uno.generate(html)).css);
  ctx.styles.unshift(styles);

  // persist for next render in same ctx
  ctx.state.set("uno", [html, styles]);
};

export { minify, render, setup };
