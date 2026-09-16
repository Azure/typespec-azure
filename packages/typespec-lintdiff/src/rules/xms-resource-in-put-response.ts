import {
  getArmProviderNamespace,
  getArmResource,
} from "@azure-tools/typespec-azure-resource-manager";
import { createRule, type Model, type ModelProperty } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";

export const xmsResourceInPutResponseRule = createRule({
  name: "xms-resource-in-put-response",
  description:
    "ARM PUT success responses must return a model with native Azure resource semantics.",
  severity: "warning",
  messages: {
    default:
      "PUT 200/201 response models should be Azure resources and must carry x-ms-azure-resource semantics.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (
          namespace === undefined ||
          getArmProviderNamespace(context.program, namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") {
          return;
        }

        const responseModel = getPrimarySuccessResponseModel(httpOperation.responses);
        if (responseModel === undefined) {
          return;
        }

        if (!looksLikeManualResourceModel(responseModel)) {
          return;
        }

        if (getArmResource(context.program, responseModel) !== undefined) {
          return;
        }

        context.reportDiagnostic({
          target: responseModel,
        });
      },
    };
  },
});

function getPrimarySuccessResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  return getResponseModel(responses, 200) ?? getResponseModel(responses, 201);
}

function getResponseModel(
  responses: HttpOperationResponse[],
  statusCode: number,
): Model | undefined {
  for (const response of responses) {
    if (response.statusCodes !== statusCode) {
      continue;
    }

    for (const content of response.responses) {
      if (content.body?.type.kind === "Model") {
        return content.body.type;
      }
    }
  }

  return undefined;
}

function looksLikeManualResourceModel(model: Model): boolean {
  return (
    getPropertyInHierarchy(model, "name") !== undefined &&
    getPropertyInHierarchy(model, "type") !== undefined
  );
}

function getPropertyInHierarchy(model: Model, propertyName: string): ModelProperty | undefined {
  for (let current: Model | undefined = model; current !== undefined; current = current.baseModel) {
    const property = current.properties.get(propertyName);
    if (property !== undefined) {
      return property;
    }
  }

  return undefined;
}
