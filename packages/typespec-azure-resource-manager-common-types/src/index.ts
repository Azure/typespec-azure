#!/usr/bin/env node

import { parseArgs } from "util";
import { generateCommonTypes } from "./gen.js";

const args = parseArgs({
  args: process.argv.slice(2),
  options: {
    path: { type: "string" },
  },
});

const targetPath = args.values["path"];

if (!targetPath) {
  console.error("--path is required");
  process.exit(1);
}

await generateCommonTypes(targetPath);
