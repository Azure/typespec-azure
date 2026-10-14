import { createDocumentationNameValidator } from "./documentation-names.js";

import {
  createRule,
  fileRef,
  getDiscriminatedTypes,
  getDiscriminator,
  getDoc,
  type Discriminator,
  type Enum,
  type LinterRuleContext,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Union,
  type UnionVariant,
} from "@typespec/compiler";
import { getVersionsForEnum } from "@typespec/versioning";
import {
  documentationMessages,
  hasMeaningfulDocumentation,
  withExplicitDocumentation,
  type DocumentationTarget,
} from "./documentation.js";
import {
  isExcludedCoreType,
  isInlineModel,
  isTemplateDeclarationType,
  isTemplatedInterfaceOperation,
  isTemplatedOperationSignature,
} from "./utils.js";

/** Versioning enums are self-documenting and don't need separate documentation. */
function isExcludedVersionEnum(program: Program, enumObj: Enum): boolean {
  const versions = getVersionsForEnum(program, enumObj);
  if (versions !== undefined && versions.length > 0) {
    return true;
  }
  return false;
}

const documentationValidators: ((
  context: LinterRuleContext<typeof documentationMessages>,
) => (target: DocumentationTarget) => void)[] = [];

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

documentationValidators.push(createDocumentationNameValidator);

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
    const validators = documentationValidators.map((createValidator) => createValidator(context));
    const discTypes = getDiscriminatedTypes(context.program);
    const requiredTargets = new Set<DocumentationTarget>();
    const needsDocumentation = (target: DocumentationTarget) => {
      requiredTargets.add(target);
      if (getDoc(context.program, target) === undefined) return true;
      if (!hasMeaningfulDocumentation(context.program, target)) {
        context.reportDiagnostic({ target, messageId: "empty" });
      }
      return false;
    };
    return withExplicitDocumentation(
      context.program,
      {
        enum: (enumObj: Enum) => {
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
      },
      requiredTargets,
      (target) => {
        for (const validate of validators) validate(target);
      },
    );
  },
});
