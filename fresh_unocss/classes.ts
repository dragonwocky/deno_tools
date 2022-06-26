// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import fnv1a from "https://esm.sh/fnv1a@1.1.1";

// separated from unocss_render.ts so classes can be compiled from
// islands without sending server-side code to the client

const _shortcuts: [string, string][] = [],
  compiledShortcuts = () => _shortcuts;

const variantGroupPattern = /([^\s\('"`;>=\\]+)\((([^(]|(?<=\\)\()*?[^\\])\)/g,
  variantGroupReplacer = (_: string, variant: string, group: string) =>
    group.split(/(?<!\[[^\]]*?)\s+(?![^\[]*?\])/)
      .map((utility: string) => variant + utility).join(" "),
  parseTaggedTemplate = (
    strs: TemplateStringsArray,
    ...tmpls: unknown[]
  ): string => strs.map((str, i) => str + (tmpls[i] ?? "")).join(""),
  hashFromString = (str: string) =>
    fnv1a(str, 32).toString(16).padStart(2, "0").slice(0, 8);

type AcceptsStringOrTemplateString = (
  cls: string | TemplateStringsArray,
  ...tmpls: unknown[]
) => string;
const interpret: AcceptsStringOrTemplateString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> dark:font-bold dark:mx-1 dark:my-2 dark:border-red-200 dark:border-1
    if (typeof cls !== "string") cls = parseTaggedTemplate(cls, tmpls);
    cls = cls.replaceAll(/\s+/g, " ").trim();
    while (variantGroupPattern.test(cls)) {
      cls = cls.replaceAll(variantGroupPattern, variantGroupReplacer);
    }
    return cls;
  },
  compile: AcceptsStringOrTemplateString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> uno-68ff7987
    cls = interpret(cls, ...tmpls);
    const hashed = `uno-${hashFromString(cls)}`;
    if (_shortcuts.find(([h]) => h === hashed)) _shortcuts.push([hashed, cls]);
    return hashed;
  };

export { compile, compiledShortcuts, interpret };
