import { createRule, isTemplateDeclaration, isTemplateInstance, paramMessage } from "@typespec/compiler";
import type { Operation } from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import { isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation } from "@typespec/http";

const evenSegmentedArmPutPathPattern =
  /.*\/providers\/\w+\.\w+(\/\w+\/(default|\{\w+\}))+$/;

export const evenSegmentedPathForPutOperationRule = createRule({
  name: "even-segmented-path-for-put-operation",
  description:
    "ARM PUT paths must end in repeated /{resourceType}/{resourceName} or /{resourceType}/default pairs after the provider namespace.",
  severity: "warning",
  messages: {
    default:
      paramMessage`ARM PUT path '${"path"}' must end in repeated /{resourceType}/{resourceName} or /{resourceType}/default pairs after the provider namespace.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (isTemplateInstance(operation) || isTemplatedInterfaceOperation(operation)) {
          return;
        }

        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        if (evenSegmentedArmPutPathPattern.test(httpOperation.path)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
          format: {
            path: httpOperation.path,
          },
        });
      },
    };
  },
});

function isTemplatedInterfaceOperation(target: Operation): boolean {
  return (
    target.node?.kind === SyntaxKind.OperationStatement &&
    target.interface !== undefined &&
    isTemplateDeclaration(target.interface)
  );
}
