import type {
  CodeFix,
  InsertTextCodeFixEdit,
  Model,
  ModelProperty,
  Program,
} from "@typespec/compiler";
import {
  createSourceFile,
  defineCodeFix,
  getNamespaceFullName,
  getSourceLocation,
  resolvePath,
} from "@typespec/compiler";
import type { TypeSpecScriptNode } from "@typespec/compiler/ast";
import { SyntaxKind } from "@typespec/compiler/ast";

/**
 * Get the namespace name for a target type.
 */
function getTargetNamespace(target: Model | ModelProperty): string {
  if (target.kind === "ModelProperty") {
    const model = target.model;
    if (model?.namespace) {
      return getNamespaceFullName(model.namespace);
    }
    return "";
  }
  if (target.namespace) {
    return getNamespaceFullName(target.namespace);
  }
  return "";
}

/**
 * Build a short reference for a type target (e.g., "Model.property").
 * Used for same-file augment decorators where the namespace is already in scope.
 */
function buildShortRef(target: Model | ModelProperty): string {
  if (target.kind === "ModelProperty") {
    const model = target.model;
    return model ? `${model.name}.${target.name}` : target.name;
  }
  return target.name;
}

/**
 * Build the fully qualified name for a type target (e.g., "Azure.Service.Model.property").
 * Used for cross-file augment decorators where the namespace may not be in scope.
 */
function buildFqn(target: Model | ModelProperty): string {
  if (target.kind === "ModelProperty") {
    const model = target.model;
    if (model && model.namespace) {
      const nsName = getNamespaceFullName(model.namespace);
      return nsName ? `${nsName}.${model.name}.${target.name}` : `${model.name}.${target.name}`;
    } else if (model) {
      return `${model.name}.${target.name}`;
    }
    return target.name;
  }
  // Model
  if (target.namespace) {
    const nsName = getNamespaceFullName(target.namespace);
    return nsName ? `${nsName}.${target.name}` : target.name;
  }
  return target.name;
}

function getLineEnd(text: string, start: number): number {
  const newline = text.indexOf("\n", start);
  return newline === -1 ? text.length : newline + 1;
}

function skipBlankLines(text: string, start: number): number {
  let pos = start;
  while (pos < text.length) {
    const lineEnd = getLineEnd(text, pos);
    if (text.slice(pos, lineEnd).trim() !== "") break;
    pos = lineEnd;
  }
  return pos;
}

function findImportInsertPos(script: TypeSpecScriptNode | undefined, text: string): number {
  const statements = script?.statements ?? [];
  const lastImport = statements.filter((x) => x.kind === SyntaxKind.ImportStatement).at(-1);
  if (lastImport) {
    return getLineEnd(text, lastImport.end);
  }

  const firstUsing = statements.find((x) => x.kind === SyntaxKind.UsingStatement);
  return firstUsing?.pos ?? 0;
}

function findUsingInsertPos(
  script: TypeSpecScriptNode | undefined,
  text: string,
  importInsertPos: number,
): number {
  const statements = script?.statements ?? [];
  const lastUsing = statements.filter((x) => x.kind === SyntaxKind.UsingStatement).at(-1);
  if (lastUsing) {
    return getLineEnd(text, lastUsing.end);
  }

  return skipBlankLines(text, importInsertPos);
}

/**
 * Create a codefix that adds an augment decorator (@@decorator) at the end of
 * the SAME file where the target is defined.
 *
 * This is the augment (`@@`) counterpart to the compiler's
 * `createAddDecoratorCodeFix()` (which adds `@` decorators).
 *
 * @param target The type to target with the augment decorator.
 * @param decoratorName The decorator name (e.g., "clientName").
 * @param args The decorator arguments as literal strings.
 */
export function createAugmentDecoratorCodeFix(
  target: Model | ModelProperty,
  decoratorName: string,
  args?: string[],
): CodeFix {
  const ref = buildShortRef(target);
  const argsStr = args && args.length > 0 ? `, ${args.join(", ")}` : "";
  const decoratorText = `@@${decoratorName}(${ref}${argsStr})`;

  return defineCodeFix({
    id: `add-augment-${decoratorName}`,
    label: `Add \`${decoratorText}\``,
    fix: (fixContext) => {
      if (target.node === undefined) return [];
      const location = getSourceLocation(target.node);
      return fixContext.appendText(
        { pos: location.file.text.length, file: location.file },
        `\n${decoratorText};\n`,
      );
    },
  });
}

/**
 * Create a codefix that writes an augment decorator (@@decorator) to client.tsp.
 *
 * This builds on `createAugmentDecoratorCodeFix` but targets client.tsp instead
 * of the same file. It additionally handles:
 * - Creating client.tsp if it doesn't exist
 * - Adding import/using statements at the top (without duplicates)
 * - Adding `using <namespace>` for the target's service namespace
 * - Using short references (e.g., `Foo.imageUrl`) instead of FQN when using is in scope
 *
 * Assumes client.tsp is imported via tspconfig.yaml so it appears in program.sourceFiles.
 *
 * @param target The type to target with the augment decorator.
 * @param decoratorName The decorator name (e.g., "clientName").
 * @param program The compiler program.
 * @param args The decorator arguments as literal strings.
 */
export function createClientTspAugmentDecoratorCodeFix(
  target: Model | ModelProperty,
  decoratorName: string,
  program: Program,
  args?: string[],
): CodeFix {
  const shortRef = buildShortRef(target);
  const targetNamespace = getTargetNamespace(target);
  const argsStr = args && args.length > 0 ? `, ${args.join(", ")}` : "";
  // Use short ref in label (cleaner display)
  const decoratorText = `@@${decoratorName}(${shortRef}${argsStr})`;
  const projectRoot = program.projectRoot;
  const clientTspPath = resolvePath(projectRoot, "client.tsp");
  const clientScript = program.sourceFiles.get(clientTspPath);

  // Read client.tsp content once via direct lookup (O(1)).
  // Assumes client.tsp is imported via tspconfig.yaml imports.
  const existingText = clientScript?.file.text ?? "";

  return defineCodeFix({
    id: `add-${decoratorName}-in-client-tsp`,
    label: `Add \`${decoratorText}\` in client.tsp`,
    fix: (fixContext) => {
      if (target.node === undefined) return [];

      const clientFile = createSourceFile(existingText, clientTspPath);
      const edits: InsertTextCodeFixEdit[] = [];

      // Build imports/using without moving existing import statements after usings.
      const tcgcImport = `import "@azure-tools/typespec-client-generator-core";`;
      const usingTcgc = `using Azure.ClientGenerator.Core;`;

      const missingImports: string[] = [];
      if (!existingText.includes(tcgcImport)) {
        missingImports.push(tcgcImport);
      }

      const missingUsings: string[] = [];
      if (!existingText.includes(usingTcgc)) {
        missingUsings.push(usingTcgc);
      }
      // Add using for the target's service namespace so we can use short references
      if (targetNamespace) {
        const usingNs = `using ${targetNamespace};`;
        if (!existingText.includes(usingNs) && !missingUsings.includes(usingNs)) {
          missingUsings.push(usingNs);
        }
      }

      const importInsertPos = findImportInsertPos(clientScript, existingText);
      const usingInsertPos = findUsingInsertPos(clientScript, existingText, importInsertPos);

      if (
        missingImports.length > 0 &&
        missingUsings.length > 0 &&
        importInsertPos === usingInsertPos
      ) {
        const text = [...missingImports, "", ...missingUsings].join("\n") + "\n\n";
        edits.push({
          kind: "insert-text",
          pos: importInsertPos,
          text,
          file: clientFile,
        });
      } else {
        if (missingImports.length > 0) {
          edits.push({
            kind: "insert-text",
            pos: importInsertPos,
            text: missingImports.join("\n") + "\n",
            file: clientFile,
          });
        }
        if (missingUsings.length > 0) {
          const needsLeadingBlank = usingInsertPos === importInsertPos && importInsertPos > 0;
          const needsTrailingBlank = usingInsertPos === existingText.length;
          edits.push({
            kind: "insert-text",
            pos: usingInsertPos,
            text: `${needsLeadingBlank ? "\n" : ""}${missingUsings.join("\n")}\n${needsTrailingBlank ? "\n" : ""}`,
            file: clientFile,
          });
        }
      }

      // Use short ref if the namespace is in scope (via using), otherwise FQN
      const hasNamespaceUsing =
        targetNamespace &&
        (existingText.includes(`using ${targetNamespace};`) ||
          missingUsings.includes(`using ${targetNamespace};`));
      const ref = hasNamespaceUsing ? shortRef : buildFqn(target);

      // Append augment decorator at the END of the file
      edits.push({
        kind: "insert-text",
        pos: existingText.length,
        text: `@@${decoratorName}(${ref}${argsStr});\n`,
        file: clientFile,
      });

      return edits;
    },
  });
}
