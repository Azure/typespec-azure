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
import { containsStatusCode } from "./http-response-utils.js";

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
    correspondingNextLink: paramMessage`Include '${"name"}' as a body property in the selected paging response.`,
  },
  create(context) {
    const metadata = createMetadataInfo(context.program);
    return {
      operation: (operation) => {
        const [httpOperation] = getHttpOperation(context.program, operation);
        const arm =
          operation.namespace !== undefined &&
          getArmProviderNamespace(context.program, operation.namespace) !== undefined;
        const collection =
          arm && httpOperation.verb === "get" && isCollectionGetPath(httpOperation.path);
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
              const invalidValue = getInvalidValueTarget(
                operation,
                body.type,
                metadata,
                body.bodyKind === "single" && body.isExplicit,
              );
              if (invalidValue !== undefined) {
                context.reportDiagnostic({
                  target: getDiagnosticTarget(context.program, operation, invalidValue),
                  messageId: "valueArray",
                });
                return;
              }
              if (body.type.kind === "Model") {
                const invalidTargets = getInvalidTargets(
                  body.type,
                  metadata,
                  body.bodyKind === "single" && body.isExplicit,
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
          if (arm && paging?.output.nextLink !== undefined) {
            const response = selectPagingResponse(httpOperation.responses);
            const name = paging.output.nextLink.property.name;
            for (const { body } of response?.responses ?? []) {
              if (body?.bodyKind !== "single") continue;
              const property =
                body.type.kind === "Model" ? getProperty(body.type, name) : undefined;
              if (
                property !== undefined &&
                metadata.isPayloadProperty(property, Visibility.Read, body.isExplicit)
              ) {
                continue;
              }
              const declaredProperty =
                response?.type.kind === "Model" ? getProperty(response.type, name) : undefined;
              context.reportDiagnostic({
                target: getDiagnosticTarget(
                  context.program,
                  operation,
                  property ??
                    declaredProperty ??
                    (body.type.kind === "Model" ? body.type : operation),
                ),
                messageId: "correspondingNextLink",
                format: { name },
              });
            }
          }
          return;
        }

        const responseBody = get200ResponseBody(httpOperation.responses);
        if (responseBody === undefined || responseBody.type.kind !== "Model") {
          return;
        }
        const responseModel = responseBody.type;
        const value = getProperty(responseModel, "value");
        if (
          value !== undefined &&
          metadata.isPayloadProperty(value, Visibility.Read, responseBody.isExplicit) &&
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
          metadata,
          responseBody.isExplicit,
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

function selectPagingResponse(
  responses: HttpOperationResponse[],
): HttpOperationResponse | undefined {
  // Numeric success statuses take precedence over ranges and are ordered by status,
  // not by the operation's source union order. Select before inspecting bodies.
  const numeric = responses
    .filter(
      (response) =>
        typeof response.statusCodes === "number" &&
        response.statusCodes >= 200 &&
        response.statusCodes < 300,
    )
    .sort((a, b) => Number(a.statusCodes) - Number(b.statusCodes))[0];
  return (
    numeric ??
    responses.find(
      (response) =>
        containsStatusCode(response.statusCodes, 200) &&
        containsStatusCode(response.statusCodes, 299),
    ) ??
    responses.find((response) => response.statusCodes === "*")
  );
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
  metadata: MetadataInfo,
  inExplicitBody: boolean,
): (Model | ModelProperty)[] {
  const invalidTargets: ModelProperty[] = [];
  let hasValue = false;
  let hasNextLink = false;

  for (const property of walkPropertiesInherited(responseModel)) {
    if (!metadata.isPayloadProperty(property, Visibility.Read, inExplicitBody)) continue;
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
  metadata: MetadataInfo,
  inExplicitBody: boolean,
): Model | ModelProperty | Operation | undefined {
  if (type.kind !== "Model") return operation;
  const value = getProperty(type, "value");
  if (value === undefined || !metadata.isPayloadProperty(value, Visibility.Read, inExplicitBody))
    return type;
  return value.type.kind === "Model" && isArrayModelType(value.type) ? undefined : value;
}
