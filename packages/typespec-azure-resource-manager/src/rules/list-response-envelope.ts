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
  paramMessage,
  resolveEncodedName,
  walkPropertiesInherited,
} from "@typespec/compiler";
import {
  type HttpOperationBody,
  type HttpOperationResponse,
  type MetadataInfo,
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
    nextLink: paramMessage`Paged ARM list responses must include the '${"name"}' next-link property in the response body.`,
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
        const nextLinkName = paging?.output.nextLink?.property.name;
        const paged =
          getLocationContext(context.program, operation).type === "project" &&
          nextLinkName !== undefined;
        if (!collection && !paged) {
          return;
        }

        if (paged) {
          const response = getPagingResponse(httpOperation.responses);
          for (const { body } of response?.responses ?? []) {
            if (body === undefined) continue;
            const properties =
              body.type.kind === "Model" ? [...walkPropertiesInherited(body.type)] : [];
            for (const contentType of body.contentTypes) {
              const nextLink = properties.find(
                (property) =>
                  resolveEncodedName(context.program, property, contentType) === nextLinkName &&
                  metadataInfo.isPayloadProperty(
                    property,
                    Visibility.All,
                    body.bodyKind === "single" && body.isExplicit,
                  ),
              );
              if (nextLink === undefined) {
                const target =
                  body.type.kind === "Model"
                    ? (getProperty(body.type, nextLinkName) ?? body.type)
                    : operation;
                context.reportDiagnostic({
                  target: getDiagnosticTarget(context.program, operation, target),
                  messageId: "nextLink",
                  format: { name: nextLinkName },
                });
                return;
              }
            }
          }

          for (const response of httpOperation.responses) {
            if (response.statusCodes !== 200) continue;
            for (const { body } of response.responses) {
              if (body === undefined) continue;
              const inExplicitBody = body.bodyKind === "single" && body.isExplicit;
              const invalidValue = getInvalidValueTarget(
                operation,
                body.type,
                metadataInfo,
                inExplicitBody,
              );
              if (invalidValue !== undefined) {
                context.reportDiagnostic({
                  target: getDiagnosticTarget(context.program, operation, invalidValue),
                  messageId: "valueArray",
                });
                return;
              }
              if (body.type.kind === "Model") {
                const invalidTargets = getInvalidTargets(body.type, metadataInfo, inExplicitBody);
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

        const body = get200ResponseBody(httpOperation.responses);
        if (body?.type.kind !== "Model") {
          return;
        }
        const responseModel = body.type;
        const value = getProperty(responseModel, "value");
        if (
          value !== undefined &&
          metadataInfo.isPayloadProperty(value, Visibility.All, body.isExplicit) &&
          (value.type.kind !== "Model" || !isArrayModelType(value.type))
        ) {
          context.reportDiagnostic({
            target: getDiagnosticTarget(context.program, operation, value),
            messageId: "valueArray",
          });
          return;
        }

        for (const invalidTarget of getInvalidTargets(
          responseModel,
          metadataInfo,
          body.isExplicit,
        )) {
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

function getPagingResponse(responses: HttpOperationResponse[]): HttpOperationResponse | undefined {
  const ok = responses.find((response) => response.statusCodes === 200);
  if (ok !== undefined) return ok;

  let success: HttpOperationResponse | undefined;
  let successCode = 300;
  let successRange: HttpOperationResponse | undefined;
  for (const response of responses) {
    const status = response.statusCodes;
    if (typeof status === "number" && status >= 200 && status < successCode) {
      success = response;
      successCode = status;
    } else if (typeof status === "object" && status.start < 300 && status.end >= 200) {
      successRange ??= response;
    }
  }
  return success ?? successRange ?? responses.find((response) => response.statusCodes === "*");
}

function get200ResponseBody(responses: HttpOperationResponse[]): HttpOperationBody | undefined {
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

      return body;
    }
  }

  return undefined;
}

function getInvalidTargets(
  responseModel: Model,
  metadataInfo: MetadataInfo,
  inExplicitBody: boolean,
): (Model | ModelProperty)[] {
  const invalidTargets: ModelProperty[] = [];
  let hasValue = false;
  let hasNextLink = false;

  for (const property of walkPropertiesInherited(responseModel)) {
    // Keep the existing lifecycle policy; only distinguish body properties from HTTP metadata.
    if (!metadataInfo.isPayloadProperty(property, Visibility.All, inExplicitBody)) continue;
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
  metadataInfo: MetadataInfo,
  inExplicitBody: boolean,
): Model | ModelProperty | Operation | undefined {
  if (type.kind !== "Model") return operation;
  const value = getProperty(type, "value");
  if (
    value === undefined ||
    !metadataInfo.isPayloadProperty(value, Visibility.All, inExplicitBody)
  ) {
    return type;
  }
  return value.type.kind === "Model" && isArrayModelType(value.type) ? undefined : value;
}
