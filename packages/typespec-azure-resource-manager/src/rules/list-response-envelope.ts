import {
  type Interface,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  createRule,
  fileRef,
  getLocationContext,
  isArrayModelType,
} from "@typespec/compiler";
import { type HttpOperationResponse, getHttpOperation } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  description:
    "ARM collection GET response models must declare only the `value` and `nextLink` properties.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope",
  messages: {
    default:
      "Collection GET response models must declare exactly the `value` and `nextLink` properties.",
  },
  create(context) {
    return {
      operation: (operation) => {
        if (
          operation.namespace === undefined ||
          getArmProviderNamespace(context.program, operation.namespace) === undefined
        ) {
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

        for (const invalidTarget of getInvalidTargets(responseModel)) {
          context.reportDiagnostic({
            target: getDiagnosticTarget(context.program, operation, invalidTarget),
          });
        }
      },
    };
  },
});

function isCollectionGetPath(path: string): boolean {
  const pathWithoutQuery = path.split("?")[0];
  if (pathWithoutQuery.endsWith("}") || path.endsWith("operations") || path.endsWith("default")) {
    return false;
  }

  const providerTail = pathWithoutQuery.split(".").at(-1);
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
      if (body?.bodyKind !== "single" || body.type.kind !== "Model") {
        continue;
      }

      const bodyModel = body.property?.type.kind === "Model" ? body.property.type : body.type;
      if (isArrayModelType(bodyModel) || bodyModel.properties.size === 0) {
        continue;
      }

      return bodyModel;
    }
  }

  return undefined;
}

function getInvalidTargets(responseModel: Model): (Model | ModelProperty)[] {
  const invalidTargets: ModelProperty[] = [];
  let hasValue = false;
  let hasNextLink = false;

  for (const property of responseModel.properties.values()) {
    if (property.name === "value") {
      hasValue = true;
    } else if (property.name === "nextLink") {
      hasNextLink = true;
    } else {
      invalidTargets.push(property);
    }
  }

  return invalidTargets.length === 0 && (!hasValue || !hasNextLink)
    ? [responseModel]
    : invalidTargets;
}

function getDiagnosticTarget(
  program: Program,
  operation: Operation,
  invalidTarget: Model | ModelProperty,
): Interface | Operation | Model | ModelProperty {
  if (getLocationContext(program, invalidTarget).type === "project") {
    return invalidTarget;
  }

  if (getLocationContext(program, operation).type === "project") {
    return operation;
  }

  return operation.interface ?? operation;
}
