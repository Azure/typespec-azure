import { join } from "path";
import { readdirSync } from "fs";
import { repoRoot, run } from "../../eng/scripts/helpers.js";

const tcgcTestDir = join(repoRoot, "packages", "typespec-client-generator-core");

function main() {
  printInfo();
  // await cleanTcgcDirectory();
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
  const outputFolder = join(repoRoot, "/temp/artifacts");
  const files = readdirSync(outputFolder);
  console.log("Built packages:", files);

  function resolvePackage(start) {
    const pkgName = files.find((x) => x.startsWith(start));
    if (pkgName === undefined) {
      throw new Error(`Cannot resolve package starting with "${start}"`);
    }
    return join(outputFolder, pkgName);
  }

  return {
    "@typespec/compiler": resolvePackage("typespec-compiler-"),
    "@typespec/openapi": resolvePackage("typespec-openapi-"),
    "@typespec/openapi3": resolvePackage("typespec-openapi3-"),
    "@typespec/http": resolvePackage("typespec-http-"),
    "@typespec/rest": resolvePackage("typespec-rest-"),
    "@typespec/versioning": resolvePackage("typespec-versioning-"),
    "@azure-tools/typespec-azure-core": resolvePackage("typespec-azure-core-"),
    "@azure-tools/typespec-autorest": resolvePackage("typespec-autorest-"),
    "@azure-tools/typespec-azure-resource-manager": resolvePackage("typespec-azure-resource-manager-"),
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
  runTypeSpec(
    packages["@typespec/compiler"],
    ["compile", ".", "--emit", "@typespec/openapi3"],
    {
      cwd: basicLatestDir,
    }
  );
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
