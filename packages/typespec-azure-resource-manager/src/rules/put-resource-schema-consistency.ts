import {
  createRule,
  fileRef,
  getLocationContext,
  getTypeName,
  isTemplateDeclarationOrInstance,
  isVoidType,
  paramMessage,
  type Model,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  resolveRequestVisibility,
  Visibility,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import { getArmResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const putResourceSchemaConsistencyRule = createRule({
  name: "put-resource-schema-consistency",
  description:
    "ARM PUT operations must have a request body and reuse a registered ARM resource model.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/put-resource-schema-consistency",
  docs: fileRef.fromPackageRoot("src/rules/put-resource-schema-consistency.md"),
  messages: {
    default: paramMessage`PUT bodies must reuse the same resource model. Found ${"bodies"}.`,
    missingRequest: "ARM PUT operations must have a request body.",
    unregistered: paramMessage`PUT bodies must use registered ARM resource models. Found ${"bodies"}.`,
  },
  create(context) {
    const metadata = createMetadataInfo(context.program);

    function getResourceModel(body: HttpPayloadBody | undefined, visibility: Visibility) {
      if (body?.bodyKind !== "single") return undefined;
      const type = metadata.getEffectivePayloadType(body.type, visibility);
      if (type.kind !== "Model" || type.name === "") return undefined;
      for (let model: Model | undefined = type; model !== undefined; model = model.baseModel) {
        if (model.indexer !== undefined) return undefined;
      }
      return type;
    }

    return {
      operation(operation) {
        if (
          isInternalTypeSpec(context.program, operation) ||
          getLocationContext(context.program, operation).type !== "project" ||
          isTemplateDeclarationOrInstance(operation) ||
          (operation.interface !== undefined &&
            isTemplateDeclarationOrInstance(operation.interface))
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        if (httpOperation.verb !== "put") return;

        const requestBody = httpOperation.parameters.body;
        if (requestBody === undefined || isVoidType(requestBody.type)) {
          context.reportDiagnostic({ target: operation, messageId: "missingRequest" });
          return;
        }

        const bodies: { label: string; model: Model }[] = [];
        const request = getResourceModel(
          requestBody,
          resolveRequestVisibility(context.program, operation, httpOperation.verb),
        );
        if (request !== undefined) bodies.push({ label: "request", model: request });

        for (const status of [200, 201]) {
          const response = httpOperation.responses.find(
            (response) => response.statusCodes === status,
          );
          if (response === undefined) continue;
          const model = getResourceModel(getUnambiguousBody(response), Visibility.Read);
          if (model !== undefined) bodies.push({ label: `${status} response`, model });
        }

        if (bodies.some((body) => body.model !== bodies[0].model)) {
          context.reportDiagnostic({
            target: operation,
            format: {
              bodies: bodies
                .map(({ label, model }) => `${label}: ${getTypeName(model)}`)
                .join("; "),
            },
          });
          return;
        }

        const unregistered = bodies.filter(
          ({ model }) => getArmResource(context.program, model) === undefined,
        );
        if (unregistered.length > 0) {
          context.reportDiagnostic({
            target: operation,
            messageId: "unregistered",
            format: {
              bodies: unregistered
                .map(({ label, model }) => `${label}: ${getTypeName(model)}`)
                .join("; "),
            },
          });
        }
      },
    };
  },
});

function getUnambiguousBody(response: HttpOperationResponse): HttpPayloadBody | undefined {
  let body: HttpPayloadBody | undefined;
  for (const content of response.responses) {
    if (content.body === undefined || isVoidType(content.body.type)) continue;
    // Do not choose an arbitrary variant or infer equality for an ambiguous status.
    if (
      body !== undefined &&
      (body.type !== content.body.type || body.bodyKind !== content.body.bodyKind)
    ) {
      return undefined;
    }
    body = content.body;
  }
  return body;
}
