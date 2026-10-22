import type { Model, Operation } from "@typespec/compiler";
import {
  createRule,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  paramMessage,
  resolveEncodedName,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { getHttpOperation } from "@typespec/http";

export const repeatedPathInfoRule = createRule({
  name: "repeated-path-info",
  description:
    "ARM PUT request bodies must not repeat path or query parameters in the resource properties bag.",
  severity: "warning",
  messages: {
    default: paramMessage`Request body property '${"name"}' repeats information already carried in the path or query.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation)
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const repeatedNames = new Set(
          httpOperation.parameters.parameters
            .filter((parameter) => parameter.type === "path" || parameter.type === "query")
            .map((parameter) => parameter.name),
        );
        if (repeatedNames.size === 0) {
          return;
        }

        const body = httpOperation.parameters.body;
        if (body === undefined || body.bodyKind !== "single" || body.type.kind !== "Model") {
          return;
        }

        const propertiesModel = getPropertiesModel(body.type);
        if (propertiesModel === undefined) {
          return;
        }

        const reportedNames = new Set<string>();
        for (const property of walkPropertiesInherited(propertiesModel)) {
          const name = resolveEncodedName(context.program, property, "application/json");
          if (!repeatedNames.has(name)) {
            continue;
          }
          if (reportedNames.has(name)) {
            continue;
          }
          reportedNames.add(name);

          context.reportDiagnostic({
            target: property,
            format: {
              name,
            },
          });
        }
      },
    };
  },
});

function getPropertiesModel(model: Model): Model | undefined {
  for (const property of walkPropertiesInherited(model)) {
    if (property.name !== "properties" || property.type.kind !== "Model") {
      continue;
    }

    return property.type;
  }

  return undefined;
}

function isTemplatedInterfaceOperation(target: Operation): boolean {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface !== undefined &&
    isTemplateDeclaration(target.interface)
  );
}
