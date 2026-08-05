import { format } from "prettier";
import { Project, StructureKind, type FunctionDeclarationStructure } from "ts-morph";
import { describe, expect, it } from "vitest";

import {
  beginSourceFileBatch,
  enqueueStatement,
  flushSourceFileBatch,
} from "../../../src/framework/source-file-batch.js";
import { prettierTypeScriptOptions } from "../../../src/lib.js";

const firstFunction: FunctionDeclarationStructure = {
  kind: StructureKind.Function,
  name: "first",
  statements: "return 1;",
};

const secondFunction: FunctionDeclarationStructure = {
  kind: StructureKind.Function,
  name: "second",
  statements: "return 2;",
};

describe("source file batch", () => {
  it("preserves a blank line when statements are added separately", async () => {
    const sourceFile = createSourceFile();
    sourceFile.addStatements([firstFunction]);

    enqueueStatement(sourceFile, secondFunction);

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n\nfunction second()",
    );
  });

  it("preserves blank lines between batched statements", async () => {
    const sourceFile = createSourceFile();
    beginSourceFileBatch();
    try {
      enqueueStatement(sourceFile, firstFunction);
      enqueueStatement(sourceFile, secondFunction);
    } finally {
      flushSourceFileBatch();
    }

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n\nfunction second()",
    );
  });

  it("preserves existing leading trivia", async () => {
    const sourceFile = createSourceFile();
    sourceFile.addStatements([firstFunction]);

    enqueueStatement(sourceFile, {
      ...secondFunction,
      leadingTrivia: "// Existing comment\n",
    });

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n\n// Existing comment\nfunction second()",
    );
  });

  it("does not add blank lines between export declarations", async () => {
    const sourceFile = createSourceFile();

    enqueueStatement(sourceFile, {
      kind: StructureKind.ExportDeclaration,
      moduleSpecifier: "./first.js",
      namedExports: ["first"],
    });
    enqueueStatement(sourceFile, {
      kind: StructureKind.ExportDeclaration,
      moduleSpecifier: "./second.js",
      namedExports: ["second"],
    });

    expect(await formatSourceFile(sourceFile)).toBe(
      'export { first } from "./first.js";\nexport { second } from "./second.js";\n',
    );
  });
});

function createSourceFile() {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("test.ts");
}

async function formatSourceFile(sourceFile: ReturnType<typeof createSourceFile>) {
  return await format(sourceFile.getFullText(), prettierTypeScriptOptions);
}
