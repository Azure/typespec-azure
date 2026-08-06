/* eslint-disable no-console */
import { execa } from "execa";
import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const generatorPom = join(packageRoot, "generator", "pom.xml");

try {
  await access(generatorPom);
} catch {
  throw new Error(
    `Copied generator not found at: ${generatorPom}\nRun ${join(packageRoot, "eng", "scripts", "copy-sources.ts")} first (build:emitter).`,
  );
}

console.log("Build JAR");
await execa(
  "mvn",
  [
    "clean",
    "install",
    "-DskipTests",
    "--define",
    "spotless.apply.skip=true",
    "--define",
    "spotless.check.skip=true",
    "--no-transfer-progress",
    "-T",
    "1C",
    "-f",
    generatorPom,
  ],
  { stdio: "inherit" },
);
