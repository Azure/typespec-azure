import type {
  CodeFix,
  CodeFixContext,
  CompilerHost,
  InsertTextCodeFixEdit,
} from "@typespec/compiler";
import {
  ModelProperty,
  createRule,
  createSourceFile,
  getNamespaceFullName,
  getSourceLocation,
  paramMessage,
  resolvePath,
} from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";

function createRenameUrlToUriCodeFix(
  property: ModelProperty,
  csharpName: string,
  host: CompilerHost,
  projectRoot: string,
) {
  const newName = csharpName.slice(0, -1) + "i"; // Url → Uri
  const codeFix: CodeFix = {
    id: "rename-url-to-uri",
    label: `Add @@clientName to client.tsp → "${newName}"`,
    fix: (async (_fixContext: CodeFixContext): Promise<any> => {
      if (property.node === undefined) return [];
      // Always create client.tsp at the project root (next to tspconfig.yaml/main.tsp),
      // not in the property's source file directory which could be a subdirectory.
      const clientTspPath = resolvePath(projectRoot, "client.tsp");

      let existingText = "";
      try {
        const file = await host.readFile(clientTspPath);
        existingText = file.text;
      } catch {
        // File doesn't exist yet — will be created by the language server
      }

      // Compute relative import path from client.tsp (at project root) to the source file
      const propertySourcePath = getSourceLocation(property.node).file.path;
      let relativePath: string;
      if (propertySourcePath.startsWith(projectRoot)) {
        const subPath = propertySourcePath.slice(projectRoot.length).replace(/^\//, "");
        relativePath = `./${subPath}`;
      } else {
        relativePath = `./${propertySourcePath.split("/").pop() ?? "main.tsp"}`;
      }

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

      // Build @@clientName to append at the END of the file
      const model = property.model;
      let fqn: string;
      if (model && model.namespace) {
        const nsName = getNamespaceFullName(model.namespace);
        fqn = nsName
          ? `${nsName}.${model.name}.${property.name}`
          : `${model.name}.${property.name}`;
      } else if (model) {
        fqn = `${model.name}.${property.name}`;
      } else {
        fqn = property.name;
      }
      edits.push({
        kind: "insert-text",
        pos: existingText.length,
        text: `@@clientName(${fqn}, "${newName}", "csharp");\n`,
        file: clientFile,
      });

      return edits;
    }) as CodeFix["fix"],
  };
  return codeFix;
}

export const noUrlSuffixRule = createRule({
  name: "no-url-suffix",
  description:
    "Properties ending with 'Url' should use 'Uri' suffix instead to follow .NET naming conventions.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-url-suffix",
  messages: {
    default: paramMessage`Property '${"propertyName"}' ends with 'Url'. Use 'Uri' suffix instead (e.g. '${"suggestion"}'). Use @clientName("${"suggestion"}", "csharp") to rename it for C#.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    return {
      modelProperty: (property: ModelProperty) => {
        if (property.node === undefined) return;

        const csharpName = getLibraryName(tcgcContext, property, "csharp");
        if (!csharpName.endsWith("Url")) return;

        const suggestion = csharpName.slice(0, -1) + "i";
        context.reportDiagnostic({
          format: { propertyName: csharpName, suggestion },
          target: property,
          codefixes: [
            createRenameUrlToUriCodeFix(
              property,
              csharpName,
              context.program.host,
              context.program.projectRoot,
            ),
          ],
        });
      },
    };
  },
});
