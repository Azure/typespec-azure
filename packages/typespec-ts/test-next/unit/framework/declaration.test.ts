import { format } from "prettier";
import { Project, StructureKind, type FunctionDeclarationStructure } from "ts-morph";
import { beforeEach, describe, expect, it } from "vitest";

import { addDeclaration } from "../../../src/framework/declaration.js";
import { provideBinder } from "../../../src/framework/hooks/binder.js";
import {
  beginSourceFileBatch,
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

describe("addDeclaration", () => {
  let project: Project;

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true });
    provideBinder(project);
  });

  it("preserves a blank line when statements are added separately", async () => {
    const sourceFile = createSourceFile();

    addDeclaration(sourceFile, firstFunction, "first");
    addDeclaration(sourceFile, secondFunction, "second");

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n\nfunction second()",
    );
  });

  it("preserves blank lines between batched statements", async () => {
    const sourceFile = createSourceFile();
    beginSourceFileBatch();
    try {
      addDeclaration(sourceFile, firstFunction, "first");
      addDeclaration(sourceFile, secondFunction, "second");
    } finally {
      flushSourceFileBatch();
    }

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n\nfunction second()",
    );
  });

  it("preserves existing leading trivia", async () => {
    const sourceFile = createSourceFile();

    addDeclaration(sourceFile, firstFunction, "first");
    addDeclaration(
      sourceFile,
      {
        ...secondFunction,
        leadingTrivia: "// Existing comment\n",
      },
      "second",
    );

    expect(await formatSourceFile(sourceFile)).toContain(
      "function first() {\n  return 1;\n}\n// Existing comment\nfunction second()",
    );
  });

  it("does not mutate the input structure", () => {
    const sourceFile = createSourceFile();
    const declaration: FunctionDeclarationStructure = {
      ...secondFunction,
    };

    addDeclaration(sourceFile, declaration, "second");

    expect(declaration.leadingTrivia).toBeUndefined();
  });

  function createSourceFile() {
    return project.createSourceFile("test.ts");
  }

  async function formatSourceFile(sourceFile: ReturnType<typeof createSourceFile>) {
    return await format(sourceFile.getFullText(), prettierTypeScriptOptions);
  }
});
