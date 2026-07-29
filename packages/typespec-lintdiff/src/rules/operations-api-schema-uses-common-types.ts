import { isArmCommonType, isArmProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, paramMessage, type Model, type Type } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";

const operationsApiPathPattern = /\/providers\/[^/]+\/operations$/i;
const commonTypesOperationListResult = "OperationListResult";

export const operationsApiSchemaUsesCommonTypesRule = createRule({
  name: "operations-api-schema-uses-common-types",
  description:
    "The ARM operations API must return the common-types OperationListResult schema (RPC-Operations-V1-01).",
  severity: "warning",
  messages: {
    default: paramMessage`Operations API '${"path"}' must return the common-types \`OperationListResult\` schema. Declare it with "interface Operations extends Azure.ResourceManager.Operations {}" instead of a service-defined response model.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!isArmProviderNamespace(context.program, namespace)) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" || !operationsApiPathPattern.test(httpOperation.path)) {
          return;
        }

        const successBody = getSuccessResponseBody(httpOperation.responses);
        if (successBody === undefined || isCommonTypesOperationListResult(successBody)) {
          return;
        }

        // Target the user-declared interface rather than the operation: when the operation
        // comes from a template instantiation (`interface Operations extends
        // Azure.ResourceManager.Legacy.Operations<...>`) its node lives in the library
        // source and the diagnostic is dropped.
        context.reportDiagnostic({
          target: operation.interface ?? operation,
          format: { path: httpOperation.path },
        });
      },
    };
  },
});

function getSuccessResponseBody(responses: HttpOperationResponse[]): Type | undefined {
  for (const response of responses) {
    if (response.statusCodes !== 200) {
      continue;
    }

    for (const variant of response.responses) {
      if (variant.body !== undefined) {
        return variant.body.type;
      }
    }
  }

  return undefined;
}

function isCommonTypesOperationListResult(type: Type): boolean {
  if (type.kind !== "Model") {
    return false;
  }

  const model: Model = type;
  return model.name === commonTypesOperationListResult && isArmCommonType(model);
}
