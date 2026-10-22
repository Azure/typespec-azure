import {
  createRule,
  fileRef,
  getDiscriminatedTypes,
  getDiscriminator,
  getDoc,
  ignoreDiagnostics,
  isArrayModelType,
  paramMessage,
  type Discriminator,
  type Enum,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import {
  getHeaderFieldName,
  getHttpOperation,
  getHttpPart,
  getPathParamName,
  getQueryParamName,
  isStatusCode,
} from "@typespec/http";
import { getVersionsForEnum } from "@typespec/versioning";
import {
  isExcludedCoreType,
  isInlineModel,
  isTemplateDeclarationType,
  isTemplatedInterfaceOperation,
  isTemplatedOperationSignature,
} from "./utils.js";

type DocumentationTarget = Parameters<typeof getDoc>[1];

const documentationMessages = {
  default: paramMessage`The ${"kind"} named '${"name"}' should have a documentation or description, use doc comment /** */ to provide it.`,
  empty: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
  uninformative: paramMessage`Description must not match the name of the node it describes. Node name:'${"name"}' Description:'${"description"}'`,
};

function normalizeDocumentation(value: string): string {
  return value.trim().replace(/\./g, "").toLowerCase();
}

function getDocumentationName(
  program: Program,
  target: DocumentationTarget,
  doc: string,
): string | undefined {
  switch (target.kind) {
    case "UnionVariant":
      return typeof target.name === "string"
        ? target.name
        : target.type.kind === "String"
          ? target.type.value
          : undefined;
    case "Operation":
      if (normalizeDocumentation(doc) === normalizeDocumentation(target.name)) {
        return target.name;
      }
      // HTTP validation owns resolution diagnostics; this rule only checks documentation.
      return ignoreDiagnostics(getHttpOperation(program, target)).verb;
    case "ModelProperty": {
      const httpName =
        getPathParamName(program, target) ??
        getQueryParamName(program, target) ??
        getHeaderFieldName(program, target);
      if (httpName !== undefined) return httpName;
      const partType =
        target.type.kind === "Model" && isArrayModelType(target.type)
          ? target.type.indexer.value
          : target.type;
      return getHttpPart(program, partType)?.options.name ?? target.name;
    }
    default:
      return "name" in target && typeof target.name === "string" ? target.name : undefined;
  }
}

/** Versioning enums are self-documenting and don't need separate documentation. */
function isExcludedVersionEnum(program: Program, enumObj: Enum): boolean {
  const versions = getVersionsForEnum(program, enumObj);
  if (versions !== undefined && versions.length > 0) {
    return true;
  }
  return false;
}

function findDiscriminator(program: Program, model?: Model): Discriminator | undefined {
  if (!model) return undefined;
  const disc = getDiscriminator(program, model);
  if (disc) {
    return disc;
  }
  return findDiscriminator(program, model.baseModel);
}

/** Discriminator enums and unions are self-documenting and don't need separate documentation. */
function isExcludedDiscriminator(
  program: Program,
  type: ModelProperty | Enum | Union,
  discTypes: [Model | Union, Discriminator][],
): boolean {
  if (type.kind === "ModelProperty") {
    const disc = findDiscriminator(program, type.model);
    if (disc && disc.propertyName === type.name) {
      return true;
    }
  } else if (type.kind === "Enum" || type.kind === "Union") {
    for (const [discType, discName] of discTypes) {
      if (discType.kind === "Model") {
        const discObj = discType.properties.get(discName.propertyName);
        if (discObj?.type === type) {
          return true;
        }
      }
    }
  }
  return false;
}

function getUnionName(union: Union): string | undefined {
  if (union.name !== undefined) {
    return union.name;
  }
  return undefined;
}

function getVariantName(variant: UnionVariant): string | undefined {
  if (variant.name !== undefined && typeof variant.name === "string") {
    return variant.name;
  }
  if (variant.type.kind === "String") {
    return variant.type.value;
  }
  return undefined;
}

export const requireDocumentation = createRule({
  name: "documentation-required",
  docs: fileRef.fromPackageRoot("src/rules/documentation-required.md"),
  description: "Require meaningful documentation over enums, models, and operations.",
  severity: "warning",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-core/rules/documentation-required",
  messages: documentationMessages,
  create(context) {
    const discTypes = getDiscriminatedTypes(context.program);
    const needsDocumentation = (target: DocumentationTarget) => {
      return getDoc(context.program, target) === undefined;
    };
    const checkDocumentation = (target: DocumentationTarget) => {
      const doc = getDoc(context.program, target);
      if (doc === undefined) return;
      if (doc.trim().length === 0) {
        context.reportDiagnostic({ target, messageId: "empty" });
        return;
      }
      if (
        target.kind === "Namespace" ||
        target.kind === "Interface" ||
        (target.kind === "ModelProperty" && isStatusCode(context.program, target))
      )
        return;
      if (
        (target.kind === "Model" ||
          target.kind === "Scalar" ||
          target.kind === "Enum" ||
          target.kind === "EnumMember" ||
          target.kind === "Union") &&
        !target.name
      )
        return;
      const normalizedDoc = normalizeDocumentation(doc);
      if (normalizedDoc.length === 0) return;
      const name = getDocumentationName(context.program, target, doc);
      if (
        normalizedDoc === "description" ||
        (name !== undefined && normalizedDoc === normalizeDocumentation(name))
      ) {
        context.reportDiagnostic({
          target,
          messageId: "uninformative",
          format: { name: name ?? "description", description: doc },
        });
      }
    };
    return {
      namespace: checkDocumentation,
      interface: checkDocumentation,
      scalar: checkDocumentation,
      modelProperty: checkDocumentation,
      unionVariant: checkDocumentation,
      enumMember: checkDocumentation,
      enum: (enumObj: Enum) => {
        checkDocumentation(enumObj);
        // version enums and enum members are considered intrinsically self-documenting
        if (isExcludedVersionEnum(context.program, enumObj)) {
          return;
        }
        if (isExcludedDiscriminator(context.program, enumObj, discTypes)) {
          return;
        }
        if (!isExcludedCoreType(context.program, enumObj) && needsDocumentation(enumObj)) {
          context.reportDiagnostic({
            target: enumObj,
            format: { kind: enumObj.kind, name: enumObj.name },
          });
        }
        for (const member of enumObj.members.values()) {
          if (needsDocumentation(member)) {
            context.reportDiagnostic({
              target: member,
              format: { kind: member.kind, name: member.name },
            });
          }
        }
      },
      operation: (operation: Operation) => {
        checkDocumentation(operation);
        // Don't pay attention to operations on templated interfaces that
        // haven't been filled in with parameters yet
        if (
          !isTemplatedInterfaceOperation(operation) &&
          !isTemplatedOperationSignature(operation) &&
          !isExcludedCoreType(context.program, operation)
        ) {
          if (needsDocumentation(operation)) {
            context.reportDiagnostic({
              target: operation,
              format: { kind: operation.kind, name: operation.name },
            });
          }

          for (const param of operation.parameters.properties.values()) {
            if (needsDocumentation(param)) {
              context.reportDiagnostic({
                target: param,
                format: { kind: param.kind, name: param.name },
              });
            }
          }
        }
      },
      model: (model: Model) => {
        checkDocumentation(model);
        // it's by design that the `getDoc` function can't get the `doc` for template declaration type.
        if (
          !isTemplateDeclarationType(model) &&
          !isInlineModel(model) &&
          !isExcludedCoreType(context.program, model) &&
          model.name !== "object"
        ) {
          if (needsDocumentation(model)) {
            context.reportDiagnostic({
              target: model,
              format: { kind: model.kind, name: model.name },
            });
          }
          for (const prop of model.properties.values()) {
            // Properties that are discriminators are considered self-documenting
            if (isExcludedDiscriminator(context.program, prop, discTypes)) {
              return;
            }
            if (needsDocumentation(prop)) {
              context.reportDiagnostic({
                target: prop,
                format: { kind: prop.kind, name: prop.name },
              });
            }
          }
        }
      },
      union: (union: Union) => {
        checkDocumentation(union);
        if (isExcludedDiscriminator(context.program, union, discTypes)) {
          return;
        }
        if (!isExcludedCoreType(context.program, union) && needsDocumentation(union)) {
          const name = getUnionName(union);
          if (name !== undefined) {
            context.reportDiagnostic({
              target: union,
              format: { kind: union.kind, name: name },
            });
          }
        }
        for (const variant of union.variants.values()) {
          if (needsDocumentation(variant)) {
            // symbols don't need documentation
            const variantName = getVariantName(variant);
            if (variantName !== undefined) {
              context.reportDiagnostic({
                target: variant,
                format: { kind: variant.kind, name: variantName },
              });
            }
          }
        }
      },
    };
  },
});
