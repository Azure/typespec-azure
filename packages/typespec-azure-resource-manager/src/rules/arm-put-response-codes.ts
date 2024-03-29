import { Program, createRule } from "@typespec/compiler";

import { getArmResources } from "../resource.js";

/**
 * Verify that a put operation has the correct response codes.
 */
export const armPutResponseCodesRule = createRule({
  name: "arm-put-operation-response-codes",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/put-operation-response-codes",
  description: "Ensure put operations have the appropriate status codes.",
  messages: {
    default: `Put operations must have 200, 201 and default responses. They must not have any other responses.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const resources = getArmResources(program);
        const expected = new Set(["200", "201", "*"]);
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
              const statusCodes = new Set([
                ...op.httpOperation.responses.map((r) => r.statusCodes.toString()),
              ]);
              if (
                statusCodes.size !== expected.size ||
                ![...statusCodes].every((v) => expected.has(v))
              ) {
                context.reportDiagnostic({
                  target: op.operation,
                });
              }
            }
          }
        }
      },
    };
  },
});
