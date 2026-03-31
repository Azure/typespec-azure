// @ts-check
/* eslint-disable no-console */
import { execSync } from "child_process";
import dotenv from "dotenv";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "fs";
import path, { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { repoRoot, run } from "../../eng/scripts/helpers.js";

const e2eTestDir = join(repoRoot, "packages/e2e-tests");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

loadDotenv();

function main() {
  printInfo();
  const packages = getPackagesPath();

  console.log("Check cli is working");
  runTypeSpec(["--help"], { cwd: e2eTestDir });
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

function getPackagesPath() {
  function resolveLocalPackage(path) {
    return `file://${repoRoot}/${path}`;
  }

  return {
    "@typespec/compiler": resolveLocalPackage("core/packages/compiler"),
    "@typespec/openapi": resolveLocalPackage("core/packages/openapi"),
    "@typespec/http": resolveLocalPackage("core/packages/http"),
    "@typespec/rest": resolveLocalPackage("core/packages/rest"),
    "@typespec/xml": resolveLocalPackage("core/packages/xml"),
    "@typespec/versioning": resolveLocalPackage("core/packages/versioning"),
    "@azure-tools/typespec-azure-core": resolveLocalPackage("packages/typespec-azure-core"),
    "@azure-tools/typespec-azure-resource-manager": resolveLocalPackage(
      "packages/typespec-azure-resource-manager",
    ),
    "@azure-tools/typespec-client-generator-core": resolveLocalPackage(
      "packages/typespec-client-generator-core",
    ),
    "@azure-tools/azure-http-specs": resolveLocalPackage("packages/azure-http-specs"),
    "@typespec/http-specs": resolveLocalPackage("core/packages/http-specs"),
    "@typespec/spector": resolveLocalPackage("core/packages/spector"),
  };
}

function runTypeSpec(args, options) {
  const cmd = `node ${repoRoot}/core/packages/compiler/entrypoints/cli.js ${args.join(" ")}`;
  try {
    const result = execSync(cmd, options).toString();
    console.log(result);
  } catch (err) {
    console.error(err.output.toString());
    console.error(`Compile failed in directory: ${options.cwd}`);
    process.exit(1);
  }
}

function readPackageJson(dir) {
  const content = readFileSync(join(dir, "package.json")).toString();
  return JSON.parse(content);
}

function updatePackageJson(wsDir, value) {
  writeFileSync(join(wsDir, "package.json"), JSON.stringify(value, null, 2));
  console.log("Generated package.json for basic-current");

  console.log("Installing dependencies");
  run(npmCmd, ["install", "--force", "--no-package-lock"], { cwd: wsDir });
  console.log("Installed  dependencies");
}

function testAzureHttpSpecs(packages) {
  const testDir = join(e2eTestDir, "azure-http-specs");
  const wsDir = join(testDir, "temp");

  rmSync(wsDir, { recursive: true, force: true });
  mkdirSync(wsDir);

  const outputDir = join(wsDir, "tsp-output");
  console.log("Clearing basic-current");
  rmSync(outputDir, { recursive: true, force: true });
  console.log("Cleared basic-current");

  console.log("Generating package.json for basic-current");
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
      "@azure-tools/typespec-azure-core": packages["@azure-tools/typespec-azure-core"],
      "@azure-tools/typespec-azure-resource-manager":
        packages["@azure-tools/typespec-azure-resource-manager"],
      "@azure-tools/typespec-client-generator-core":
        packages["@azure-tools/typespec-client-generator-core"],
      "@azure-tools/azure-http-specs": packages["@azure-tools/azure-http-specs"],
      "@typespec/http-specs": packages["@typespec/http-specs"],
      "@typespec/spector": packages["@typespec/spector"],
    },
  };

  updatePackageJson(wsDir, packageJson);
  // Have to do 2 steps because of bug in npm when installing mixed file:// and regular versions https://github.com/npm/cli/issues/4367
  const updatedPackageJson = {
    ...packageJson,
    dependencies: {
      ...packageJson.dependencies,
    },
  };
  updatePackageJson(wsDir, updatedPackageJson);

  const coreSpecsFolder = join(wsDir, "node_modules", "@typespec", "http-specs", "specs");
  const azureSpecsFolder = join(wsDir, "node_modules", "@azure-tools", "azure-http-specs", "specs");
  const wsSpecsFolder = join(wsDir, "specs");
  cpSync(coreSpecsFolder, wsSpecsFolder, { recursive: true });
  cpSync(azureSpecsFolder, wsSpecsFolder, { recursive: true });
  const specs = getMainTspFiles(wsSpecsFolder);
  console.log("Found specs: ", specs);

  for (const file of specs) {
    console.log(`Running tsp compile . in "${dirname(file)}"`);
    runTypeSpec(["compile", ".", "--warn-as-error"], {
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
