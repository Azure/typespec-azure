#!/usr/bin/env node
import { runOrExit } from "@typespec/internal-build-utils";

if (process.env.TYPESPEC_SKIP_WEBSITE_BUILD?.toLowerCase() === "true") {
  console.log("Skipping website build: TYPESPEC_SKIP_WEBSITE_BUILD=true");
  process.exit(0);
}

await runOrExit("npm", ["run", "build:web"]);
