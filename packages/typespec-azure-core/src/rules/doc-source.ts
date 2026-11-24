import {
  $doc,
  getDoc,
  getDocData,
  type ModelProperty,
  type Program,
  type Type,
} from "@typespec/compiler";
import { SyntaxKind, type Node } from "@typespec/compiler/ast";

export interface DocDiagnosticTarget {
  diagnosticTarget: Type | Node;
  source: Type;
}

export function getDocDiagnosticTarget(
  program: Program,
  target: Type,
  doc: string,
): DocDiagnosticTarget | undefined {
  if (target.kind !== "ModelProperty" && target.kind !== "EnumMember") {
    return { diagnosticTarget: target, source: target };
  }

  const data = getDocData(program, target);
  if (data?.source === "decorator") {
    const application = target.decorators.findLast((item) => item.decorator === $doc);
    if (application?.node?.kind === SyntaxKind.AugmentDecoratorStatement) {
      return { diagnosticTarget: application.node, source: target };
    }
  }

  if (target.kind === "ModelProperty" && target.sourceProperty) {
    if (data?.source === "decorator") {
      for (
        let property: ModelProperty | undefined = target.sourceProperty;
        property && getDoc(program, property) === doc;
        property = property.sourceProperty
      ) {
        const sourceApplication = property.decorators.findLast((item) => item.decorator === $doc);
        if (sourceApplication?.node?.kind === SyntaxKind.AugmentDecoratorStatement) {
          return { diagnosticTarget: sourceApplication.node, source: property };
        }
        if (sourceApplication) {
          return { diagnosticTarget: property, source: property };
        }
      }
    }

    if (data?.source === "comment") {
      for (
        let property: ModelProperty | undefined = target;
        property && getDoc(program, property) === doc;
        property = property.sourceProperty
      ) {
        const model = property.model;
        const signature = model?.node?.parent;
        const owner =
          signature?.kind === SyntaxKind.OperationSignatureDeclaration
            ? signature.parent
            : model?.node;
        const ownDoc = owner?.docs
          ?.flatMap((comment) => comment.tags)
          .find(
            (tag) =>
              ((tag.kind === SyntaxKind.DocPropTag && tag.propName.sv === target.name) ||
                (tag.kind === SyntaxKind.DocParamTag && tag.paramName.sv === target.name)) &&
              tag.content.map((part) => part.text).join("") === doc,
          );
        if (ownDoc && owner) {
          return { diagnosticTarget: owner, source: target };
        }
      }

      let source: ModelProperty | undefined = target;
      while (source?.sourceProperty) {
        source = source.sourceProperty;
      }
      if (source?.model?.node?.parent?.kind === SyntaxKind.OperationSignatureDeclaration) {
        return undefined;
      }
    }
  }

  return { diagnosticTarget: target, source: target };
}
