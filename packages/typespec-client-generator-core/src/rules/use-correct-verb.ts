import {
  createRule,
  fileRef,
  isTemplateDeclaration,
  isTemplateDeclarationOrInstance,
  listServices,
  paramMessage,
  type Namespace,
} from "@typespec/compiler";
import { getHttpOperation } from "@typespec/http";
import { createTCGCContext } from "../context.js";
import { AllScopes } from "../internal-utils.js";
import { getLibraryName } from "../public-utils.js";

const verbPrefixes = { put: "create", patch: "update", delete: "delete" };

export const useCorrectVerbRule = createRule({
  name: "use-correct-verb",
  description:
    "PUT, PATCH, and DELETE SDK method names should start with 'create', 'update', and 'delete', respectively.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/use-correct-verb",
  docs: fileRef.fromPackageRoot("src/rules/use-correct-verb.md"),
  messages: {
    default: paramMessage`${"verb"} SDK method name '${"operationName"}' should start with '${"prefix"}'. Note: If you have already shipped an SDK on top of this spec, fixing this warning may introduce a breaking change.`,
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    const serviceNamespaces = new Set(listServices(context.program).map((service) => service.type));
    const globalNamespace = context.program.getGlobalNamespaceType();

    return {
      operation: (operation) => {
        if (isTemplateDeclarationOrInstance(operation)) return;
        const container = operation.interface ?? operation.namespace;
        const namespace = operation.interface?.namespace ?? operation.namespace;
        if (!container || !namespace || container.operations.get(operation.name) !== operation) {
          return;
        }
        if (
          operation.interface &&
          (isTemplateDeclaration(operation.interface) ||
            namespace.interfaces.get(operation.interface.name) !== operation.interface)
        ) {
          return;
        }

        // HTTP's implicit global service is nonrecursive, including only direct interfaces.
        let eligible =
          namespace === globalNamespace &&
          (serviceNamespaces.size === 0 || serviceNamespaces.has(globalNamespace));
        for (
          let ancestor: Namespace | undefined = namespace;
          ancestor && ancestor !== globalNamespace;
          ancestor = ancestor.namespace
        ) {
          if (serviceNamespaces.has(ancestor)) {
            eligible = true;
            break;
          }
        }
        if (!eligible) return;

        const [{ verb }] = getHttpOperation(context.program, operation);
        if (verb !== "put" && verb !== "patch" && verb !== "delete") return;
        const prefix = verbPrefixes[verb];
        const operationName = getLibraryName(tcgcContext, operation, AllScopes);
        if (!operationName.toLowerCase().startsWith(prefix)) {
          context.reportDiagnostic({
            target: operation,
            format: { verb: verb.toUpperCase(), operationName, prefix },
          });
        }
      },
    };
  },
});
