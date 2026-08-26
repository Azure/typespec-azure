import { resolveProviderNamespace } from "@azure-tools/typespec-azure-resource-manager";
import { createRule, isArrayModelType, type Model, type ModelProperty } from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";

export const getCollectionOnlyHasValueAndNextLinkRule = createRule({
  name: "get-collection-only-has-value-and-next-link",
  description:
    "ARM collection GET response models must declare only the `value` and `nextLink` properties.",
  severity: "warning",
  messages: {
    default:
      "Get endpoints for collections of resources must only have the `value` and `nextLink` properties in their model.",
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

        const responseModel = get200ResponseModel(httpOperation.responses);
        if (responseModel === undefined) {
          return;
        }

        const invalidTarget = getInvalidTarget(responseModel);
        if (invalidTarget === undefined) {
          return;
        }

        context.reportDiagnostic({
          target: invalidTarget,
        });
      },
    };
  },
});

function isCollectionGetPath(path: string): boolean {
  if (path.endsWith("}") || path.endsWith("/operations") || path.endsWith("/default")) {
    return false;
  }

  const providerTail = path.split(".").at(-1);
  return (
    providerTail !== undefined &&
    providerTail.includes("/") &&
    providerTail.split("/").length % 2 === 0
  );
}

function get200ResponseModel(responses: HttpOperationResponse[]): Model | undefined {
  for (const response of responses) {
    if (response.statusCodes !== 200) {
      continue;
    }

    for (const content of response.responses) {
      const body = content.body;
      if (body?.type.kind !== "Model") {
        continue;
      }

      if (
        isArrayModelType(body.type) ||
        (body.property?.type.kind === "Model" && isArrayModelType(body.property.type))
      ) {
        continue;
      }

      return body.type;
    }
  }

  return undefined;
}

function getInvalidTarget(responseModel: Model): Model | ModelProperty | undefined {
  if (isArrayModelType(responseModel)) {
    return undefined;
  }

  const properties = [...responseModel.properties.values()];
  if (
    properties.length === 2 &&
    properties.every((property) => property.name === "value" || property.name === "nextLink")
  ) {
    return undefined;
  }

  return (
    properties.find((property) => property.name !== "value" && property.name !== "nextLink") ??
    responseModel
  );
}
