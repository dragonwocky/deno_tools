/*! (c) dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/) */

import { ensureFile, walk } from "https://deno.land/std@0.144.0/fs/mod.ts";
import { join } from "https://deno.land/std@0.144.0/path/mod.ts";

import { red } from "https://deno.land/std@0.144.0/fmt/colors.ts";
import {
  Command,
  CompletionsCommand,
} from "https://deno.land/x/cliffy@v0.24.2/command/mod.ts";

// programmatic

type Bundle = Map<string, Uint8Array>;

const ensureInputIsDirectory = async (input: string) => {
    let stat: Deno.FileInfo;
    try {
      stat = await Deno.stat(input);
    } catch {
      throw new Error(`\`${input}\` does not exist.`);
    }
    if (!stat.isDirectory) {
      throw new Error(`\`${input}\` is not a directory.`);
    }
  },
  ensureOutputDoesNotExist = async (output: string, overwrite: boolean) => {
    try {
      await Deno.stat(output);
    } catch {
      return;
    }
    if (overwrite) await Deno.remove(output, { recursive: true });
    else throw new Error(`\`${output}\` already exists.`);
  };

const createBundleFromDirectory = async (input: string) => {
    let pathPrefix = "";
    const bundle: Bundle = new Map();
    for await (const entry of walk(input)) {
      if (!pathPrefix && entry.isDirectory) pathPrefix = entry.path;
      else if (entry.isFile) {
        const path = entry.path.slice(pathPrefix.length);
        bundle.set(path, await Deno.readFile(entry.path));
      }
    }
    return bundle;
  },
  unpackBundleToDirectory = async (bundle: Bundle, output: string) => {
    for await (const [path, data] of bundle.entries()) {
      const outpath = join(output, path);
      await ensureFile(outpath);
      await Deno.writeFile(outpath, data);
    }
  };

const writeBundleToFile = async (
    bundle: Bundle,
    output: string,
    types: boolean,
  ) => {
    let script =
      `// this file was generated by bundle_resources.ts and should not be edited manually\nconst resources${
        types ? ":Map<string, Uint8Array>" : ""
      }=new Map([`;
    for (const [path, data] of bundle.entries()) {
      script += `["${path.replace(/"/g, String.raw`\"`)}",new Uint8Array([`;
      for (let i = 0; i < data.length; i++) script += `${data[i]},`;
      script += `])],`;
    }
    script += `]);export const readFile=(path${
      types ? ":string" : ""
    })=>resources.get(path),getIndexedFileList=()=>resources.keys()`;
    await Deno.writeFile(output, new TextEncoder().encode(script));
  },
  readBundleFromFile = async (input: string) => {
    const bundle: Bundle = new Map(),
      { readFile, getIndexedFileList } = await import(`./${input}`) as {
        readFile: (path: string) => Uint8Array;
        getIndexedFileList: () => ReturnType<Bundle["keys"]>;
      };
    for (const path of getIndexedFileList()) bundle.set(path, readFile(path));
    return bundle;
  };

// command-line interface

const name = "resource_bundler",
  version = "0.1.0",
  description =
    "Bundles static module assets/resources into a single-file archive,\ne.g. for use with `deno compile`.",
  helpDesc = "Display usage information.",
  versionDesc = "Get this program's version number.";

const pack = new Command()
  .description("Pack a folder of resources into a single-file bundle.")
  .option("-o, --overwrite", "Overwrite output bundle.")
  .option("-t, --types", "Output with TypeScript types.")
  .arguments("<input:file> [output=./resources.ts:file]")
  .action(async (options, input, output = "./resources.ts") => {
    await ensureInputIsDirectory(input);
    await ensureOutputDoesNotExist(output, options.overwrite ?? false);
    const bundle = await createBundleFromDirectory(input);
    writeBundleToFile(bundle, output, options.types ?? false);
  });

const unpack = new Command()
  .description("Unpack a previously generated bundle to a folder.")
  .option("-o, --overwrite", "Overwrite output folder.")
  .arguments("<input:file> <output:file>")
  .action(async (options, input, output) => {
    const bundle = await readBundleFromFile(input);
    await ensureOutputDoesNotExist(output, options.overwrite ?? false);
    await unpackBundleToDirectory(bundle, output);
  });

const cli = new Command(),
  help = new Command()
    .description(helpDesc)
    .action(() => cli.showHelp());
cli
  .name(name)
  .version(version)
  .description(description)
  .throwErrors()
  .action(() => cli.showHelp())
  .command("pack", pack)
  .command("unpack", unpack)
  .command("help", help)
  .command("completions", new CompletionsCommand())
  .helpOption("-h, --help", helpDesc, { global: true })
  .versionOption("-v, --version", versionDesc, { global: true });

try {
  await cli.parse(Deno.args);
} catch (err) {
  console.error(red("Error:"), err.message);
  Deno.exit(1);
}

export {
  createBundleFromDirectory,
  readBundleFromFile,
  unpackBundleToDirectory,
  writeBundleToFile,
};
