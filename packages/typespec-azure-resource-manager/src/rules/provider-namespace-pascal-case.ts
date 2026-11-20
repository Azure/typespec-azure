import { createRule, fileRef, paramMessage, type Program } from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
import { getArmProviderNamespace } from "../namespace.js";

const resourceProviderRegex = /providers\/([\w.]+)/g;
const pascalCaseRegex = /^[A-Z][a-z0-9]+(.([A-Z]{1,3}[a-z0-9]+)+[A-Z]{0,2})+$/;

export const providerNamespacePascalCaseRule = createRule({
  name: "provider-namespace-pascal-case",
  docs: fileRef.fromPackageRoot("src/rules/provider-namespace-pascal-case.md"),
  severity: "warning",
  description: "ARM provider namespaces in paths must use PascalCase.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/provider-namespace-pascal-case",
  messages: {
    default: paramMessage`Provider namespace '${"namespace"}' in path '${"path"}' must use PascalCase.`,
  },
  create(context) {
    return {
      root: (program: Program) => {
        const [services] = getAllHttpServices(program);
        for (const service of services) {
          if (getArmProviderNamespace(program, service.namespace) === undefined) {
            continue;
          }

          const reportedPaths = new Set<string>();
          for (const httpOperation of service.operations) {
            const { path, operation } = httpOperation;
            if (reportedPaths.has(path)) {
              continue;
            }

            const invalidNamespaces = getProviderNamespaces(path).filter(
              (namespace) => !pascalCaseRegex.test(namespace),
            );
            if (invalidNamespaces.length === 0) {
              continue;
            }

            reportedPaths.add(path);
            context.reportDiagnostic({
              target: operation,
              format: {
                namespace: [...new Set(invalidNamespaces)].join(", "),
                path,
              },
            });
          }
        }
      },
    };
  },
});

function getProviderNamespaces(path: string): string[] {
  return Array.from(path.matchAll(resourceProviderRegex), (match) => match[1]);
}
