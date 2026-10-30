import type { SdkType } from "@azure-tools/typespec-client-generator-core";
import type { ServiceOperation } from "../../utils/operation-util.js";

const decimalGuidance = `**Important:** JavaScript uses IEEE 754 floating-point arithmetic, which can introduce
rounding errors for decimal values (e.g., \`0.1 + 0.2 !== 0.3\`).

To avoid precision issues:
- Use integer math for fixed-point values (e.g., represent cents instead of dollars).
- Or use a decimal library (e.g., \`decimal.js\`) for exact calculations.`;

const conditionalHeaderGuidance = `**Important:** If you set conditional headers (e.g., \`If-Unmodified-Since\`, \`If-Match\`),
the service may return:
- \`412 Precondition Failed\` if the resource changed since the specified condition.
- \`304 Not Modified\` for GET requests if the resource has not changed.

The SDK does not automatically retry or resolve conflicts.
You should handle these status codes in your application logic.`;

const conditionalHeaders = new Set([
  "if-match",
  "if-none-match",
  "if-modified-since",
  "if-unmodified-since",
]);

function isDecimalInput(type: SdkType, visited = new Set<SdkType>()): boolean {
  if (visited.has(type)) {
    return false;
  }
  visited.add(type);
  switch (type.kind) {
    case "decimal":
    case "decimal128":
      return type.encode !== "string";
    case "nullable":
      return isDecimalInput(type.type, visited);
    case "array":
    case "dict":
      return isDecimalInput(type.valueType, visited);
    case "union":
      return type.variantTypes.some((variant) => isDecimalInput(variant, visited));
    default:
      return false;
  }
}

export function getInputDocs(type: SdkType, description?: string): string[] {
  return isDecimalInput(type)
    ? [[...getDocsFromDescription(description), decimalGuidance].join("\n\n")]
    : getDocsFromDescription(description);
}

export function getOperationDocs(operation: ServiceOperation, parameterNames: string[]): string[] {
  const docs = getDocsFromDescription(operation.doc);
  if (
    operation.operation.parameters.some(
      (parameter) =>
        parameter.kind === "header" &&
        conditionalHeaders.has(parameter.serializedName.toLowerCase()),
    )
  ) {
    docs.push(conditionalHeaderGuidance);
  }
  for (const parameter of operation.parameters) {
    if (
      !parameter.optional &&
      parameter.onClient === false &&
      parameterNames.includes(parameter.name) &&
      isDecimalInput(parameter.type)
    ) {
      docs.push(
        `@param ${parameter.name} - ${parameter.doc?.trim() || "A decimal number."}\n${decimalGuidance}`,
      );
    }
  }
  return docs.length > 0 ? [docs.join("\n\n")] : [];
}

export function getFixmeForMultilineDocs(fixme: string[]): string[] {
  return fixme.map((fixme) => ` @fixme ${fixme}`);
}

export function getDocsFromDescription(description?: string): string[] {
  if (!description || description.trim().length === 0) {
    return [];
  }
  return [description];
}
