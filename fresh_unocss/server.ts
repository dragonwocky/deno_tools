// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import { type RenderFunction } from "$fresh/server.ts";
import {
  default as initParcel,
  transform,
} from "https://esm.sh/@parcel/css-wasm@1.13.1";
import {
  createGenerator,
  type UnoConfig,
  type UnoGenerator,
} from "https://esm.sh/@unocss/core@0.45.18";
import presetIcons from "https://esm.sh/@unocss/preset-icons@0.45.18?no-require";
import presetTypography from "https://esm.sh/@unocss/preset-typography@0.45.18";
import presetUno from "https://esm.sh/@unocss/preset-uno@0.45.18";
import presetWebFonts from "https://esm.sh/@unocss/preset-web-fonts@0.45.18";
import { _getCompiledClassAliases } from "./runtime.ts";

// @parcel/css provides better minification than unocss' builtin
// { minify: true } output option and is necessary to properly
// minify preset-generated css e.g. preflights, @font-face rules
let useParcel: boolean;
const wasmInitUrl =
    "https://cdn.esm.sh/@parcel/css-wasm@1.13.1/parcel_css_node_bg.wasm",
  minify = (css: string | Uint8Array, filename = "styles.css") => {
    const { code } = transform({
      filename,
      code: css instanceof Uint8Array ? css : new TextEncoder().encode(css),
      minify: true,
    });
    return new TextDecoder().decode(code);
  };

// modern-normalize: normalises and resets default browser styling
const cssResetUrl = "https://esm.sh/modern-normalize@1.1.0?css",
  cssReset = await fetch(cssResetUrl).then((res) => res.text());

// unocss: generates on-demand atomic css from strings of html
let uno: UnoGenerator;
const defaultPresets = [
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
];

const render: RenderFunction = async (ctx, render) => {
  if (!uno) throw new Error("fresh_unocss: await setup() must be called!");
  // extract styles from prev. render in same ctx
  let [htmlText = "", cssText = ""] = (ctx.state.get("uno") ?? []) as string[];
  const prevStylesIndex = ctx.styles.findIndex((css) => css === cssText);
  if (prevStylesIndex > -1) ctx.styles.splice(prevStylesIndex, 1);
  // render page and components
  htmlText += render();
  // inform uno of compiled class aliases (must run post-render)
  uno.config.shortcuts.push(..._getCompiledClassAliases());
  uno.config.shortcuts = [...new Set(uno.config.shortcuts)];
  // generate new css
  cssText = (await uno.generate(htmlText)).css;
  if (useParcel) cssText = minify(cssText);
  // persist for next render in same ctx
  ctx.styles.unshift(cssText);
  ctx.state.set("uno", [htmlText, cssText]);
};

type PluginConfig = {
  extendDefaults?: boolean;
  useParcel?: boolean;
};
const setup = async (config: UnoConfig & PluginConfig = {}) => {
  config.extendDefaults ??= true;
  config.presets ??= [];
  config.preflights ??= [];
  uno = createGenerator({
    ...config,
    presets: config.extendDefaults
      ? [...defaultPresets, ...config.presets]
      : config.presets,
    preflights: config.extendDefaults
      ? [{ getCSS: () => cssReset }, ...config.preflights]
      : config.preflights,
  });
  config.useParcel ??= true;
  // @ts-ignore: provide absolute path to wasm module
  if (config.useParcel) await initParcel(new URL(wasmInitUrl));
  useParcel = config.useParcel;
};

export { render, setup };
