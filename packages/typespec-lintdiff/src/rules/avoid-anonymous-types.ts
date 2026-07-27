import {
  createRule,
  getSourceLocation,
  isTemplateDeclaration,
  isTemplateInstance,
  type Model,
  type Operation,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { getHttpOperation } from "@typespec/http";

export const avoidAnonymousTypesRule = createRule({
  name: "avoid-anonymous-types",
  description:
    "Operation response bodies should use named models instead of anonymous inline model expressions.",
  severity: "warning",
  messages: {
    default:
      "Operation response body should use a named model instead of an anonymous inline model expression.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (shouldSkipOperation(operation)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const reported = new Set<Model>();
        for (const response of httpOperation.responses) {
          for (const content of response.responses) {
            const bodyType = content.body?.type;
            if (!isAnonymousModelExpression(bodyType) || reported.has(bodyType)) {
              continue;
            }

            reported.add(bodyType);
            context.reportDiagnostic({
              target: bodyType,
            });
          }
        }
      },
    };
  },
});

function shouldSkipOperation(operation: Operation): boolean {
  return (
    isTemplateInstance(operation) ||
    isTemplatedInterfaceOperation(operation) ||
    isNodeModulesPath(
      operation.node ? getSourceLocation(operation.node as any).file.path : undefined,
    )
  );
}

function isTemplatedInterfaceOperation(target: Operation): boolean {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface !== undefined &&
    isTemplateDeclaration(target.interface)
  );
}

function isAnonymousModelExpression(type: unknown): type is Model {
  return (
    typeof type === "object" &&
    type !== null &&
    (type as Model).kind === "Model" &&
    (type as Model).name === "" &&
    (type as Model).node?.kind === SyntaxKind.ModelExpression
  );
}

function isNodeModulesPath(path: string | undefined): boolean {
  return path?.includes("/node_modules/") === true ||
    path?.includes("\\node_modules\\") === true;
}
