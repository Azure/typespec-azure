import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import process from "process";

type PackageOption = "azure-core" | "azure-resource-manager";
type Severity = "warning" | "error";

interface Options {
  ruleName: string;
  packageName: PackageOption;
  severity: Severity;
  description: string;
  dryRun: boolean;
}

interface PackageConfig {
  packageDir: string;
  packageShort: PackageOption;
  packageNpmName: string;
  testHostImport: string;
  testHostFactory: string;
}

const usage =
  "Usage: pnpm create:linter-rule <rule-name> [--package <azure-core|azure-resource-manager>] [--severity <warning|error>] [--description <text>] [--dry-run]";

const packageConfigs: Record<PackageOption, PackageConfig> = {
  "azure-core": {
    packageDir: "typespec-azure-core",
    packageShort: "azure-core",
    packageNpmName: "@azure-tools/typespec-azure-core",
    testHostImport: 'import { TesterWithService } from "#test/test-host.js";',
    testHostFactory: "TesterWithService.createInstance()",
  },
  "azure-resource-manager": {
    packageDir: "typespec-azure-resource-manager",
    packageShort: "azure-resource-manager",
    packageNpmName: "@azure-tools/typespec-azure-resource-manager",
    testHostImport: 'import { Tester } from "#test/tester.js";',
    testHostFactory: "Tester.createInstance()",
  },
};

const scriptDir = import.meta.dirname;
const repoRoot = resolve(scriptDir, "..", "..");

function fail(message: string): never {
  console.error(`Error: ${message}`);
  console.error(usage);
  process.exit(1);
}

function isKebabCase(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function toDoubleQuotedString(value: string): string {
  return JSON.stringify(value);
}

function normalizeNewlines(content: string): string {
  return content.replace(/\r\n/g, "\n");
}

function readText(path: string): string {
  return normalizeNewlines(readFileSync(path, "utf8"));
}

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function parseArgs(argv: string[]): Options {
  const positionals: string[] = [];
  let packageName: PackageOption = "azure-core";
  let severity: Severity = "warning";
  let description = "TODO: Add rule description.";
  let dryRun = false;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    switch (arg) {
      case "--package": {
        const value = argv[++index];
        if (value !== "azure-core" && value !== "azure-resource-manager") {
          fail("--package must be either azure-core or azure-resource-manager.");
        }
        packageName = value;
        break;
      }
      case "--severity": {
        const value = argv[++index];
        if (value !== "warning" && value !== "error") {
          fail("--severity must be either warning or error.");
        }
        severity = value;
        break;
      }
      case "--description": {
        const value = argv[++index];
        if (!value) {
          fail("--description requires a value.");
        }
        description = value;
        break;
      }
      case "--dry-run":
        dryRun = true;
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }

  if (positionals.length !== 1) {
    fail("You must provide exactly one rule name.");
  }

  const [ruleName] = positionals;
  if (!isKebabCase(ruleName)) {
    fail("rule-name must be kebab-case using lowercase letters, numbers, and hyphens only.");
  }

  return { ruleName, packageName, severity, description, dryRun };
}

function updateLinterFile(linterPath: string, importLine: string, ruleIdentifier: string): string {
  const current = readText(linterPath);

  if (current.includes(importLine) || current.includes(`  ${ruleIdentifier},`)) {
    fail(`Linter is already wired for rule '${ruleIdentifier}'.`);
  }

  const importBlockMatch = current.match(/^(import .*;\n)+/m);
  if (!importBlockMatch || importBlockMatch.index !== 0) {
    fail(`Could not find import block in ${linterPath}.`);
  }

  const importBlock = importBlockMatch[0];
  const importLines = importBlock.trimEnd().split("\n");
  importLines.push(importLine);
  importLines.sort((left, right) => left.localeCompare(right));
  const updatedImports = `${importLines.join("\n")}\n\n`;
  const afterImports = current.slice(importBlock.length);
  const withUpdatedImports = `${updatedImports}${afterImports}`;

  const rulesArrayMatch = withUpdatedImports.match(/const rules = \[(?<body>[\s\S]*?)\n\];/);
  if (!rulesArrayMatch || rulesArrayMatch.index === undefined || rulesArrayMatch.groups === undefined) {
    fail(`Could not find rules array in ${linterPath}.`);
  }

  const start = rulesArrayMatch.index;
  const end = start + rulesArrayMatch[0].length;
  const body = rulesArrayMatch.groups.body;
  const updatedBody = body.endsWith("\n")
    ? `${body}  ${ruleIdentifier},`
    : `${body}\n  ${ruleIdentifier},`;
  const updatedRules = `const rules = [${updatedBody}\n];`;

  return `${withUpdatedImports.slice(0, start)}${updatedRules}${withUpdatedImports.slice(end)}`;
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const config = packageConfigs[options.packageName];
  const camelCaseName = toCamelCase(options.ruleName);
  const ruleIdentifier = `${camelCaseName}Rule`;

  const packageRoot = resolve(repoRoot, "packages", config.packageDir);
  const rulePath = resolve(packageRoot, "src", "rules", `${options.ruleName}.ts`);
  const testPath = resolve(packageRoot, "test", "rules", `${options.ruleName}.test.ts`);
  const docsPath = resolve(
    repoRoot,
    "website",
    "src",
    "content",
    "docs",
    "docs",
    "libraries",
    config.packageShort,
    "rules",
    `${options.ruleName}.md`,
  );
  const linterPath = resolve(packageRoot, "src", "linter.ts");

  const fileTargets = [rulePath, testPath, docsPath];
  const existingFiles = fileTargets.filter((path) => existsSync(path));
  if (existingFiles.length > 0) {
    fail(`The following file(s) already exist:\n${existingFiles.map((path) => `- ${path}`).join("\n")}`);
  }

  if (!existsSync(linterPath)) {
    fail(`Could not find linter file at ${linterPath}.`);
  }

  const ruleFile = [
    'import { createRule } from "@typespec/compiler";',
    "",
    `export const ${ruleIdentifier} = createRule({`,
    `  name: ${toDoubleQuotedString(options.ruleName)},`,
    `  description: ${toDoubleQuotedString(options.description)},`,
    `  severity: ${toDoubleQuotedString(options.severity)},`,
    `  url: ${toDoubleQuotedString(`https://azure.github.io/typespec-azure/docs/libraries/${config.packageShort}/rules/${options.ruleName}`)},`,
    "  messages: {",
    '    default: "TODO: Add default diagnostic message.",',
    "  },",
    "  create(context) {",
    "    return {",
    "      // TODO: Implement visitor hooks (model, modelProperty, operation, enum, namespace, interface, union)",
    "    };",
    "  },",
    "});",
    "",
  ].join("\n");

  const testFile = [
    config.testHostImport,
    'import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";',
    'import { beforeEach, describe, it } from "vitest";',
    `import { ${ruleIdentifier} } from "../../src/rules/${options.ruleName}.js";`,
    "",
    "let tester: LinterRuleTester;",
    "",
    "beforeEach(async () => {",
    `  const runner = await ${config.testHostFactory};`,
    "  tester = createLinterRuleTester(",
    "    runner,",
    `    ${ruleIdentifier},`,
    `    ${toDoubleQuotedString(config.packageNpmName)},`,
    "  );",
    "});",
    "",
    `describe(${toDoubleQuotedString(options.ruleName)}, () => {`,
    '  it("is valid when TODO: describe valid case", async () => {',
    "    await tester",
    '      .expect(',
    '        `',
    '        model Example {}',
    '        `,',
    "      )",
    "      .toBeValid();",
    "  });",
    "",
    '  it("emits diagnostic when TODO: describe invalid case", async () => {',
    "    await tester",
    '      .expect(',
    '        `',
    '        model Example {}',
    '        `,',
    "      )",
    "      .toEmitDiagnostics([",
    "        {",
    `          code: ${toDoubleQuotedString(`${config.packageNpmName}/${options.ruleName}`)},`,
    `          severity: ${toDoubleQuotedString(options.severity)},`,
    '          message: "TODO: Expected diagnostic message",',
    "        },",
    "      ]);",
    "  });",
    "});",
    "",
  ].join("\n");

  const docsFile = [
    "---",
    `title: ${toDoubleQuotedString(options.ruleName)}`,
    "---",
    "",
    "```text title=\"Full name\"",
    `@azure-tools/typespec-${config.packageShort}/${options.ruleName}`,
    "```",
    "",
    "TODO: Add a description of what this rule checks and why it matters.",
    "",
    "#### ❌ Incorrect",
    "",
    "```tsp",
    "// TODO: Add example of code that violates this rule",
    "```",
    "",
    "#### ✅ Correct",
    "",
    "```tsp",
    "// TODO: Add example of code that satisfies this rule",
    "```",
    "",
  ].join("\n");

  const importLine = `import { ${ruleIdentifier} } from "./rules/${options.ruleName}.js";`;
  const updatedLinter = updateLinterFile(linterPath, importLine, ruleIdentifier);

  const plannedActions = [
    `create ${rulePath}`,
    `create ${testPath}`,
    `create ${docsPath}`,
    `update ${linterPath}`,
  ];

  if (options.dryRun) {
    console.log("Dry run: no files were written.");
    for (const action of plannedActions) {
      console.log(`- ${action}`);
    }
    return;
  }

  writeText(rulePath, ruleFile);
  writeText(testPath, testFile);
  writeText(docsPath, docsFile);
  writeText(linterPath, updatedLinter);

  console.log("Created linter rule scaffold:");
  for (const action of plannedActions) {
    console.log(`- ${action}`);
  }
}

main();
