import {
  type Interface,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Type,
  createRule,
  fileRef,
  getLocationContext,
  getPagingOperation,
  getProperty,
  isArrayModelType,
  isList,
  walkPropertiesInherited,
} from "@typespec/compiler";
import {
  type HttpOperationResponse,
  Visibility,
  createMetadataInfo,
  getHttpOperation,
} from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";

export const listResponseEnvelopeRule = createRule({
  name: "list-response-envelope",
  docs: fileRef.fromPackageRoot("src/rules/list-response-envelope.md"),
  description: "ARM list responses must use a value array and the standard nextLink envelope.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/list-response-envelope",
  messages: {
    default:
      "Collection GET response models must declare exactly the `value` and `nextLink` properties.",
    valueArray: "Paged ARM list responses must declare a 'value' property of array type.",
  },
  create(context) {
    const metadataInfo = createMetadataInfo(context.program);
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        const collection =
          operation.namespace !== undefined &&
          getArmProviderNamespace(context.program, operation.namespace) !== undefined &&
          httpOperation.verb === "get" &&
          isCollectionGetPath(httpOperation.path);
        const [paging] = isList(context.program, operation)
          ? getPagingOperation(context.program, operation)
          : [];
        const paged =
          getLocationContext(context.program, operation).type === "project" &&
          paging?.output.nextLink !== undefined;
        if (!collection && !paged) {
          return;
        }

        if (paged) {
          for (const response of httpOperation.responses) {
            if (response.statusCodes !== 200) continue;
            for (const { body } of response.responses) {
              if (body === undefined) continue;
              const invalidValue = getInvalidValueTarget(operation, body.type);
              if (invalidValue !== undefined) {
                context.reportDiagnostic({
                  target: getDiagnosticTarget(context.program, operation, invalidValue),
                  messageId: "valueArray",
                });
                return;
              }
              if (body.type.kind === "Model") {
                const invalidTargets = getInvalidTargets(body.type, (property) =>
                  metadataInfo.isPayloadProperty(
                    property,
                    Visibility.Read,
                    body.bodyKind === "single" &&
                      body.isExplicit &&
                      body.containsMetadataAnnotations,
                  ),
                );
                for (const invalidTarget of invalidTargets) {
                  context.reportDiagnostic({
                    target: getDiagnosticTarget(context.program, operation, invalidTarget),
                  });
                }
                if (invalidTargets.length > 0) return;
              }
            }
          }
          return;
        }

        const responseModel = get200ResponseModel(httpOperation.responses);
        if (responseModel === undefined) {
          return;
        }
        const value = getProperty(responseModel, "value");
        if (value !== undefined && (value.type.kind !== "Model" || !isArrayModelType(value.type))) {
          context.reportDiagnostic({
            target: getDiagnosticTarget(context.program, operation, value),
            messageId: "valueArray",
          });
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

function getInvalidTargets(
  responseModel: Model,
  isPayloadProperty?: (property: ModelProperty) => boolean,
): (Model | ModelProperty)[] {
  const invalidTargets: ModelProperty[] = [];
  let hasValue = false;
  let hasNextLink = false;

  for (const property of walkPropertiesInherited(responseModel)) {
    if (isPayloadProperty && !isPayloadProperty(property)) continue;
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
  invalidTarget: Model | ModelProperty | Operation,
): Interface | Operation | Model | ModelProperty {
  if (getLocationContext(program, invalidTarget).type === "project") {
    return invalidTarget;
  }

  if (getLocationContext(program, operation).type === "project") {
    return operation;
  }

  return operation.interface ?? operation;
}

function getInvalidValueTarget(
  operation: Operation,
  type: Type,
): Model | ModelProperty | Operation | undefined {
  if (type.kind !== "Model") return operation;
  const value = getProperty(type, "value");
  if (value === undefined) return type;
  return value.type.kind === "Model" && isArrayModelType(value.type) ? undefined : value;
}
