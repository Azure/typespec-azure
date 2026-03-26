// @ts-check
/* eslint-disable no-console */
import dotenv from "dotenv";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import path, { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { coreRepoRoot, repoRoot, run } from "../../eng/scripts/helpers.js";

const e2eTestDir = join(repoRoot, "packages/e2e-tests");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

loadDotenv();

function main() {
  printInfo();
  const packages = packPackages();

  console.log("Check cli is working");
  runTypeSpec(packages["@typespec/compiler"], ["--help"], { cwd: e2eTestDir });
  console.log("Cli is working");

  testAzureHttpSpecs(packages);
}
main();

function printInfo() {
  console.log("-".repeat(100));
  console.log("Npm Version: ");
  run("npm", ["-v"]);
  console.log("-".repeat(100));
}

function packPackages() {
  console.log("Packing core packages...");
  run("pnpm", ["-w", "pack:all"], { cwd: coreRepoRoot });

  console.log("Packing azure packages...");
  run("pnpm", ["-w", "pack:all"], { cwd: repoRoot });

  const coreOutputFolder = join(coreRepoRoot, "temp/artifacts");
  const azureOutputFolder = join(repoRoot, "temp/artifacts");

  const coreFiles = readdirSync(coreOutputFolder);
  const azureFiles = readdirSync(azureOutputFolder);

  console.log("Core packages:", coreFiles);
  console.log("Azure packages:", azureFiles);

  function resolvePackage(start) {
    let pkgName = azureFiles.find((x) => x.startsWith(start));
    if (pkgName) return join(azureOutputFolder, pkgName);

    pkgName = coreFiles.find((x) => x.startsWith(start));
    if (pkgName) return join(coreOutputFolder, pkgName);

    throw new Error(`Cannot resolve package starting with "${start}"`);
  }

  return {
    "@typespec/compiler": resolvePackage("typespec-compiler-"),
    "@typespec/openapi": resolvePackage("typespec-openapi-"),
    "@typespec/openapi3": resolvePackage("typespec-openapi3-"),
    "@typespec/http": resolvePackage("typespec-http-"),
    "@typespec/rest": resolvePackage("typespec-rest-"),
    "@typespec/xml": resolvePackage("typespec-xml-"),
    "@typespec/versioning": resolvePackage("typespec-versioning-"),
    "@typespec/http-specs": resolvePackage("typespec-http-specs-"),
    "@typespec/spector": resolvePackage("typespec-spector-"),
    "@typespec/spec-api": resolvePackage("typespec-spec-api-"),
    "@azure-tools/typespec-azure-core": resolvePackage("azure-tools-typespec-azure-core-"),
    "@azure-tools/typespec-azure-resource-manager": resolvePackage(
      "azure-tools-typespec-azure-resource-manager-",
    ),
    "@azure-tools/typespec-client-generator-core": resolvePackage(
      "azure-tools-typespec-client-generator-core-",
    ),
    "@azure-tools/azure-http-specs": resolvePackage("azure-tools-azure-http-specs-"),
  };
}

function runTypeSpec(compilerTgz, args, options) {
  run(npxCmd, ["-y", "-p", compilerTgz, "tsp", ...args], options);
}

function readPackageJson(dir) {
  const content = readFileSync(join(dir, "package.json")).toString();
  return JSON.parse(content);
}

function testAzureHttpSpecs(packages) {
  const testDir = join(e2eTestDir, "azure-http-specs");
  const wsDir = join(testDir, "temp");

  rmSync(wsDir, { recursive: true, force: true });
  mkdirSync(wsDir);

  console.log("Generating package.json for azure-http-specs");
  const originalPackageJson = readPackageJson(testDir);

  const packageJson = {
    ...originalPackageJson,
    dependencies: {
      "@typespec/compiler": packages["@typespec/compiler"],
      "@typespec/http": packages["@typespec/http"],
      "@typespec/rest": packages["@typespec/rest"],
      "@typespec/openapi": packages["@typespec/openapi"],
      "@typespec/openapi3": packages["@typespec/openapi3"],
      "@typespec/xml": packages["@typespec/xml"],
      "@typespec/versioning": packages["@typespec/versioning"],
      "@typespec/http-specs": packages["@typespec/http-specs"],
      "@typespec/spector": packages["@typespec/spector"],
      "@typespec/spec-api": packages["@typespec/spec-api"],
      "@azure-tools/typespec-azure-core": packages["@azure-tools/typespec-azure-core"],
      "@azure-tools/typespec-azure-resource-manager":
        packages["@azure-tools/typespec-azure-resource-manager"],
      "@azure-tools/typespec-client-generator-core":
        packages["@azure-tools/typespec-client-generator-core"],
      "@azure-tools/azure-http-specs": packages["@azure-tools/azure-http-specs"],
    },
  };

  writeFileSync(join(wsDir, "package.json"), JSON.stringify(packageJson, null, 2));
  console.log("Generated package.json for azure-http-specs");

  console.log("Installing dependencies");
  run(npmCmd, ["install", "--force", "--no-package-lock"], { cwd: wsDir });
  console.log("Installed dependencies");

  const coreSpecsFolder = join(wsDir, "node_modules", "@typespec", "http-specs", "specs");
  const azureSpecsFolder = join(wsDir, "node_modules", "@azure-tools", "azure-http-specs", "specs");
  const wsSpecsFolder = join(wsDir, "specs");
  cpSync(coreSpecsFolder, wsSpecsFolder, { recursive: true });
  cpSync(azureSpecsFolder, wsSpecsFolder, { recursive: true });
  const specs = getMainTspFiles(wsSpecsFolder);
  console.log("Found specs: ", specs);

  for (const file of specs) {
    console.log(`Running tsp compile . in "${dirname(file)}"`);
    runTypeSpec(packages["@typespec/compiler"], ["compile", ".", "--warn-as-error"], {
      cwd: dirname(file),
    });
    console.log("  Completed tsp compile .");
  }
}

function getMainTspFiles(dir) {
  const subdirs = readdirSync(dir);
  const files = subdirs
    .map((subdir) => {
      const res = resolve(dir, subdir);
      return statSync(res).isDirectory()
        ? getMainTspFiles(res)
        : subdir === "main.tsp"
          ? res
          : undefined;
    })
    .filter((x) => x !== undefined);
  return files.reduce((a, f) => a.concat(f), []);
}

function loadDotenv() {
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  const dotenvPath = path.resolve(dirname, "../../.env");
  dotenv.config({
    path: dotenvPath,
  });
}
