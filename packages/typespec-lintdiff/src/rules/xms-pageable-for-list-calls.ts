import {
  createRule,
  getPagingOperation,
  isArrayModelType,
  type Model,
  type ModelProperty,
} from "@typespec/compiler";
import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";

export const xmsPageableForListCallsRule = createRule({
  name: "xms-pageable-for-list-calls",
  description:
    "ARM list-shaped GET operations that bypass templates must declare pageable metadata.",
  severity: "warning",
  messages: {
    default:
      "ARM GET operations on list paths that return collection payloads should define x-ms-pageable metadata.",
  },
  create(context) {
    return {
      operation: (operation) => {
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (resolveProviderNamespace(context.program, namespace) === undefined) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "get" || !isCollectionGetPath(httpOperation.path)) {
          return;
        }

        if (getExtensions(context.program, operation).has("x-ms-pageable")) {
          return;
        }

        const [pagingOperation] = getPagingOperation(context.program, operation);
        if (pagingOperation !== undefined) {
          return;
        }

        const responseModel = get200ResponseModel(httpOperation.responses);
        if (responseModel === undefined || !hasArrayValueProperty(responseModel)) {
          return;
        }

        context.reportDiagnostic({
          target: operation,
        });
      },
    };
  },
});

function isCollectionGetPath(path: string): boolean {
  if (path.endsWith("}") || path.endsWith("/operations") || path.endsWith("/default")) {
    return false;
  }

  return path.split("/").length % 2 === 0;
}

function get200ResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  for (const response of responses) {
    if (response.statusCodes !== 200) {
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

function hasArrayValueProperty(model: Model): boolean {
  const valueProperty = model.properties.get("value");
  return valueProperty !== undefined && isArrayValueProperty(valueProperty);
}

function isArrayValueProperty(property: ModelProperty): boolean {
  return property.type.kind === "Model" && isArrayModelType(property.type);
}
