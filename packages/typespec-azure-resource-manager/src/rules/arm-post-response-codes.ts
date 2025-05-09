import { Program, createRule } from "@typespec/compiler";

import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { HttpOperationResponse, HttpPayloadBody } from "@typespec/http";
import { ArmResourceOperation } from "../operations.js";
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
    sync: `Synchronous post operations must have a 200 or 204 response and a default response. They must not have any other responses.`,
    async: `Long-running post operations must have 202 and default responses. They must also have a 200 response if the final response has a schema. They must not have any other responses.`,
  },
  create(context) {
    function getResponseBody(
      response: HttpOperationResponse | undefined,
    ): HttpPayloadBody | undefined {
      if (response === undefined) return undefined;
      if (response.responses.length > 1) {
        throw new Error("Multiple responses are not supported.");
      }
      if (response.responses[0].body !== undefined) {
        return response.responses[0].body;
      }
      return undefined;
    }

    function validateAsyncPost(op: ArmResourceOperation) {
      const statusCodes = new Set([
        ...op.httpOperation.responses.map((r) => r.statusCodes.toString()),
      ]);
      // validate that there are 202 and * status codes, and maybe 200
      const expected =
        statusCodes.size === 2 ? new Set(["202", "*"]) : new Set(["202", "200", "*"]);
      if (statusCodes.size !== expected.size || ![...statusCodes].every((v) => expected.has(v))) {
        context.reportDiagnostic({
          target: op.operation,
          messageId: "async",
        });
      }
      // validate that 202 does not have a schema
      const response202 = op.httpOperation.responses.find((r) => r.statusCodes === 202);
      const body202 = getResponseBody(response202);
      if (body202 !== undefined) {
        context.reportDiagnostic({
          target: op.operation.returnType,
          messageId: "async",
        });
      }
      // validate that a 200 response does have a schema
      const response200 = op.httpOperation.responses.find((r) => r.statusCodes === 200);
      const body200 = getResponseBody(response200);
      if (response200 && body200 === undefined) {
        context.reportDiagnostic({
          target: op.operation.returnType,
          messageId: "async",
        });
      }
    }

    function validateSyncPost(op: ArmResourceOperation) {
      const allowed = [new Set(["200", "*"]), new Set(["204", "*"])];
      const statusCodes = new Set([
        ...op.httpOperation.responses.map((r) => r.statusCodes.toString()),
      ]);
      if (
        !allowed.some(
          (expected) =>
            statusCodes.size === expected.size && [...statusCodes].every((v) => expected.has(v)),
        )
      ) {
        context.reportDiagnostic({
          target: op.operation,
          messageId: "sync",
        });
      }
    }

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
            if (op === undefined || op.httpOperation.verb !== "post") {
              continue;
            }
            const isAsync = getLroMetadata(context.program, op.operation) !== undefined;
            if (isAsync) {
              validateAsyncPost(op);
            } else {
              validateSyncPost(op);
            }
          }
        }
      },
    };
  },
});
