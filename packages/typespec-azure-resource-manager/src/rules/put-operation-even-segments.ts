import { Program, createRule, paramMessage } from "@typespec/compiler";
import { getArmResources, getSingletonResourceKey } from "../resource.js";

export const putOperationEvenSegmentsRule = createRule({
  name: "put-operation-even-segments",
  severity: "warning",
  description: "PUT operations should have an even number of segments.",
  messages: {
    evenSegments: paramMessage`PUT request path for '${"operationName"}' should have an even number of segments.`,
    pathVariable: paramMessage`PUT request path for '${"operationName"}' should end with a path parameter in curly braces.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        for (const resource of resources) {
          const operations = [
            resource.operations.lifecycle.createOrUpdate,
            resource.operations.lifecycle.update,
            ...Object.values(resource.operations.actions),
          ];
          for (const op of operations) {
            if (op === undefined) {
              continue;
            }
            if (op.httpOperation.verb === "put") {
              const segments = op.httpOperation.path.split("/").filter((x) => x !== "");
              if (segments.length % 2 !== 0) {
                context.reportDiagnostic({
                  target: op.operation,
                  messageId: "evenSegments",
                  format: {
                    operationName: op.name,
                  },
                });
              }
              const isSingleton = getSingletonResourceKey(context.program, resource.typespecType);
              if (isSingleton) continue;
              const lastSegment = segments[segments.length - 1];

              if (!lastSegment.startsWith("{") || !lastSegment.endsWith("}")) {
                context.reportDiagnostic({
                  target: op.operation,
                  messageId: "pathVariable",
                  format: {
                    operationName: op.name,
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});
