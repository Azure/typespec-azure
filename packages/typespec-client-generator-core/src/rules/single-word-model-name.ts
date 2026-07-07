import {
  CodeFix,
  Model,
  Program,
  createRule,
  getNamespaceFullName,
  getSourceLocation,
  paramMessage,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { createTCGCContext } from "../context.js";
import { getLibraryName } from "../public-utils.js";
import { createClientTspAugmentDecoratorCodeFix } from "./codefix-helpers.js";

interface ChatCompletionConnection {
  sendRequest(
    requestName: "custom/chatCompletion",
    params: {
      messages: { role: "user"; message: string }[];
      modelFamily: string;
      id: string;
    },
  ): Promise<string | undefined>;
}

interface DynamicCodeFix extends CodeFix {
  resolveCodefixes?: () => Promise<CodeFix[]>;
}

function splitPascalCase(name: string): string[] {
  const words: string[] = [];
  let current = "";

  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    const isUpper = char >= "A" && char <= "Z";
    const nextIsLower = i + 1 < name.length && name[i + 1] >= "a" && name[i + 1] <= "z";

    if (isUpper && current.length > 0) {
      const prevIsLower = current[current.length - 1] >= "a" && current[current.length - 1] <= "z";
      if (prevIsLower || nextIsLower) {
        words.push(current);
        current = char;
      } else {
        current += char;
      }
    } else {
      current += char;
    }
  }
  if (current.length > 0) words.push(current);
  return words;
}

function isSingleWord(name: string): boolean {
  if (name.length <= 1) return false;
  if (!/^[A-Z]/.test(name)) return false;
  return splitPascalCase(name).length <= 1;
}

function getLspConnection(): ChatCompletionConnection | undefined {
  const connection = (globalThis as { lspConnection?: unknown }).lspConnection;
  if (typeof connection !== "object" || connection === null) return undefined;
  const sendRequest = (connection as Partial<ChatCompletionConnection>).sendRequest;
  if (typeof sendRequest !== "function") return undefined;
  return connection as ChatCompletionConnection;
}

function extractModelSource(model: Model): string {
  if (model.node === undefined || model.node.kind !== SyntaxKind.ModelStatement) return "";
  const location = getSourceLocation(model.node);
  return location.file.text.slice(model.node.pos, model.node.end).trim();
}

function parseSuggestions(response: string): string[] {
  return [
    ...new Set(
      response
        .split("\n")
        .map((line) =>
          line
            .trim()
            .replace(/^`+|`+$/g, "")
            .replace(/^\d+\.\s*/, "")
            .trim(),
        )
        .filter((name) => name && /^[A-Z][a-zA-Z0-9]*$/.test(name) && !isSingleWord(name)),
    ),
  ].slice(0, 5);
}

async function fetchAiNameSuggestions(model: Model, csharpName: string): Promise<string[]> {
  const connection = getLspConnection();
  if (connection === undefined) return [];

  const namespaceName = model.namespace ? getNamespaceFullName(model.namespace) : "";
  const prompt = `You are a .NET naming expert. A TypeSpec model named "${csharpName}" in namespace "${namespaceName}" is a single word that may collide with .NET types.

Model definition:
${extractModelSource(model)}

Suggest exactly 5 better multi-word PascalCase names. Reply with only the names, one per line.`;

  try {
    const result = await connection.sendRequest("custom/chatCompletion", {
      messages: [{ role: "user", message: prompt }],
      modelFamily: "claude-opus-4.6",
      id: `single-word-model-name-${namespaceName}.${csharpName}`,
    });
    return typeof result === "string" ? parseSuggestions(result) : [];
  } catch {
    return [];
  }
}

function createClientNameCodeFix(
  model: Model,
  program: Program,
  csharpName: string,
  name: string,
  index: number,
): CodeFix {
  const fix = createClientTspAugmentDecoratorCodeFix(model, "clientName", program, [
    `"${name}"`,
    `"csharp"`,
  ]);
  return {
    ...fix,
    id: `${fix.id}-${index}`,
    label: `Rename '${csharpName}' to '${name}' in client.tsp`,
  };
}

function createAiClientNameCodeFix(model: Model, program: Program, csharpName: string): CodeFix {
  const fix: DynamicCodeFix = {
    id: "ai-rename-single-word-model",
    label: "Suggest multi-word C# names",
    fix: () => [],
    resolveCodefixes: async () => {
      const suggestions = await fetchAiNameSuggestions(model, csharpName);
      const names =
        suggestions.length > 0
          ? suggestions
          : [`${model.namespace?.name ?? "Service"}${csharpName}`].filter((x) => !isSingleWord(x));
      return names.map((name, index) =>
        createClientNameCodeFix(model, program, csharpName, name, index),
      );
    },
  };
  return fix;
}

export const singleWordModelNameRule = createRule({
  name: "single-word-model-name",
  description:
    "Model names should be multi-word to avoid naming collisions with .NET platform types.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/single-word-model-name",
  messages: {
    default: paramMessage`Model name '${"name"}' is a single word. Use a more descriptive multi-word name.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );

    return {
      model: (model: Model) => {
        if (model.node === undefined || model.node.kind !== SyntaxKind.ModelStatement) return;
        if (model.templateMapper !== undefined) return;

        const csharpName = getLibraryName(tcgcContext, model, "csharp");
        if (!isSingleWord(csharpName)) return;

        context.reportDiagnostic({
          format: { name: csharpName },
          target: model,
          codefixes: [createAiClientNameCodeFix(model, context.program, csharpName)],
        });
      },
    };
  },
});
