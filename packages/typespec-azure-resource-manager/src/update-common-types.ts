#!/usr/bin/env node

import { cp, mkdir, readdir, rm } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sourceDir = resolve(__dirname, "../../lib/common-types/openapi");

async function replaceFolders(destinationRoot: string) {
  try {
    const folders = await readdir(sourceDir, { withFileTypes: true });
    const sourceFolders = folders.filter((folder) => folder.isDirectory());

    for (const folder of sourceFolders) {
      const sourcePath = resolve(sourceDir, folder.name);
      const destinationPath = resolve(destinationRoot, folder.name);

      console.log(`Replacing folder: ${destinationPath}`);
      await rm(destinationPath, { recursive: true, force: true });
      await mkdir(destinationPath, { recursive: true });
      await cp(sourcePath, destinationPath, { recursive: true });
    }
  } catch (error) {
    process.exit(1);
  }
}

const args = process.argv.slice(2);

if (args.includes("--update")) {
  const pathArgIndex = args.indexOf("--path");
  if (pathArgIndex !== -1 && args[pathArgIndex + 1]) {
    const destinationRoot = resolve(args[pathArgIndex + 1]);
    replaceFolders(destinationRoot);
  } else {
    console.error(
      "Missing --path argument. Usage: npx update-common-types --update --path <destination>",
    );
    process.exit(1);
  }
}
