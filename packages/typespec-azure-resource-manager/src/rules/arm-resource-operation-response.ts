import {
  type DiagnosticMessages,
  type LinterRuleContext,
  type Model,
  type Operation,
  createRule,
  fileRef,
  getDiscriminator,
  getEffectiveModelType,
  getProperty,
  getTypeName,
  isArrayModelType,
  isVoidType,
  paramMessage,
} from "@typespec/compiler";
import { createMetadataInfo, getHttpOperation, resolveRequestVisibility } from "@typespec/http";

import { getArmResourceOperationList } from "../operations.js";
import { getArmResource } from "../resource.js";
import { isInternalTypeSpec } from "./utils.js";

export const armResourceOperationsRule = createRule({
  name: "arm-resource-operation-response",
  docs: fileRef.fromPackageRoot("src/rules/arm-resource-operation-response.md"),
  severity: "warning",
  description:
    "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema, and PUT input must match the resource.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-operation-response",
  messages: {
    default: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    missingRequest: "ARM PUT operations must have a request body.",
    requestMismatch: paramMessage`PUT request body must use resource model ${"resource"}. Found ${"request"}.`,
  },
  create(context) {
    const metadata = createMetadataInfo(context.program);
    return {
      model: (model: Model) => {
        if (!isInternalTypeSpec(context.program, model)) {
          const armResource = getArmResource(context.program, model);
          if (armResource) {
            const checkedOperations = new Set<Operation>();
            for (const { kind, operation } of getArmResourceOperationList(context.program, model)) {
              if (
                (kind !== "read" &&
                  kind !== "createOrUpdate" &&
                  kind !== "update" &&
                  kind !== "list") ||
                isInternalTypeSpec(context.program, operation) ||
                checkedOperations.has(operation)
              ) {
                continue;
              }
              checkedOperations.add(operation);
              if (kind === "createOrUpdate") {
                const [httpOperation] = getHttpOperation(context.program, operation);
                if (httpOperation.verb === "put") {
                  const body = httpOperation.parameters.body;
                  if (body === undefined || isVoidType(body.type)) {
                    context.reportDiagnostic({ target: operation, messageId: "missingRequest" });
                  } else if (body.bodyKind === "single") {
                    const request = metadata.getEffectivePayloadType(
                      body.type,
                      resolveRequestVisibility(context.program, operation, httpOperation.verb),
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
              checkArmResourceOperationReturnType(context, model, operation, kind === "list");
            }
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
) {
  if (isInternalTypeSpec(context.program, operation)) return;
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
        return;
      }
    }
  }

  function isDiscriminatedAncestor(ancestor: Model, descendant: Model): boolean {
    if (getDiscriminator(program, ancestor) === undefined) return false;
    for (let base = descendant.baseModel; base; base = base.baseModel) {
      if (base === ancestor) return true;
    }
    return false;
  }
}
