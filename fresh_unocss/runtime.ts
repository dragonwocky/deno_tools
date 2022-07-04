// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import fnv1a from "https://esm.sh/fnv1a@1.1.1";

// separated from server.ts so classes can be compiled within
// islands without sending server-side code to the client

const compiledClassAliases: [string, string][] = [],
  getCompiledClassAliases = () => compiledClassAliases;

type AcceptsStringOrTemplateString = (
  cls: string | TemplateStringsArray,
  ...tmpls: unknown[]
) => string;
const parseTaggedTemplate = (
    strs: TemplateStringsArray,
    ...tmpls: unknown[]
  ): string => strs.map((str, i) => str + (tmpls[i] ?? "")).join(""),
  hashFromString = (str: string) =>
    fnv1a(str, 32).toString(16).padStart(2, "0").slice(0, 8);

const roundBracketsWithinArbitraryValuesPattern =
    /\[[^\]]*?(?<!\\)(\(|\))(?=[^\]]*?])/g,
  variantGroupPattern = /([^\s\('"`;>=\\]+)\((([^(]|(?<=\\)\()*?[^\\])\)/g,
  escapedRoundBracketsPattern = /\\(\(|\))/g,
  roundBracketsWithinArbitraryValuesReplacer = (match: string) =>
    match.replaceAll(/(?<!\\)(\(|\))/g, `\\$&`),
  variantGroupReplacer = (_: string, variant: string, group: string) =>
    group.split(/(?<!\[[^\]]*?)\s+(?![^\[]*?\])/)
      .map((utility: string) => variant + utility).join(" "),
  escapedRoundBracketsReplacer = (_: string, bracket: string) => bracket;

type Replacer = Parameters<typeof String.prototype.replaceAll>[1];
const replaceAll = (
  str: string,
  pattern: RegExp,
  replacer: string | Replacer,
) => {
  while (pattern.test(str)) str = str.replaceAll(pattern, replacer as Replacer);
  return str;
};

const interpret: AcceptsStringOrTemplateString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> dark:font-bold dark:mx-1 dark:my-2 dark:border-red-200 dark:border-1
    if (typeof cls !== "string") cls = parseTaggedTemplate(cls, tmpls);
    cls = replaceAll(cls, /\s\s+/g, " ").trim();
    // css funcs used in arbitrary values should not be expanded
    // e.g. h-[calc(100%-16px)]
    cls = replaceAll(
      cls,
      roundBracketsWithinArbitraryValuesPattern,
      roundBracketsWithinArbitraryValuesReplacer,
    );
    cls = replaceAll(
      cls,
      variantGroupPattern,
      variantGroupReplacer,
    );
    cls = replaceAll(
      cls,
      escapedRoundBracketsPattern,
      escapedRoundBracketsReplacer,
    );
    return cls;
  },
  compile: AcceptsStringOrTemplateString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> uno-68ff7987
    cls = interpret(cls, ...tmpls);
    const hashed = `uno-${hashFromString(cls)}`;
    if (!compiledClassAliases.find(([h]) => h === hashed)) {
      compiledClassAliases.push([hashed, cls]);
    }
    return hashed;
  };

export { compile, getCompiledClassAliases, interpret };
