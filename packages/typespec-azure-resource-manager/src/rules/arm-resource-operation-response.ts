import {
  createRule,
  fileRef,
  getDiscriminator,
  getEffectiveModelType,
  getLocationContext,
  getProperty,
  getTypeName,
  isArrayModelType,
  isVoidType,
  paramMessage,
  type DiagnosticMessages,
  type LinterRuleContext,
  type Model,
  type Operation,
  type Program,
  type Type,
} from "@typespec/compiler";
import { createMetadataInfo, getHttpOperation, resolveRequestVisibility } from "@typespec/http";

import { getArmProviderNamespace } from "../namespace.js";
import { getArmResourceOperationList, type ArmResourceOperation } from "../operations.js";
import { isAzureResource } from "../private.decorators.js";
import { getArmResource, isCustomAzureResource, resolveArmResources } from "../resource.js";
import { containsStatusCode } from "./http-response-utils.js";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceOperationsRule = createRule({
  name: "arm-resource-operation-response",
  docs: fileRef.fromPackageRoot("src/rules/arm-resource-operation-response.md"),
  severity: "warning",
  description:
    "[RPC 008]: Resource operations must use consistent resource schemas, and ARM PUT success responses must return a resource model.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-response",
  messages: {
    default: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    missingRequest: "ARM PUT operations must have a request body.",
    requestMismatch: paramMessage`PUT request body must use resource model ${"resource"}. Found ${"request"}.`,
    nonResourceResponse: "ARM PUT success responses must return a resource model.",
  },
  create(context) {
    const metadata = createMetadataInfo(context.program);
    const responseFailures = new Set<Operation>();
    return {
      model(model) {
        const program = context.program;
        if (isInternalTypeSpec(program, model) || !getArmResource(program, model)) return;
        const checkedOperations = new Set<Operation>();
        for (const { kind, operation } of getArmResourceOperationList(program, model)) {
          if (
            (kind !== "read" &&
              kind !== "createOrUpdate" &&
              kind !== "update" &&
              kind !== "list") ||
            isInternalTypeSpec(program, operation) ||
            checkedOperations.has(operation)
          ) {
            continue;
          }
          checkedOperations.add(operation);
          if (kind === "createOrUpdate") {
            const [httpOperation] = getHttpOperation(program, operation);
            if (httpOperation.verb === "put") {
              const body = httpOperation.parameters.body;
              if (body === undefined || isVoidType(body.type)) {
                context.reportDiagnostic({ target: operation, messageId: "missingRequest" });
              } else if (body.bodyKind === "single") {
                const request = metadata.getEffectivePayloadType(
                  body.type,
                  resolveRequestVisibility(program, operation, httpOperation.verb),
                );
                if (request !== model) {
                  context.reportDiagnostic({
                    target: operation,
                    messageId: "requestMismatch",
                    format: { resource: getTypeName(model), request: getTypeName(request) },
                  });
                }
              }
            }
          }
          if (!checkArmResourceOperationReturnType(context, model, operation, kind === "list")) {
            responseFailures.add(operation);
          }
        }
      },
      exitNamespace(namespace) {
        if (namespace !== context.program.getGlobalNamespaceType()) return;
        // Canonical comparisons run first so the same response is not diagnosed twice.
        const program = context.program;
        const provider = resolveArmResources(program);
        const operations: ArmResourceOperation[] = [
          ...(provider.resources ?? []).flatMap((resource) => [
            ...Object.values(resource.operations.lifecycle).flat(),
            ...resource.operations.lists,
            ...resource.operations.actions,
            ...(resource.associatedOperations ?? []),
          ]),
          ...(provider.providerOperations ?? []),
        ];
        const checkedPuts = new Set<Operation>();
        for (const { operation, httpOperation } of operations) {
          if (
            httpOperation.verb !== "put" ||
            checkedPuts.has(operation) ||
            responseFailures.has(operation) ||
            getLocationContext(program, operation).type !== "project" ||
            operation.namespace === undefined ||
            getArmProviderNamespace(program, operation.namespace) === undefined
          ) {
            continue;
          }
          checkedPuts.add(operation);
          for (const status of [200, 201]) {
            const bodies = httpOperation.responses
              .filter((response) => containsStatusCode(response.statusCodes, status))
              .flatMap((response) =>
                response.responses.flatMap(({ body }) =>
                  body && !isVoidType(body.type) ? [body] : [],
                ),
              );
            if (bodies.length === 0) continue;
            if (bodies.some((body) => !isResourceModel(program, body.type))) {
              context.reportDiagnostic({ target: operation, messageId: "nonResourceResponse" });
            }
            break;
          }
        }
      },
    };
  },
});

function checkArmResourceOperationReturnType(
  context: LinterRuleContext<DiagnosticMessages>,
  model: Model,
  operation: Operation,
  list = false,
): boolean {
  const program = context.program;
  const [httpOperation] = getHttpOperation(program, operation);
  for (const response of httpOperation.responses) {
    const status = response.statusCodes;
    if (
      status === "*" ||
      (typeof status === "number"
        ? status < 200 || status >= 300
        : status.end < 200 || status.start >= 300)
    ) {
      continue;
    }
    for (const { body } of response.responses) {
      if (body === undefined || isVoidType(body.type)) continue;
      let payload = body.type;
      if (list && payload.kind === "Model") {
        const items = isArrayModelType(payload) ? payload : getProperty(payload, "value")?.type;
        if (items?.kind === "Model" && isArrayModelType(items)) {
          payload = items.indexer.value;
        }
      }
      const candidate =
        payload.kind === "Model" ? getEffectiveModelType(program, payload) : undefined;
      if (
        candidate !== model &&
        (candidate === undefined ||
          (!isDiscriminatedAncestor(model, candidate) &&
            !isDiscriminatedAncestor(candidate, model)))
      ) {
        context.reportDiagnostic({ target: operation });
        return false;
      }
    }
  }
  return true;

  function isDiscriminatedAncestor(ancestor: Model, descendant: Model): boolean {
    if (getDiscriminator(program, ancestor) === undefined) return false;
    for (let base = descendant.baseModel; base; base = base.baseModel) {
      if (base === ancestor) return true;
    }
    return false;
  }
}

function isResourceModel(program: Program, type: Type): boolean {
  if (type.kind !== "Model") return false;
  for (
    let model: Model | undefined = getEffectiveModelType(program, type);
    model;
    model = model.baseModel
  ) {
    if (
      getArmResource(program, model) !== undefined ||
      isAzureResource(program, model) ||
      isCustomAzureResource(program, model)
    ) {
      return true;
    }
  }
  return false;
}
