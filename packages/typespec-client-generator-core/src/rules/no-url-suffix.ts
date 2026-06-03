import {
  ModelProperty,
  createRule,
  createSourceFile,
  getDirectoryPath,
  getNamespaceFullName,
  getSourceLocation,
  paramMessage,
  resolvePath,
} from "@typespec/compiler";
import type { CodeFix, CodeFixContext, CompilerHost, InsertTextCodeFixEdit } from "@typespec/compiler";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";

function createRenameUrlToUriCodeFix(
  property: ModelProperty,
  csharpName: string,
  host: CompilerHost,
) {
  const newName = csharpName.slice(0, -1) + "i"; // Url → Uri
  const codeFix: CodeFix = {
    id: "rename-url-to-uri",
    label: `Add @@clientName to client.tsp → "${newName}"`,
    fix: (async (_fixContext: CodeFixContext): Promise<any> => {
      if (property.node === undefined) return [];
      const propertySourcePath = getSourceLocation(property.node).file.path;
      const dir = getDirectoryPath(propertySourcePath);
      const clientTspPath = resolvePath(dir, "client.tsp");

      let existingText = "";
      try {
        const file = await host.readFile(clientTspPath);
        existingText = file.text;
      } catch {
        // File doesn't exist yet — will be created by the language server
      }

      const modelFileName = propertySourcePath.split("/").pop() ?? "main.tsp";
      const importPath = `./${modelFileName}`;
      const tcgcImport = `import "@azure-tools/typespec-client-generator-core";\n`;
      const modelImport = `import "${importPath}";\n`;
      const usingLine = `using Azure.ClientGenerator.Core;\n`;

      let textToAppend = "";
      if (!existingText.includes(tcgcImport.trim())) {
        textToAppend += tcgcImport;
      }
      if (!existingText.includes(modelImport.trim())) {
        textToAppend += modelImport;
      }
      if (!existingText.includes(usingLine.trim())) {
        textToAppend += `\n${usingLine}`;
      }
      if (textToAppend.length > 0 && existingText.length === 0) {
        textToAppend += "\n";
      }

      // Build fully qualified property reference: Namespace.Model.property
      const model = property.model;
      let fqn: string;
      if (model && model.namespace) {
        fqn = `${getNamespaceFullName(model.namespace)}.${model.name}.${property.name}`;
      } else if (model) {
        fqn = `${model.name}.${property.name}`;
      } else {
        fqn = property.name;
      }
      textToAppend += `@@clientName(${fqn}, "${newName}", "csharp");\n`;

      const clientFile = createSourceFile(existingText, clientTspPath);
      const edit: InsertTextCodeFixEdit = {
        kind: "insert-text",
        pos: existingText.length,
        text: textToAppend,
        file: clientFile,
      };
      return edit;
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
          codefixes: [createRenameUrlToUriCodeFix(property, csharpName, context.program.host)],
        });
      },
    };
  },
});
