import { readdirSync, rmSync } from "fs";
import { join } from "path";
import { coreRepoRoot, repoRoot, run } from "../../eng/scripts/helpers.js";

const tcgcTestDir = join(repoRoot, "packages", "typespec-client-generator-core");
const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

function main() {
  printInfo();
  cleanTcgcDirectory();
  const packages = packPackages();
  testBasicLatest(packages);
}
main();

function printInfo() {
  console.log("-".repeat(100));
  console.log("Npm Version: ");
  run("npm", ["-v"]);
  console.log("-".repeat(100));
}

function cleanTcgcDirectory() {
  run("git", ["clean", "-xfd"], { cwd: tcgcTestDir });
}

function packPackages() {
  run("pnpm", ["-w", "pack:all"], { cwd: repoRoot });
  run("pnpm", ["-w", "pack:all"], { cwd: coreRepoRoot });
  const azureOutputFolder = join(repoRoot, "/temp/artifacts");
  const coreOutputFolder = join(repoRoot, "/core/temp/artifacts");
  const files = readdirSync(azureOutputFolder).concat(readdirSync(coreOutputFolder));

  console.log("Built packages:", files);

  function resolvePackage(start) {
    const pkgName = files.find((x) => x.startsWith(start));
    if (pkgName === undefined) {
      throw new Error(`Cannot resolve package starting with "${start}"`);
    }
    const outputFolder = start.startsWith("azure-tools") ? azureOutputFolder : coreOutputFolder;
    return join(outputFolder, pkgName);
  }

  return {
    "@typespec/compiler": resolvePackage("typespec-compiler-"),
    "@typespec/openapi": resolvePackage("typespec-openapi-"),
    "@typespec/openapi3": resolvePackage("typespec-openapi3-"),
    "@typespec/http": resolvePackage("typespec-http-"),
    "@typespec/rest": resolvePackage("typespec-rest-"),
    "@typespec/versioning": resolvePackage("typespec-versioning-"),
    "@azure-tools/typespec-azure-core": resolvePackage("azure-tools-typespec-azure-core-"),
    "@azure-tools/typespec-autorest": resolvePackage("azure-tools-typespec-autorest-"),
    "@azure-tools/typespec-azure-resource-manager": resolvePackage(
      "azure-tools-typespec-azure-resource-manager-"
    ),
  };
}

function runTypeSpec(compilerTgz, args, options) {
  run(npxCmd, ["-y", "-p", compilerTgz, "tsp", ...args], { ...options });
}

function testBasicLatest(packages) {
  const basicLatestDir = join(tcgcTestDir, "basic-latest");
  const outputDir = join(basicLatestDir, "tsp-output");
  console.log("Clearing basic-latest output");
  rmSync(outputDir, { recursive: true, force: true });
  console.log("Cleared basic-latest output");

  console.log("Installing basic-latest dependencies");
  runTypeSpec(packages["@typespec/compiler"], ["install"], { cwd: basicLatestDir });
  console.log("Installed basic-latest dependencies");

  console.log("Running tsp compile .");
  runTypeSpec(packages["@typespec/compiler"], ["compile", ".", "--emit", "@typespec/openapi3"], {
    cwd: basicLatestDir,
  });
  console.log("Completed tsp compile .");

  expectOpenApiOutput(outputDir);
}

function expectOpenApiOutput(outputDir) {
  const expectedOutputFile = join(outputDir, "@typespec/openapi3/openapi.yaml");
  if (existsSync(expectedOutputFile)) {
    console.log("Output created successfully.");
  } else {
    throw new Error(`Test failed to produce openapi output at "${expectedOutputFile}"`);
  }
}
