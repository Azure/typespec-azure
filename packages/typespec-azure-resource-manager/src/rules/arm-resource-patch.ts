import {
  CodeFix,
  DiagnosticMessages,
  LinterRuleContext,
  Model,
  ModelProperty,
  Operation,
  Program,
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
    notUpdateableInPatch: paramMessage`Property '${"propertyName"}' is in the PATCH request body but is not updateable on the resource (e.g. it has '@visibility(Lifecycle.Create)' which excludes 'Lifecycle.Update'); it cannot be updated and must be removed from the PATCH request model.`,
    requiredInPatch: paramMessage`Property '${"propertyName"}' is required in the PATCH request body. PATCH request body properties must all be optional so partial updates work.`,
    defaultInPatch: paramMessage`Property '${"propertyName"}' has a default value in the PATCH request body. PATCH request body properties that are not present in the request body leave the value unchanged; they do not result in any default value being assigned.`,
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
  } else if (
    resourceType.properties.has("tags") &&
    !patchModel.some((p) => p.name === "tags" && p.type.kind === "Model")
  ) {
    context.reportDiagnostic({
      messageId: "missingTags",
      target: operation,
    });
  } else {
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
    if (badProperties.length > 0)
      context.reportDiagnostic({
        messageId: "modelSuperset",
        format: {
          name: badProperties.flatMap((t) => t.name).join(", "),
          resourceModel: resourceType.name,
        },
        target: operation,
      });

    // Check each property in the PATCH body for additional issues.
    checkPatchBodyProperties(context, patchModel);
  }

  // Check the request content-type header (if explicit).
  checkPatchContentType(context, operation);
}

function checkPatchBodyProperties(
  context: LinterRuleContext<DiagnosticMessages>,
  patchModel: ModelProperty[],
) {
  for (const property of patchModel) {
    // Required (non-optional) PATCH body properties are not allowed.
    if (!property.optional) {
      context.reportDiagnostic({
        messageId: "requiredInPatch",
        format: { propertyName: property.name },
        target: property,
        codefixes: [createMakeOptionalCodeFix(property)],
      });
    }

    // Default values on PATCH body properties are not meaningful.
    if (property.defaultValue !== undefined) {
      context.reportDiagnostic({
        messageId: "defaultInPatch",
        format: { propertyName: property.name },
        target: property,
        codefixes: [createRemoveDefaultCodeFix(property)],
      });
    }

    // Read-only / not-updateable properties should not appear in PATCH body.
    if (isNotUpdateable(context.program, property)) {
      context.reportDiagnostic({
        messageId: "notUpdateableInPatch",
        format: { propertyName: property.name },
        target: property,
        codefixes: [createRemovePropertyCodeFix(property)],
      });
    }
  }
}

function isNotUpdateable(program: Program, property: ModelProperty): boolean {
  const sourceProperty = getSourceProperty(property);
  const lifecycle = getLifecycleVisibilityEnum(program);
  const updateMember = lifecycle.members.get("Update");
  const readMember = lifecycle.members.get("Read");
  if (updateMember === undefined) return false;
  const visibility = getVisibilityForClass(program, sourceProperty, lifecycle);
  // Properties that are read-only (only Lifecycle.Read visibility) are allowed in
  // the PATCH request body — they are filtered out by visibility transforms when
  // the body is serialized for the request, so they don't need to be removed.
  if (readMember !== undefined && visibility.size === 1 && visibility.has(readMember)) {
    return false;
  }
  // If the source property's lifecycle visibility excludes Update, it cannot be
  // patched and must be removed from the PATCH body model.
  return !visibility.has(updateMember);
}

function checkPatchContentType(
  context: LinterRuleContext<DiagnosticMessages>,
  operation: Operation,
) {
  const program = context.program;
  for (const property of operation.parameters.properties.values()) {
    if (!isHeader(program, property)) continue;
    const headerName = getHeaderFieldName(program, property);
    if (headerName?.toLowerCase() !== "content-type") continue;
    const [contentTypes] = getContentTypes(property);
    if (contentTypes.length === 0) continue;
    const allowed = new Set(["application/merge-patch+json", "application/json"]);
    if (!contentTypes.every((ct) => allowed.has(ct))) {
      context.reportDiagnostic({
        messageId: "nonMergePatchContentType",
        format: { operationName: operation.name },
        target: property,
      });
    }
  }
}

function createMakeOptionalCodeFix(property: ModelProperty): CodeFix {
  return defineCodeFix({
    id: "make-patch-property-optional",
    label: `Make property '${property.name}' optional`,
    fix: (context) => {
      const node = property.node;
      if (!node || node.kind !== SyntaxKind.ModelProperty) return undefined;
      const idLocation = getSourceLocation(node.id);
      return context.appendText(idLocation, "?");
    },
  });
}

function createRemoveDefaultCodeFix(property: ModelProperty): CodeFix {
  return defineCodeFix({
    id: "remove-patch-property-default",
    label: `Remove default value from property '${property.name}'`,
    fix: (context) => {
      const node = property.node;
      if (!node || node.kind !== SyntaxKind.ModelProperty || node.default === undefined)
        return undefined;
      const valueLocation = getSourceLocation(node.value);
      const defaultLocation = getSourceLocation(node.default);
      return context.replaceText(
        { file: valueLocation.file, pos: valueLocation.end, end: defaultLocation.end },
        "",
      );
    },
  });
}

function createRemovePropertyCodeFix(property: ModelProperty): CodeFix {
  return defineCodeFix({
    id: "remove-patch-property",
    label: `Remove property '${property.name}' from PATCH body`,
    fix: (context) => {
      const node = property.node;
      if (!node || node.kind !== SyntaxKind.ModelProperty) return undefined;
      const location = getSourceLocation(node);
      const fileText = location.file.text;
      // Extend the range to include any trailing terminator (`;` or `,`) and the rest
      // of the line (including the newline) so we don't leave an empty line behind.
      let end = location.end;
      if (end < fileText.length && (fileText[end] === ";" || fileText[end] === ",")) {
        end += 1;
      }
      // Consume trailing horizontal whitespace and a single newline (if present).
      while (end < fileText.length && (fileText[end] === " " || fileText[end] === "\t")) {
        end += 1;
      }
      if (fileText[end] === "\r") end += 1;
      if (fileText[end] === "\n") end += 1;
      // Also consume leading whitespace on the same line so the line is fully removed.
      let pos = location.pos;
      while (pos > 0 && (fileText[pos - 1] === " " || fileText[pos - 1] === "\t")) {
        pos -= 1;
      }
      return context.replaceText({ file: location.file, pos, end }, "");
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
