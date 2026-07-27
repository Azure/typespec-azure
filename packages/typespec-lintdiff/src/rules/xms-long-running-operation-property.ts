import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, type ModelProperty, type Operation, type Program } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

const qualifyingStatusCodes = [200, 201, 202, 204];
const qualifyingHeaders = new Set(["location", "azure-asyncoperation"]);
const qualifyingVerbs = new Set(["put", "patch", "post", "delete"]);

export const xmsLongRunningOperationPropertyRule = createRule({
  name: "xms-long-running-operation-property",
  description:
    "ARM PUT/PATCH/POST/DELETE operations with Location or Azure-AsyncOperation response headers must be marked as long-running.",
  severity: "warning",
  messages: {
    default:
      "If an operation's (PUT/POST/PATCH/DELETE) responses have `Location` or `Azure-AsyncOperation` headers then it MUST have the property `x-ms-long-running-operation` set to `true`.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (!qualifyingVerbs.has(httpOperation.verb)) {
          return;
        }

        if (isMarkedLongRunning(context.program, operation)) {
          return;
        }

        const target = getFirstQualifyingHeaderTarget(httpOperation.responses);
        if (target === undefined) {
          return;
        }

        context.reportDiagnostic({
          target,
        });
      },
    };
  },
});

function isMarkedLongRunning(program: Program, operation: Operation): boolean {
  return (
    getLroMetadata(program, operation) !== undefined ||
    getExtensions(program, operation).get("x-ms-long-running-operation") === true
  );
}

function getFirstQualifyingHeaderTarget(
  responses: HttpOperationResponse[],
): ModelProperty | undefined {
  for (const statusCode of qualifyingStatusCodes) {
    for (const response of responses) {
      if (response.statusCodes !== statusCode) {
        continue;
      }

      for (const content of response.responses) {
        const headers = content.headers ?? {};
        for (const [headerName, property] of Object.entries(headers)) {
          if (qualifyingHeaders.has(headerName.toLowerCase())) {
            return property;
          }
        }
      }
    }
  }

  return undefined;
}
