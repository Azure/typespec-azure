import { createRule, fileRef, type Type } from "@typespec/compiler";
import type { Node } from "@typespec/compiler/ast";
import { createTCGCContext } from "../context.js";
import {
  clientNameKey,
  getClientNameApplications,
  getScopedDecoratorDataScopes,
  parseScopes,
} from "../internal-utils.js";
import {
  getClientFriendlyNameTemplate,
  getLibraryName,
  isExactClientName,
} from "../public-utils.js";

export const noRedundantClientNameRule = createRule({
  name: "no-redundant-client-name",
  description: "Avoid client name overrides that do not change SDK naming.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/typespec-client-generator-core/rules/no-redundant-client-name",
  docs: fileRef.fromPackageRoot("src/rules/no-redundant-client-name.md"),
  messages: {
    default: "This @clientName override does not change SDK naming. Remove the override.",
  },
  create(context) {
    const tcgcContext = createTCGCContext(
      context.program,
      "@azure-tools/typespec-client-generator-core",
      { mutateNamespace: false },
    );
    // Friendly-name templates can depend on client names on other declarations.
    const scopes = getScopedDecoratorDataScopes(tcgcContext, clientNameKey);
    const redundant = new Map<Node, boolean>();

    function getScopes(applications: ReturnType<typeof getClientNameApplications>) {
      const propertyScopes = new Set(scopes);
      for (const { scope } of applications) {
        const [negatives = [], positives = []] = parseScopes(scope);
        for (const name of [...negatives, ...positives]) propertyScopes.add(name);
      }
      return propertyScopes;
    }

    function checkDependent(type: Type & { name?: string | symbol }) {
      const template = getClientFriendlyNameTemplate(context.program, type);
      if (template?.source.kind !== "ModelProperty") return;
      const applications = getClientNameApplications(template.source);
      const sourceScopes = getScopes(applications);
      for (const { application } of applications) {
        if (
          application.node &&
          [...sourceScopes].some(
            (scope) =>
              getLibraryName(tcgcContext, type, scope) !==
              getLibraryName(tcgcContext, type, scope, application),
          )
        ) {
          redundant.set(application.node, false);
        }
      }
    }

    return {
      namespace: checkDependent,
      interface: checkDependent,
      operation: checkDependent,
      model: checkDependent,
      scalar: checkDependent,
      enum: checkDependent,
      enumMember: checkDependent,
      union: checkDependent,
      unionVariant: checkDependent,
      modelProperty(property) {
        checkDependent(property);
        const applications = getClientNameApplications(property);
        const propertyScopes = getScopes(applications);
        for (const { application } of applications) {
          if (!application.node) continue;
          const noEffect = [...propertyScopes].every(
            (scope) =>
              getLibraryName(tcgcContext, property, scope) ===
                getLibraryName(tcgcContext, property, scope, application) &&
              isExactClientName(tcgcContext, property, scope) ===
                isExactClientName(tcgcContext, property, scope, application),
          );
          // A copied or template-authored application is removable only if all its uses agree.
          redundant.set(application.node, (redundant.get(application.node) ?? true) && noEffect);
        }
      },
      exitNamespace(namespace) {
        if (namespace !== context.program.getGlobalNamespaceType()) return;
        for (const [target, noEffect] of redundant) {
          if (noEffect) context.reportDiagnostic({ target });
        }
      },
    };
  },
});
