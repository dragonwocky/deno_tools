// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import { RenderFunction } from "https://deno.land/x/fresh@1.0.0/server.ts";
import { getCompiledClassAliases } from "./runtime.ts";

import {
  createGenerator,
  UnoGenerator,
  UserConfig,
} from "https://esm.sh/@unocss/core@0.41.0";
import presetUno from "https://esm.sh/@unocss/preset-uno@0.41.0";
import presetIcons from "https://esm.sh/@unocss/preset-icons@0.41.0?no-require";
import presetWebFonts from "https://esm.sh/@unocss/preset-web-fonts@0.41.0";
import presetTypography from "https://esm.sh/@unocss/preset-typography@0.41.0";

const cssResetUrl = "https://esm.sh/modern-normalize@1.1.0?css",
  cssReset = await fetch(cssResetUrl).then((res) => res.text());

// generates on-demand atomic css from strings of html
// on the server-side. imports shortcuts from client.ts
// to support compiled classes

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
    presetWebFonts({
      fonts: {
        sans: "Inter",
        mono: "Fira Code",
      },
    }),
  ],
  preflights: [{ getCSS: () => cssReset }],
}): UnoGenerator => uno = createGenerator(config);

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
  styles = (await uno.generate(html, { minify: true })).css;
  ctx.styles.unshift(styles);

  // persist for next render in same ctx
  ctx.state.set("uno", [html, styles]);
};

export { render, setup };
