import {
  Discriminator,
  Enum,
  Model,
  ModelProperty,
  Operation,
  Program,
  Union,
  createRule,
  getDiscriminatedTypes,
  getDiscriminator,
  getDoc,
  paramMessage,
} from "@typespec/compiler";
import { getVersionsForEnum } from "@typespec/versioning";
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
  type: ModelProperty | Enum,
  discTypes: [Model | Union, Discriminator][]
): boolean {
  if (type.kind === "ModelProperty") {
    const disc = findDiscriminator(program, type.model);
    if (disc && disc.propertyName === type.name) {
      return true;
    }
  } else if (type.kind === "Enum") {
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

export const requireDocumentation = createRule({
  name: "documentation-required",
  description: "Require documentation over enums, models, and operations.",
  severity: "warning",
  messages: {
    default: paramMessage`The ${"kind"} named '${"name"}' should have a documentation or description, use doc comment /** */ to provide it.`,
  },
  create(context) {
    const discTypes = getDiscriminatedTypes(context.program);
    return {
      enum: (enumObj: Enum) => {
        // version enums and enum members are considered intrinsically self-documenting
        if (isExcludedVersionEnum(context.program, enumObj)) {
          return;
        }
        if (isExcludedDiscriminator(context.program, enumObj, discTypes)) {
          return;
        }
        if (!getDoc(context.program, enumObj) && !isExcludedCoreType(context.program, enumObj)) {
          context.reportDiagnostic({
            target: enumObj,
            format: { kind: enumObj.kind, name: enumObj.name },
          });
        }
        for (const member of enumObj.members.values()) {
          if (!getDoc(context.program, member)) {
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
          if (!getDoc(context.program, operation)) {
            context.reportDiagnostic({
              target: operation,
              format: { kind: operation.kind, name: operation.name },
            });
          }

          for (const param of operation.parameters.properties.values()) {
            if (!getDoc(context.program, param)) {
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
          if (!getDoc(context.program, model)) {
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
            if (!getDoc(context.program, prop)) {
              context.reportDiagnostic({
                target: prop,
                format: { kind: prop.kind, name: prop.name },
              });
            }
          }
        }
      },
    };
  },
});
