import type {
  CodeFix,
  CodeFixContext,
  CompilerHost,
  InsertTextCodeFixEdit,
  Model,
  ModelProperty,
  Type,
} from "@typespec/compiler";
import {
  createSourceFile,
  defineCodeFix,
  getNamespaceFullName,
  getSourceLocation,
  resolvePath,
} from "@typespec/compiler";

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
 * Compute the relative import path from client.tsp (at project root) to the
 * source file where the target type is defined.
 */
function computeRelativeImportPath(target: Type, projectRoot: string): string {
  if (target.node === undefined) return "./main.tsp";
  const sourcePath = getSourceLocation(target.node).file.path;
  if (sourcePath.startsWith(projectRoot)) {
    const subPath = sourcePath.slice(projectRoot.length).replace(/^\//, "");
    return `./${subPath}`;
  }
  return `./${sourcePath.split("/").pop() ?? "main.tsp"}`;
}

/**
 * Create a codefix that writes an augment decorator (@@decorator) to client.tsp.
 *
 * This builds on `createAugmentDecoratorCodeFix` but targets client.tsp instead
 * of the same file. It additionally handles:
 * - Creating client.tsp if it doesn't exist
 * - Adding import/using statements at the top (without duplicates)
 *
 * @param target The type to target with the augment decorator.
 * @param decoratorName The decorator name (e.g., "clientName").
 * @param host The compiler host for reading files.
 * @param projectRoot The project root directory (where client.tsp should be created).
 * @param args The decorator arguments as literal strings.
 */
export function createClientTspAugmentDecoratorCodeFix(
  target: Model | ModelProperty,
  decoratorName: string,
  host: CompilerHost,
  projectRoot: string,
  args?: string[],
): CodeFix {
  const fqn = buildFqn(target);
  const argsStr = args && args.length > 0 ? `, ${args.join(", ")}` : "";
  const decoratorText = `@@${decoratorName}(${fqn}${argsStr})`;

  return {
    id: `add-${decoratorName}-in-client-tsp`,
    label: `Add \`${decoratorText}\` in client.tsp`,
    fix: (async (_fixContext: CodeFixContext): Promise<any> => {
      if (target.node === undefined) return [];
      const clientTspPath = resolvePath(projectRoot, "client.tsp");

      let existingText = "";
      try {
        const file = await host.readFile(clientTspPath);
        existingText = file.text;
      } catch {
        // File doesn't exist yet — will be created by the language server
      }

      const relativePath = computeRelativeImportPath(target, projectRoot);
      const clientFile = createSourceFile(existingText, clientTspPath);
      const edits: InsertTextCodeFixEdit[] = [];

      // Build imports/using to insert at the TOP of the file
      const tcgcImport = `import "@azure-tools/typespec-client-generator-core";`;
      const modelImport = `import "${relativePath}";`;
      const usingLine = `using Azure.ClientGenerator.Core;`;

      let headerToInsert = "";
      if (!existingText.includes(tcgcImport)) {
        headerToInsert += tcgcImport + "\n";
      }
      if (!existingText.includes(modelImport)) {
        headerToInsert += modelImport + "\n";
      }
      if (!existingText.includes(usingLine)) {
        headerToInsert += "\n" + usingLine + "\n";
      }
      if (headerToInsert.length > 0) {
        edits.push({
          kind: "insert-text",
          pos: 0,
          text: headerToInsert + (existingText.length === 0 ? "\n" : ""),
          file: clientFile,
        });
      }

      // Append augment decorator at the END of the file
      edits.push({
        kind: "insert-text",
        pos: existingText.length,
        text: `${decoratorText};\n`,
        file: clientFile,
      });

      return edits;
    }) as CodeFix["fix"],
  };
}
