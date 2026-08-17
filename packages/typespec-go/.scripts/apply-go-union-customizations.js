// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, relative } from "path";

const pkgRoot =
  execSync("git rev-parse --show-toplevel").toString().trim() + "/packages/typespec-go/";
const specsRoot = pkgRoot + "node_modules/@typespec/http-specs/specs/";
const customizedRoot = pkgRoot + "temp/go-union-customizations/http-specs/specs/";

const IMPORT_TCGC = 'import "@azure-tools/typespec-client-generator-core";';
const USING_TCGC = "using Azure.ClientGenerator.Core;";
const SCOPE_GO = '@scope("!go")';

function fail(message) {
  throw new Error(`[go-union-customizations] ${message}`);
}

function ensureFileExists(path) {
  if (!existsSync(path)) {
    fail(`file not found: ${path}. Run pnpm install first.`);
  }
}

function ensureImportAndUsing(content, filePath) {
  let result = content;

  if (!result.includes(IMPORT_TCGC)) {
    const importMatches = [...result.matchAll(/^import\s+"[^"]+";\r?$/gm)];
    if (importMatches.length === 0) {
      fail(`cannot find import block in ${filePath}`);
    }
    const lastImport = importMatches[importMatches.length - 1];
    const insertAt = lastImport.index + lastImport[0].length;
    result = result.slice(0, insertAt) + "\n" + IMPORT_TCGC + result.slice(insertAt);
  }

  if (!result.includes(USING_TCGC)) {
    const usingMatches = [...result.matchAll(/^using\s+[A-Za-z0-9_.]+;\r?$/gm)];
    if (usingMatches.length === 0) {
      fail(`cannot find using block in ${filePath}`);
    }
    const lastUsing = usingMatches[usingMatches.length - 1];
    const insertAt = lastUsing.index + lastUsing[0].length;
    result = result.slice(0, insertAt) + "\n" + USING_TCGC + result.slice(insertAt);
  }

  return result;
}

function hasScopeNearAnchor(content, anchorIndex) {
  const from = Math.max(0, anchorIndex - 300);
  return content.slice(from, anchorIndex).includes(SCOPE_GO);
}

function ensureScopeBefore(content, anchor, comment) {
  const index = content.indexOf(anchor);
  if (index === -1) {
    fail(`anchor not found: ${anchor}`);
  }

  if (hasScopeNearAnchor(content, index)) {
    return content;
  }

  const prefix = comment ? `${comment}\n${SCOPE_GO}\n` : `${SCOPE_GO}\n`;
  return content.slice(0, index) + prefix + content.slice(index);
}

function replaceOnce(content, from, to, hint) {
  if (content.includes(to)) {
    return content;
  }
  if (!content.includes(from)) {
    fail(`replacement anchor not found (${hint})`);
  }
  return content.replace(from, to);
}

function patchRepeatability(content) {
  return ensureScopeBefore(
    content,
    '  @doc("Indicates whether the repeatable request was accepted or rejected.")\n  repeatabilityResult?: "accepted" | "rejected";',
    "  // Go does not support the union-valued response header.",
  );
}

function patchAdditionalProperties(content) {
  let result = content;

  const unionInterface = `interface UnionModelOperations<TModel, TDoc extends valueof string> {
  @scenario
  @scenarioDoc("""
    Expected response body:
    \`\`\`json
    ${"${TDoc}"}
    \`\`\`
    """)
  // Go does not support union-valued additional properties.
  @scope("!go")
  @get
  get(): TModel;

  @scenario
  @scenarioDoc("""
    Expected input body:
    \`\`\`json
    ${"${TDoc}"}
    \`\`\`
    """)
  // Go does not support union-valued additional properties.
  @scope("!go")
  @put
  put(@body body: TModel): void;
}

`;

  if (!result.includes("interface UnionModelOperations<TModel, TDoc extends valueof string>")) {
    const marker =
      "// ********************************************** Record<unknown> **********************************************";
    const idx = result.indexOf(marker);
    if (idx === -1) {
      fail("cannot find insertion marker in additional-properties/main.tsp");
    }
    result = result.slice(0, idx) + unionInterface + result.slice(idx);
  }

  result = replaceOnce(
    result,
    "interface MultipleSpread\n  extends ModelOperations<",
    "interface MultipleSpread\n  extends UnionModelOperations<",
    "MultipleSpread extends",
  );
  result = replaceOnce(
    result,
    "interface SpreadRecordUnion\n  extends ModelOperations<",
    "interface SpreadRecordUnion\n  extends UnionModelOperations<",
    "SpreadRecordUnion extends",
  );
  result = replaceOnce(
    result,
    "interface SpreadRecordNonDiscriminatedUnion\n  extends ModelOperations<",
    "interface SpreadRecordNonDiscriminatedUnion\n  extends UnionModelOperations<",
    "SpreadRecordNonDiscriminatedUnion extends",
  );
  result = replaceOnce(
    result,
    "interface SpreadRecordNonDiscriminatedUnion2\n  extends ModelOperations<",
    "interface SpreadRecordNonDiscriminatedUnion2\n  extends UnionModelOperations<",
    "SpreadRecordNonDiscriminatedUnion2 extends",
  );
  result = replaceOnce(
    result,
    "interface SpreadRecordNonDiscriminatedUnion3\n  extends ModelOperations<",
    "interface SpreadRecordNonDiscriminatedUnion3\n  extends UnionModelOperations<",
    "SpreadRecordNonDiscriminatedUnion3 extends",
  );

  return result;
}

function patchVersioningRemoved(content) {
  return ensureScopeBefore(
    content,
    "@post\nop v2(@body body: ModelV2, @removed(Versions.v2) @query param: string): ModelV2;",
    "// Go does not support the union properties in ModelV2.",
  );
}

function applyFile(relativePath, patchFn, includeTcgc = true) {
  const filePath = specsRoot + relativePath;
  ensureFileExists(filePath);
  const original = readFileSync(filePath, "utf8");
  let patched = original;

  if (includeTcgc) {
    patched = ensureImportAndUsing(patched, filePath);
  }
  patched = patchFn(patched);

  const customizedPath = customizedRoot + relativePath;
  mkdirSync(dirname(customizedPath), { recursive: true });
  writeFileSync(customizedPath, patched);
  console.log(
    `[go-union-customizations] ${patched !== original ? "patched" : "copied"} ${relativePath}`,
  );
}

export function applyGoUnionCustomizations() {
  applyFile("special-headers/repeatability/main.tsp", patchRepeatability);
  applyFile("type/property/additional-properties/main.tsp", patchAdditionalProperties);
  applyFile("versioning/removed/main.tsp", patchVersioningRemoved);
}

export function getCustomizedSpecPath(input) {
  if (!input.startsWith(specsRoot)) {
    return input;
  }
  const relativePath = relative(specsRoot, input).replaceAll("\\", "/");
  const customizedPath = customizedRoot + relativePath;
  return existsSync(customizedPath) ? customizedPath : input;
}

if (process.argv[1] && process.argv[1].endsWith("apply-go-union-customizations.js")) {
  applyGoUnionCustomizations();
}
