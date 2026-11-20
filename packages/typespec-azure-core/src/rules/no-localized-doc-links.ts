import {
  $doc,
  createRule,
  fileRef,
  getDoc,
  getDocData,
  getErrorsDoc,
  getReturnsDoc,
  type ModelProperty,
  type Operation,
  type Type,
} from "@typespec/compiler";
import { SyntaxKind, type Node } from "@typespec/compiler/ast";

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
      const doc = getDocData(context.program, target);
      if (!doc || !localizedDocLink.test(doc.value)) {
        return;
      }

      if (target.kind === "ModelProperty" || target.kind === "EnumMember") {
        if (doc.source === "decorator") {
          const application = target.decorators.findLast((item) => item.decorator === $doc);
          if (application?.node?.kind === SyntaxKind.AugmentDecoratorStatement) {
            reportOnce(target, application.node);
            return;
          }
          if (target.kind === "ModelProperty" && target.sourceProperty) {
            for (
              let property: ModelProperty | undefined = target.sourceProperty;
              property && getDoc(context.program, property) === doc.value;
              property = property.sourceProperty
            ) {
              const sourceApplication = property.decorators.findLast(
                (item) => item.decorator === $doc,
              );
              if (sourceApplication?.node?.kind === SyntaxKind.AugmentDecoratorStatement) {
                reportOnce(property, sourceApplication.node);
                return;
              }
              if (sourceApplication) {
                reportOnce(property);
                return;
              }
            }
          }
        } else if (target.kind === "ModelProperty" && target.sourceProperty) {
          // A copied property can inherit documentation authored on an intermediate owner.
          for (
            let property: ModelProperty | undefined = target;
            property && getDoc(context.program, property) === doc.value;
            property = property.sourceProperty
          ) {
            const model = property.model;
            const signature = model?.node?.parent;
            const owner =
              signature?.kind === SyntaxKind.OperationSignatureDeclaration
                ? signature.parent
                : model?.node;
            let ownDoc: string | undefined;
            for (const comment of owner?.docs ?? []) {
              for (const tag of comment.tags) {
                if (
                  (tag.kind === SyntaxKind.DocPropTag && tag.propName.sv === target.name) ||
                  (tag.kind === SyntaxKind.DocParamTag && tag.paramName.sv === target.name)
                ) {
                  ownDoc = tag.content.map((part) => part.text).join("");
                }
              }
            }
            if (ownDoc && ownDoc === doc.value && owner) {
              reportOnce(target, owner);
              return;
            }
          }

          let source: ModelProperty | undefined = target;
          while (source?.sourceProperty) {
            source = source.sourceProperty;
          }
          if (source?.model?.node?.parent?.kind === SyntaxKind.OperationSignatureDeclaration) {
            return;
          }
        }
      }

      reportOnce(target);
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
