import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import {
  createRule,
  fileRef,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  listServices,
} from "@typespec/compiler";
import { getHttpOperation, type HttpOperationResponse } from "@typespec/http";
import { isArmCollectionAction } from "../operations.js";

const pollingStatusCodes = new Set([200, 201, 202, 204]);
const pollingHeaders = new Set(["location", "azure-asyncoperation"]);
const pollingVerbs = new Set(["put", "patch", "post", "delete"]);

export const lroMissingPollingMetadataRule = createRule({
  name: "lro-missing-polling-metadata",
  docs: fileRef.fromPackageRoot("src/rules/lro-missing-polling-metadata.md"),
  description:
    "ARM operations indicating asynchronous processing must have native polling metadata.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/lro-missing-polling-metadata",
  messages: {
    default:
      "ARM operations indicating asynchronous processing must have native polling metadata. Use an asynchronous ARM template or preserve supported semantic LRO headers.",
  },
  create(context) {
    const serviceNamespaces = new Set(listServices(context.program).map((service) => service.type));
    return {
      operation(operation) {
        const container = operation.interface ?? operation.namespace;
        if (
          isTemplateDeclarationOrInstance(operation) ||
          !container ||
          container.operations.get(operation.name) !== operation ||
          (operation.interface &&
            (isTemplateDeclaration(operation.interface) ||
              operation.interface.namespace?.interfaces.get(operation.interface.name) !==
                operation.interface))
        ) {
          return;
        }

        let namespace = operation.namespace;
        while (namespace && !serviceNamespaces.has(namespace)) {
          namespace = namespace.namespace;
        }
        if (!namespace) {
          return;
        }

        const [httpOperation] = getHttpOperation(context.program, operation);
        const requiresAcceptedMetadata =
          httpOperation.verb === "patch" ||
          (httpOperation.verb === "post" && isArmCollectionAction(context.program, operation));
        const hasAcceptedResponse =
          requiresAcceptedMetadata &&
          httpOperation.responses.some((response) => response.statusCodes === 202);
        const hasPollingResponse =
          pollingVerbs.has(httpOperation.verb) && hasPollingHeader(httpOperation.responses);
        if (hasAcceptedResponse || hasPollingResponse) {
          // Metadata resolution can report Core diagnostics even for compliant operations.
          if (getLroMetadata(context.program, operation) === undefined) {
            context.reportDiagnostic({ target: operation });
          }
        }
      },
    };
  },
});

function hasPollingHeader(responses: HttpOperationResponse[]): boolean {
  return responses.some(
    (response) =>
      typeof response.statusCodes === "number" &&
      pollingStatusCodes.has(response.statusCodes) &&
      response.responses.some((content) =>
        Object.keys(content.headers ?? {}).some((name) => pollingHeaders.has(name.toLowerCase())),
      ),
  );
}
