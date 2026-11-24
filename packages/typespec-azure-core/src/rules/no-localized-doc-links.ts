import {
  createRule,
  fileRef,
  getDoc,
  getErrorsDoc,
  getReturnsDoc,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { SyntaxKind, type Node } from "@typespec/compiler/ast";
import { getDocDiagnosticTarget } from "./doc-source.js";

const localizedDocLink = /https:\/\/docs\.microsoft\.com\/\w+-\w+\/azure\//;

export const noLocalizedDocLinksRule = createRule({
  name: "no-localized-doc-links",
  docs: fileRef.fromPackageRoot("src/rules/no-localized-doc-links.md"),
  description: "Documentation links must not force a locale.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/no-localized-doc-links",
  messages: {
    default: "Remove the locale from the Microsoft documentation link.",
  },
  create(context) {
    const reported = new Map<object, Set<object>>();

    function reportOnce(target: Type, diagnosticTarget: Type | Node = target) {
      const location = diagnosticTarget === target ? (target.node ?? target) : diagnosticTarget;
      const source = target.node ?? target;
      let sources = reported.get(location);
      if (!sources) {
        sources = new Set();
        reported.set(location, sources);
      }
      if (!sources.has(source)) {
        sources.add(source);
        context.reportDiagnostic({ target: diagnosticTarget });
      }
    }

    function checkDoc(target: Type) {
      const doc = getDoc(context.program, target);
      if (!doc || !localizedDocLink.test(doc)) {
        return;
      }

      const location = getDocDiagnosticTarget(context.program, target, doc);
      if (location) reportOnce(location.source, location.diagnosticTarget);
    }

    function checkOperation(operation: Operation) {
      if (operation.sourceOperation) {
        for (const parameter of operation.parameters.properties.values()) {
          const doc = getDoc(context.program, parameter);
          if (doc && localizedDocLink.test(doc)) {
            for (
              let owner: Operation | undefined = operation;
              owner;
              owner = owner.sourceOperation
            ) {
              const hasOwnParamDoc = owner.node?.docs?.some((comment) =>
                comment.tags.some(
                  (tag) =>
                    tag.kind === SyntaxKind.DocParamTag &&
                    tag.paramName.sv === parameter.name &&
                    localizedDocLink.test(tag.content.map((part) => part.text).join("")),
                ),
              );
              if (hasOwnParamDoc && owner.node) {
                reportOnce(owner, owner.node);
                break;
              }
            }
          }
        }
      }
      const docs = [
        getDoc(context.program, operation),
        getReturnsDoc(context.program, operation),
        getErrorsDoc(context.program, operation),
      ];
      if (docs.some((doc) => doc !== undefined && localizedDocLink.test(doc))) {
        reportOnce(operation);
      }
    }

    return {
      namespace: checkDoc,
      interface: checkDoc,
      operation: checkOperation,
      model: checkDoc,
      modelProperty: checkDoc,
      scalar: checkDoc,
      enum: checkDoc,
      enumMember: checkDoc,
      union: checkDoc,
      unionVariant: checkDoc,
    };
  },
});
