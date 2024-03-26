import { Program, createRule, paramMessage } from "@typespec/compiler";
import { getArmResources } from "../resource.js";

export const putOperationEvenSegmentsRule = createRule({
  name: "put-operation-even-segments",
  severity: "warning",
  description: "PUT operations should have an even number of segments.",
  messages: {
    default: paramMessage`PUT request for resource '${"resourceName"}' should have an even number of segments.`,
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
                  format: {
                    resourceName: resource.name,
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
