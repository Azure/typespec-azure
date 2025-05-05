#!/usr/bin/env node

import { resolve } from "path";
import { generateCommonTypes } from "./gen.js";

const args = process.argv.slice(2);

if (args.includes("--update")) {
  const pathArgIndex = args.indexOf("--path");
  if (pathArgIndex !== -1 && args[pathArgIndex + 1]) {
    const destinationRoot = resolve(args[pathArgIndex + 1]);
    generateCommonTypes(destinationRoot);
  } else {
    process.exit(1);
  }
}
