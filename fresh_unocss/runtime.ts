// (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)

import fnv1a from "https://esm.sh/fnv1a@1.1.1";

// parses a tagged template into an ordinary string
// e.g. so that f('string') acts identically to f`string`
type TemplateableString = (
  cls: string | TemplateStringsArray,
  ...tmpls: unknown[]
) => string;
const parseTaggedTemplate = (
  strs: TemplateStringsArray,
  ...tmpls: unknown[]
): string => strs.map((str, i) => str + (tmpls[i] ?? "")).join("");

// fnv1a: a non-cryptographic hash function, generating hashes
// fast with a low-collision rate. used for unique alias
// generation for compiled classes
const hashFromString = (str: string) =>
    fnv1a(str, 32).toString(16).padStart(2, "0").slice(0, 8),
  compiledClassAliases: [string, string][] = [],
  addCompiledClassAlias = (alias: string, cls: string) => {
    const alreadyExists = compiledClassAliases.some(([a]) => a === alias);
    if (!alreadyExists) compiledClassAliases.push([alias, cls]);
    return alias;
  },
  _getCompiledClassAliases = () => compiledClassAliases;

// replacers used to expand variant groups safely
const escapeArbitraryValues = (cls: string): string => {
    // css funcs used in arbitrary values should not be expanded
    // e.g. h-[calc(100%-16px)]
    const pattern = /\[[^\]]*?(?<!\\)(\(|\))(?=[^\]]*?])/g;
    cls = cls.replaceAll(pattern, (match) => {
      return match.replaceAll(/(?<!\\)(\(|\))/g, `\\$&`);
    });
    return pattern.test(cls) ? escapeArbitraryValues(cls) : cls;
  },
  expandVariantGroups = (cls: string): string => {
    const pattern = /([^\s\('"`;>=\\]+)\((([^(]|(?<=\\)\()*?[^\\])\)/g,
      splitter = /(?<!\[[^\]]*?)\s+(?![^\[]*?\])/;
    cls = cls.replaceAll(pattern, (_, variant, group) => {
      return group.split(splitter)
        .map((utility: string) => variant + utility).join(" ");
    });
    return pattern.test(cls) ? expandVariantGroups(cls) : cls;
  },
  unescapeRoundedBrackets = (cls: string): string => {
    const pattern = /\\(\(|\))/g;
    cls = cls.replaceAll(pattern, (_, bracket) => bracket);
    return pattern.test(cls) ? unescapeRoundedBrackets(cls) : cls;
  };

// classname transformers to extend the useability of unocss
const interpret: TemplateableString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> dark:font-bold dark:mx-1 dark:my-2 dark:border-red-200 dark:border-1
    if (typeof cls !== "string") cls = parseTaggedTemplate(cls, tmpls);
    cls = cls.replaceAll(/\s+/g, " ").trim();
    cls = escapeArbitraryValues(cls);
    cls = expandVariantGroups(cls);
    cls = unescapeRoundedBrackets(cls);
    return cls;
  },
  compile: TemplateableString = (cls, ...tmpls): string => {
    // e.g. dark:(font-bold m(x-1 y-2) border-(red-200 1))
    // --> uno-68ff7987
    cls = interpret(cls, ...tmpls);
    const hashed = `uno-${hashFromString(cls)}`;
    return addCompiledClassAlias(hashed, cls);
  };

export { _getCompiledClassAliases, compile, interpret };
