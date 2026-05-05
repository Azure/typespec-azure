import {
  CodeFix,
  DiagnosticMessages,
  LinterRuleContext,
  Model,
  ModelProperty,
  Operation,
  Program,
  createAddDecoratorCodeFix,
  createRule,
  defineCodeFix,
  getEffectiveModelType,
  getLifecycleVisibilityEnum,
  getProperty,
  getSourceLocation,
  getVisibilityForClass,
  isErrorType,
  isType,
  paramMessage,
} from "@typespec/compiler";
import { SyntaxKind } from "@typespec/compiler/ast";
import {
  getContentTypes,
  getHeaderFieldName,
  getOperationVerb,
  getPatchOptions,
  isBody,
  isBodyRoot,
  isHeader,
  isPathParam,
  isQueryParam,
} from "@typespec/http";

import { getArmResource } from "../resource.js";
import { getSourceModel, getSourceProperty, isInternalTypeSpec } from "./utils.js";

export const patchOperationsRule = createRule({
  name: "arm-resource-patch",
  severity: "warning",
  description: "Validate ARM PATCH operations.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-resource-patch",
  messages: {
    default: "The request body of a PATCH must be a model with a subset of resource properties",
    missingTags: "Resource PATCH must contain the 'tags' property.",
    modelSuperset: paramMessage`Resource PATCH models must be a subset of the resource type. The following properties: [${"name"}] do not exist in resource Model '${"resourceModel"}'.`,
    notUpdateableInPatch: paramMessage`Property '${"propertyName"}' is in the PATCH body but is not visible for the Update lifecycle phase on the resource; it cannot be updated and must be removed from the PATCH model.`,
    requiredInPatch: paramMessage`Property '${"propertyName"}' is required in the PATCH body. PATCH body properties must all be optional so partial updates work.`,
    missingMergePatch: paramMessage`PATCH operation '${"operationName"}' must use '@patch(#{implicitOptionality: true})' or wrap its body in 'MergePatchUpdate<>' so that the generated wire format is application/merge-patch+json.`,
    nonMergePatchContentType: paramMessage`PATCH operation '${"operationName"}' specifies a content-type other than 'application/merge-patch+json'.`,
  },
  create(context) {
    return {
      operation: (operation: Operation) => {
        if (!isInternalTypeSpec(context.program, operation)) {
          const verb = getOperationVerb(context.program, operation);
          if (verb === "patch") {
            const resourceType = getResourceModel(context.program, operation);
            if (resourceType) {
              checkPatchModel(context, operation, resourceType);
            }
            checkMergePatchSupport(context, operation);
          }
        }
      },
    };
  },
});

function checkPatchModel(
  context: LinterRuleContext<DiagnosticMessages>,
  operation: Operation,
  resourceType: Model,
) {
  const patchModel = getPatchModel(context.program, operation);
  if (patchModel === undefined) {
    context.reportDiagnostic({
      target: operation,
    });
    return;
  }
  if (
    resourceType.properties.has("tags") &&
    !patchModel.some((p) => p.name === "tags" && p.type.kind === "Model")
  ) {
    context.reportDiagnostic({
      messageId: "missingTags",
      target: operation,
    });
    return;
  }
  const resourceProperties = resourceType.properties.get("properties");
  const badProperties: ModelProperty[] = [];
  for (const property of patchModel) {
    const sourceModel = getSourceModel(property);
    if (sourceModel === undefined || !getArmResource(context.program, sourceModel)) {
      if (
        !getProperty(resourceType, property.name) &&
        (resourceProperties === undefined ||
          resourceProperties.type.kind !== "Model" ||
          !getProperty(resourceProperties.type, property.name))
      ) {
        badProperties.push(property);
      }
    }
  }
  if (badProperties.length > 0) {
    context.reportDiagnostic({
      messageId: "modelSuperset",
      format: {
        name: badProperties.flatMap((t) => t.name).join(", "),
        resourceModel: resourceType.name,
      },
      target: operation,
    });
  }

  // Per-property checks: required-in-patch and not-updateable-in-patch.
  checkPatchModelProperties(context, patchModel);
}

function checkPatchModelProperties(
  context: LinterRuleContext<DiagnosticMessages>,
  patchModel: ModelProperty[],
) {
  const program = context.program;
  const lifecycleEnum = getLifecycleVisibilityEnum(program);
  const updateModifier = lifecycleEnum.members.get("Update");
  for (const property of patchModel) {
    // Skip properties that come from an ARM resource model itself — those
    // are produced by the ARM templates which already handle visibility and
    // optionality correctly on the wire.
    const sourceModel = getSourceModel(property);
    if (sourceModel !== undefined && getArmResource(program, sourceModel)) {
      continue;
    }

    if (!property.optional) {
      context.reportDiagnostic({
        messageId: "requiredInPatch",
        format: { propertyName: property.name },
        target: property,
        codefixes: [createMakeOptionalCodeFix(property)],
      });
    }

    // Visibility check: trace back to the original resource property and
    // confirm it has the Update lifecycle visibility modifier.
    const sourceProperty = getSourceProperty(property);
    if (updateModifier !== undefined && sourceProperty !== undefined) {
      const visibility = getVisibilityForClass(program, sourceProperty, lifecycleEnum);
      if (visibility.size > 0 && !visibility.has(updateModifier)) {
        context.reportDiagnostic({
          messageId: "notUpdateableInPatch",
          format: { propertyName: property.name },
          target: property,
          codefixes: [createRemovePropertyCodeFix(property)],
        });
      }
    }
  }
}

function checkMergePatchSupport(
  context: LinterRuleContext<DiagnosticMessages>,
  operation: Operation,
) {
  const program = context.program;
  if (operationUsesMergePatch(program, operation)) {
    // Even when implicit optionality is enabled the user may still have
    // explicitly set a non-merge-patch content-type. That's caught below.
  } else {
    context.reportDiagnostic({
      messageId: "missingMergePatch",
      format: { operationName: operation.name },
      target: operation,
      codefixes: [
        createAddDecoratorCodeFix(operation, "patch", ["#{ implicitOptionality: true }"]),
      ],
    });
  }

  const contentTypeProperty = findContentTypeProperty(program, operation);
  if (contentTypeProperty !== undefined) {
    const [contentTypes] = getContentTypes(contentTypeProperty);
    if (contentTypes.length > 0) {
      const allValid = contentTypes.every(
        (ct) => ct === "application/merge-patch+json" || ct === "application/json",
      );
      if (!allValid) {
        context.reportDiagnostic({
          messageId: "nonMergePatchContentType",
          format: { operationName: operation.name },
          target: contentTypeProperty,
        });
      }
    }
  }
}

function operationUsesMergePatch(program: Program, operation: Operation): boolean {
  // 1. Direct @patch options on this operation or anywhere in its source chain.
  let current: Operation | undefined = operation;
  while (current !== undefined) {
    const options = getPatchOptions(program, current);
    if (options?.implicitOptionality === true) return true;
    current = current.sourceOperation;
  }

  // 2. Body type built using MergePatchUpdate<>.
  const body = getBodyType(program, operation);
  if (body && bodyUsesMergePatchTemplate(body)) return true;

  return false;
}

function bodyUsesMergePatchTemplate(body: Model): boolean {
  let m: Model | undefined = body;
  const seen = new Set<Model>();
  while (m && !seen.has(m)) {
    seen.add(m);
    if (m.name === "MergePatchUpdate" || m.name === "MergePatchCreateOrUpdate") {
      return true;
    }
    if (m.templateMapper !== undefined) {
      for (const arg of m.templateMapper.args) {
        if (isType(arg) && arg.kind === "Model") {
          if (arg.name === "MergePatchUpdate" || arg.name === "MergePatchCreateOrUpdate") {
            return true;
          }
        }
      }
    }
    m = m.sourceModel ?? m.sourceModels[0]?.model;
  }
  return false;
}

function getBodyType(program: Program, operation: Operation): Model | undefined {
  const params = operation.parameters;
  for (const property of params.properties.values()) {
    if (isBody(program, property) || isBodyRoot(program, property)) {
      if (property.type.kind === "Model") return property.type;
      return undefined;
    }
  }
  return undefined;
}

function findContentTypeProperty(
  program: Program,
  operation: Operation,
): ModelProperty | undefined {
  for (const property of operation.parameters.properties.values()) {
    if (isHeader(program, property)) {
      const headerName = getHeaderFieldName(program, property);
      if (headerName?.toLowerCase() === "content-type") return property;
    }
  }
  return undefined;
}

function createMakeOptionalCodeFix(property: ModelProperty): CodeFix {
  return defineCodeFix({
    id: "patch-property-make-optional",
    label: `Make property '${property.name}' optional`,
    fix: (context) => {
      const node = property.node;
      if (!node || node.kind !== SyntaxKind.ModelProperty) return;
      const idLocation = getSourceLocation(node.id);
      // appendText inserts at end position of node — append "?" right after the id token.
      return context.appendText(idLocation, "?");
    },
  });
}

function createRemovePropertyCodeFix(property: ModelProperty): CodeFix {
  return defineCodeFix({
    id: "patch-property-remove",
    label: `Remove non-updateable property '${property.name}' from PATCH model`,
    fix: (context) => {
      const node = property.node;
      if (!node || node.kind !== SyntaxKind.ModelProperty) return;
      return context.replaceText(getSourceLocation(node), "");
    },
  });
}

function getResourceModel(program: Program, operation: Operation): Model | undefined {
  const returnType = operation.returnType;
  if (returnType.kind === "Union") {
    for (const variant of returnType.variants.values()) {
      if (!isErrorType(variant.type) && variant.type.kind === "Model") {
        const modelCandidate = getEffectiveModelType(program, variant.type);
        if (getArmResource(program, modelCandidate)) {
          return modelCandidate;
        }
        if (modelCandidate.templateMapper !== undefined) {
          for (const arg of modelCandidate.templateMapper.args) {
            if (isType(arg) && arg.kind === "Model" && getArmResource(program, arg)) {
              return arg;
            }
          }
        }
      }
    }
  }

  return undefined;
}

function getPatchModel(program: Program, operation: Operation): ModelProperty[] | undefined {
  const bodyProperties: ModelProperty[] = [];
  const patchModel = getEffectiveModelType(program, operation.parameters);
  for (const [_, property] of patchModel.properties) {
    if (
      isHeader(program, property) ||
      isQueryParam(program, property) ||
      isPathParam(program, property)
    )
      continue;
    if (
      (isBody(program, property) || isBodyRoot(program, property)) &&
      property.type.kind === "Scalar"
    )
      return undefined;
    bodyProperties.push(property);
  }

  if (bodyProperties.length === 0) return undefined;
  if (bodyProperties.length === 1 && bodyProperties[0].type.kind === "Model")
    return [...bodyProperties[0].type.properties.values()];
  return bodyProperties;
}
