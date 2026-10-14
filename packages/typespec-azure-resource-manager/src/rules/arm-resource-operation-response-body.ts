import {
  getLocationContext,
  getTypeName,
  isTemplateDeclarationOrInstance,
  isVoidType,
  paramMessage,
  type DiagnosticMessages,
  type LinterRuleContext,
  type Model,
  type Operation,
} from "@typespec/compiler";
import {
  createMetadataInfo,
  getHttpOperation,
  resolveRequestVisibility,
  Visibility,
  type HttpOperationResponse,
  type HttpPayloadBody,
} from "@typespec/http";
import { getResourceOperation } from "@typespec/rest";
import { getArmResourceOperationData } from "../operations.js";
import { getArmResource } from "../resource.js";
import { matchesStatusCode, selectResponseBody } from "./http-response-utils.js";
import { isInternalTypeSpec } from "./utils.js";

export const putBodyMessages = {
  putBody: paramMessage`PUT bodies must reuse the same resource model. Found ${"bodies"}.`,
  missingRequest: "ARM PUT operations must have a request body.",
  unregistered: paramMessage`PUT bodies must use registered ARM resource models. Found ${"bodies"}.`,
};

export function createPutBodyListener(context: LinterRuleContext<DiagnosticMessages>) {
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
    operation(operation: Operation) {
      if (
        isInternalTypeSpec(context.program, operation) ||
        getLocationContext(context.program, operation).type !== "project" ||
        isTemplateDeclarationOrInstance(operation) ||
        (operation.interface !== undefined && isTemplateDeclarationOrInstance(operation.interface))
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
        const response = httpOperation.responses.find(({ statusCodes }) =>
          matchesStatusCode(statusCodes, status),
        );
        if (response === undefined) continue;
        const model = getResourceModel(getUnambiguousBody(response), Visibility.Read);
        if (model !== undefined) bodies.push({ label: `${status} response`, model });
      }

      const resource = getResourceOperation(context.program, operation)?.resourceType;
      // The lifecycle response check already diagnoses a different registered resource.
      if (
        resource !== undefined &&
        getArmResourceOperationData(context.program, operation)?.kind === "createOrUpdate" &&
        bodies.some(
          ({ label, model }) =>
            label !== "request" &&
            model !== resource &&
            getArmResource(context.program, model) !== undefined,
        )
      ) {
        return;
      }
      if (
        resource !== undefined &&
        getArmResource(context.program, resource) !== undefined &&
        request !== undefined &&
        bodies.length === 1 &&
        request !== resource
      ) {
        bodies.push({ label: "resource", model: resource });
      }

      if (bodies.some((body) => body.model !== bodies[0].model)) {
        context.reportDiagnostic({
          target: operation,
          messageId: "putBody",
          format: {
            bodies: bodies.map(({ label, model }) => `${label}: ${getTypeName(model)}`).join("; "),
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
}

function getUnambiguousBody(response: HttpOperationResponse): HttpPayloadBody | undefined {
  const selection = selectResponseBody(
    response.responses.flatMap(({ body }) =>
      body === undefined || isVoidType(body.type) ? [] : [body],
    ),
  );
  return selection.kind === "body" ? selection.body : undefined;
}
