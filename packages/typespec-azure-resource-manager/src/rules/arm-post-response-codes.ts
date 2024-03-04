import { Program, createRule } from "@typespec/compiler";

import { getArmResources } from "../resource.js";

/**
 * Verify that a post operation has the correct response codes.
 */
export const armPostResponseCodesRule = createRule({
  name: "arm-post-operation-response-codes",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/post-operation-response-codes",
  description: "Ensure post operations have the appropriate status codes.",
  messages: {
    sync: `Synchronous delete operations must have 200, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteSync' template.`,
    async: `Long-running delete operations must have 202, 204 and default responses. They must not have any other responses. Consider using the 'ArmResourceDeleteWithoutOkAsync' template.`,
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
          ];
          for (const op of operations) {
            if (op === undefined) {
              continue;
            }
            if (op.httpOperation.verb === "post") {
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
