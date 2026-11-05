import {
  createRule,
  fileRef,
  getLocationContext,
  isTemplateDeclarationOrInstance,
  type Model,
  type Program,
  type Type,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { getExtensions } from "@typespec/openapi";
import { getArmProviderNamespace } from "../namespace.js";
import { isAzureResource } from "../private.decorators.js";
import { getCustomResourceOptions } from "../resource.js";
import { containsStatusCode } from "./http-response-utils.js";
import { isTemplatedInterfaceOperation } from "./utils.js";

export const armPutResponseResourceRule = createRule({
  name: "arm-put-response-resource",
  description: "ARM PUT success responses must return a model marked as an Azure resource.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-put-response-resource",
  docs: fileRef.fromPackageRoot("src/rules/arm-put-response-resource.md"),
  messages: {
    default: "ARM PUT operations must return an Azure resource model in their 200 or 201 response.",
  },
  create(context) {
    return {
      operation(operation) {
        const program = context.program;
        if (
          isTemplateDeclarationOrInstance(operation) ||
          isTemplatedInterfaceOperation(operation) ||
          getLocationContext(program, operation).type !== "project" ||
          operation.namespace === undefined ||
          getArmProviderNamespace(program, operation.namespace) === undefined
        ) {
          return;
        }

        const [httpOperation] = getHttpOperation(program, operation);
        if (httpOperation.verb !== "put") return;

        for (const status of [200, 201]) {
          const bodies = httpOperation.responses
            .filter((response) => containsStatusCode(response.statusCodes, status))
            .flatMap((response) => response.responses.flatMap(({ body }) => (body ? [body] : [])));
          if (bodies.length === 0) continue;

          if (bodies.some((body) => !hasResourceMarker(program, body.type))) {
            context.reportDiagnostic({ target: operation });
          }
          return;
        }
      },
    };
  },
});

function hasResourceMarker(program: Program, type: Type): boolean {
  if (type.kind !== "Model") return false;
  for (let model: Model | undefined = type; model; model = model.baseModel) {
    const extensions = getExtensions(program, model);
    const marker = extensions.has("x-ms-azure-resource")
      ? extensions.get("x-ms-azure-resource")
      : isAzureResource(program, model) ||
        getCustomResourceOptions(program, model)?.isAzureResource === true;
    if (marker) return true;
  }
  return false;
}
