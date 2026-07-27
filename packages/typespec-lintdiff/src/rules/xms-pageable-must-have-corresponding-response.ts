import {
  createRule,
  paramMessage,
  type Model,
  type ModelProperty,
  type Operation,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const xmsPageableMustHaveCorrespondingResponseRule = createRule({
  name: "xms-pageable-must-have-corresponding-response",
  description:
    "ARM operations with x-ms-pageable nextLinkName must declare that property in the most successful response body.",
  severity: "warning",
  messages: {
    missingNextLink:
      paramMessage`Response body schema of x-ms-pageable ARM operation should contain top-level property \`${"name"}\`.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (resolveProviderNamespace(context.program, operation.namespace) === undefined) {
          return;
        }

        const pageableExtension = getExtensions(context.program, operation).get("x-ms-pageable");
        const nextLinkName = getRequiredNextLinkName(pageableExtension);
        if (nextLinkName === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const responseModel = getMostSuccessfulResponseModel(httpOperation.responses);
        if (responseModel === undefined) {
          return;
        }

        if (getInheritedProperty(responseModel, nextLinkName) !== undefined) {
          return;
        }

        context.reportDiagnostic({
          target: responseModel,
          messageId: "missingNextLink",
          format: {
            name: nextLinkName,
          },
        });
      },
    };
  },
});

function getRequiredNextLinkName(pageableExtension: unknown): string | undefined {
  if (typeof pageableExtension !== "object" || pageableExtension === null) {
    return undefined;
  }

  const nextLinkName = (pageableExtension as { nextLinkName?: unknown }).nextLinkName;
  return typeof nextLinkName === "string" && nextLinkName.length > 0 ? nextLinkName : undefined;
}

function getMostSuccessfulResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  let first2xxModel: Model | undefined;

  for (const response of responses) {
    const responseModel = getResponseModel(response);
    if (responseModel === undefined) {
      continue;
    }

    if (response.statusCodes === 200) {
      return responseModel;
    }

    if (
      first2xxModel === undefined &&
      typeof response.statusCodes === "number" &&
      response.statusCodes >= 200 &&
      response.statusCodes < 300
    ) {
      first2xxModel = responseModel;
    }
  }

  return first2xxModel;
}

function getResponseModel(response: HttpOperationResponse): Model | undefined {
  for (const content of response.responses) {
    if (content.body?.type.kind === "Model") {
      return content.body.type;
    }
  }

  return undefined;
}

function getInheritedProperty(model: Model, name: string): ModelProperty | undefined {
  for (const property of walkPropertiesInherited(model)) {
    if (property.name === name) {
      return property;
    }
  }

  return undefined;
}
