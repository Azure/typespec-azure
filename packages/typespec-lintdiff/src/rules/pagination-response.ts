import {
  createRule,
  getPagingOperation,
  isArrayModelType,
  isStringType,
  paramMessage,
  type Model,
  type ModelProperty,
  walkPropertiesInherited,
} from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const paginationResponseRule = createRule({
  name: "pagination-response",
  description:
    "Data-plane GET and POST operations with list-shaped responses should use pageable metadata, and explicit x-ms-pageable responses must expose value and next-link properties with the expected types.",
  severity: "warning",
  messages: {
    missingPageable:
      "Operation might be pageable. Consider adding the x-ms-pageable extension.",
    valueMissing:
      "Response body schema of pageable response should contain top-level array property `value`",
    valueNotArray: "`value` property in pageable response should be type: array",
    valueRequired: "`value` property in pageable response should be required",
    nextLinkMissing:
      paramMessage`Response body schema of pageable response should contain top-level property \`${"name"}\``,
    nextLinkNotString:
      paramMessage`\`${"name"}\` property in pageable response should be type: string`,
    nextLinkRequired:
      paramMessage`\`${"name"}\` property in pageable response should be optional.`,
  },
  create(context) {
    return {
      operation: (operation) => {
        if (resolveProviderNamespace(context.program, operation.namespace) !== undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" && httpOperation.verb !== "post") {
          return;
        }

        const responseModel = getSuccessResponseModel(httpOperation.responses);
        if (responseModel === undefined) {
          return;
        }

        const pageableExtension = getExtensions(context.program, operation).get("x-ms-pageable");
        const [pagingOperation] = getPagingOperation(context.program, operation);
        if (pageableExtension === undefined) {
          if (pagingOperation !== undefined) {
            return;
          }

          if (mightBePageableResponse(responseModel)) {
            context.reportDiagnostic({
              target: operation,
              messageId: "missingPageable",
            });
          }
          return;
        }

        const valueProperty = getInheritedProperty(responseModel, "value");
        if (valueProperty === undefined) {
          context.reportDiagnostic({
            target: responseModel,
            messageId: "valueMissing",
          });
        } else {
          if (!isArrayProperty(valueProperty)) {
            context.reportDiagnostic({
              target: valueProperty,
              messageId: "valueNotArray",
            });
          }
          if (valueProperty.optional) {
            context.reportDiagnostic({
              target: valueProperty,
              messageId: "valueRequired",
            });
          }
        }

        const nextLinkName = resolveNextLinkName(pageableExtension);
        const nextLinkProperty = getInheritedProperty(responseModel, nextLinkName);
        if (nextLinkProperty === undefined) {
          context.reportDiagnostic({
            target: responseModel,
            messageId: "nextLinkMissing",
            format: {
              name: nextLinkName,
            },
          });
          return;
        }

        if (!isStringType(context.program, nextLinkProperty.type)) {
          context.reportDiagnostic({
            target: nextLinkProperty,
            messageId: "nextLinkNotString",
            format: {
              name: nextLinkName,
            },
          });
        }
        if (!nextLinkProperty.optional) {
          context.reportDiagnostic({
            target: nextLinkProperty,
            messageId: "nextLinkRequired",
            format: {
              name: nextLinkName,
            },
          });
        }
      },
    };
  },
});

function getSuccessResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  for (const response of responses) {
    if (!isSuccessStatusCode(response.statusCodes)) {
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

function isSuccessStatusCode(statusCode: HttpOperationResponse["statusCodes"]): boolean {
  return typeof statusCode === "number" && statusCode >= 200 && statusCode < 300;
}

function mightBePageableResponse(responseModel: Model): boolean {
  const properties = [...walkPropertiesInherited(responseModel)];
  return properties.length > 0 && properties.length <= 3 && properties.some(isArrayProperty);
}

function isArrayProperty(property: ModelProperty): boolean {
  return property.type.kind === "Model" && isArrayModelType(property.type);
}

function getInheritedProperty(model: Model, name: string): ModelProperty | undefined {
  for (const property of walkPropertiesInherited(model)) {
    if (property.name === name) {
      return property;
    }
  }

  return undefined;
}

function resolveNextLinkName(pageableExtension: unknown): string {
  if (typeof pageableExtension !== "object" || pageableExtension === null) {
    return "nextLink";
  }

  const nextLinkName = (pageableExtension as { nextLinkName?: unknown }).nextLinkName;
  return typeof nextLinkName === "string" && nextLinkName.length > 0
    ? nextLinkName
    : "nextLink";
}
