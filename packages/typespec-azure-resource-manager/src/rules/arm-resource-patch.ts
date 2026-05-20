import {
  CodeFix,
  DiagnosticMessages,
  EnumMember,
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
  getTypeName,
  getVisibilityForClass,
  hasVisibility,
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
    notUpdateableInPatch: paramMessage`Property '${"propertyName"}' is in the PATCH request body but is not updateable on the resource. Make this property updateable on the resource or remove it from the PATCH request.`,
    requiredInPatch: paramMessage`Property '${"propertyName"}' is required in the PATCH request body. PATCH request body properties must all be optional or readOnly.`,
    defaultInPatch: paramMessage`Property '${"propertyName"}' has a default value in the PATCH request body. PATCH request body properties that are not present in the request body leave the value unchanged; they do not result in any default value being assigned.`,
    nonMergePatchContentType: paramMessage`PATCH operation '${"operationName"}' specifies a content-type '${"contentType"}' other than 'application/merge-patch+json'.`,
  },
  create(context) {
    // Resolve the lifecycle visibility class members once per rule activation
    // so we don't re-resolve them on every property check.
    const lifecycle = getLifecycleVisibilityEnum(context.program);
    const lifecycleMembers: LifecycleMembers = {
      read: lifecycle.members.get("Read"),
      update: lifecycle.members.get("Update"),
    };
    return {
      operation: (operation: Operation) => {
        if (!isInternalTypeSpec(context.program, operation)) {
          const verb = getOperationVerb(context.program, operation);
          if (verb === "patch") {
            const resourceType = getResourceModel(context.program, operation);
            if (resourceType) {
              checkPatchModel(context, operation, resourceType, lifecycleMembers);
            }
          }
        }
      },
    };
  },
});

interface LifecycleMembers {
  read: EnumMember | undefined;
  update: EnumMember | undefined;
}

function checkPatchModel(
  context: LinterRuleContext<DiagnosticMessages>,
  operation: Operation,
  resourceType: Model,
  lifecycleMembers: LifecycleMembers,
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
    checkPatchBodyProperties(context, patchModel, lifecycleMembers);
  }

  // Check the request content-type header (if explicit).
  checkPatchContentType(context, operation);
}

function checkPatchBodyProperties(
  context: LinterRuleContext<DiagnosticMessages>,
  patchModel: ModelProperty[],
  lifecycleMembers: LifecycleMembers,
) {
  const readOnlyCache = new Map<string, boolean>();

  for (const property of patchModel) {
    if (
      !property.optional &&
      !isReadOnly(context.program, property, lifecycleMembers, readOnlyCache)
    ) {
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

    // Non-updateable properties should not appear in PATCH body. The check is
    // applied recursively to nested model and Record<Model> property types.
    // Recursion-related state is created fresh per top-level property so that
    // a cycle-resolution false on one traversal does not leak as a stale
    // cached "false" into a sibling property's traversal.
    if (
      isNotUpdateable(context.program, property, {
        lifecycleMembers,
        readOnlyCache,
        modelHasNonUpdateableCache: new Map<string, boolean>(),
        inProgressModels: new Set<string>(),
      })
    ) {
      context.reportDiagnostic({
        messageId: "notUpdateableInPatch",
        format: { propertyName: property.name },
        target: property,
        codefixes: [createRemovePropertyCodeFix(property)],
      });
    }
  }
}

interface NotUpdateableState {
  /** Resolved Lifecycle visibility members; computed once at rule activation. */
  lifecycleMembers: LifecycleMembers;
  /**
   * Pure per-source-property cache; safe to share across the entire traversal.
   * Keyed by the source property's fully-qualified name (namespace + model +
   * property) which is guaranteed to be unique in TypeSpec, since identity
   * comparisons on `ModelProperty` objects are not reliable across recursion.
   */
  readOnlyCache: Map<string, boolean>;
  /**
   * Per-top-level-property cache of the recursive "does this model contain a
   * non-updateable property" answer. Keyed by the model's fully-qualified
   * name. Recreated for every top-level patch property because cycle-breaking
   * inside one traversal can otherwise cache a too-conservative `false` for a
   * model whose true answer depends on a different entry path.
   */
  modelHasNonUpdateableCache: Map<string, boolean>;
  /**
   * Models currently being visited in the active recursion stack, keyed by
   * fully-qualified name. Used purely to break cycles — entries are added on
   * entry to `modelHasNonUpdateable` and removed on exit, so each top-level
   * call sees a clean stack.
   */
  inProgressModels: Set<string>;
}

/**
 * Returns true when the source resource property's lifecycle visibility is
 * exactly `{Lifecycle.Read}` by itself. Such properties are filtered out by
 * visibility transforms during PATCH request serialization, so they are
 * allowed (even if required) in the PATCH body model.
 */
function isReadOnly(
  program: Program,
  property: ModelProperty,
  lifecycleMembers: LifecycleMembers,
  cache: Map<string, boolean>,
): boolean {
  const sourceProperty = getSourceProperty(property);
  const cacheKey = getTypeName(sourceProperty);
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;
  const readMember = lifecycleMembers.read;
  if (readMember === undefined) {
    cache.set(cacheKey, false);
    return false;
  }
  const lifecycle = readMember.enum;
  const visibility = getVisibilityForClass(program, sourceProperty, lifecycle);
  const result = visibility.size === 1 && visibility.has(readMember);
  cache.set(cacheKey, result);
  return result;
}

/**
 * Returns true when the source resource property's lifecycle visibility makes
 * it eligible to appear in a PATCH request body. A property is allowed if its
 * visibility either:
 *
 * - includes `Lifecycle.Update` (this covers default visibility — which has
 *   all lifecycle modifiers — as well as `@visibility(Lifecycle.Update)`
 *   alone or combined with any other modifier), OR
 * - is exactly `{Lifecycle.Read}` by itself (such properties are filtered out
 *   of the request body by visibility transforms during serialization).
 *
 * Other visibilities (for example `@visibility(Lifecycle.Create)` only or
 * `@visibility(Lifecycle.Create, Lifecycle.Read)`) are not allowed.
 */
function isAllowedInPatchByVisibility(
  program: Program,
  property: ModelProperty,
  lifecycleMembers: LifecycleMembers,
  readOnlyCache: Map<string, boolean>,
): boolean {
  const updateMember = lifecycleMembers.update;
  if (updateMember !== undefined) {
    const sourceProperty = getSourceProperty(property);
    if (hasVisibility(program, sourceProperty, updateMember)) {
      return true;
    }
  }
  return isReadOnly(program, property, lifecycleMembers, readOnlyCache);
}

/**
 * Returns true when the source resource property's visibility is not allowed
 * in a PATCH body, OR when any of its transitively-nested complex keyed
 * properties (model types and `Record<Model>` value types) is itself not
 * updateable.
 */
function isNotUpdateable(
  program: Program,
  property: ModelProperty,
  state: NotUpdateableState,
): boolean {
  if (
    !isAllowedInPatchByVisibility(program, property, state.lifecycleMembers, state.readOnlyCache)
  ) {
    return true;
  }

  // Recurse into complex keyed property types: bare model types (excluding
  // arrays) and the value type of records when that value type is a model.
  const nested = getNestedModelToCheck(property.type);
  if (nested !== undefined && modelHasNonUpdateable(program, nested, state)) {
    return true;
  }

  return false;
}

/**
 * Returns true when `model` (or any of its transitively-nested complex keyed
 * property types) has a property that is not updateable. Cycles are broken by
 * treating an in-progress model as not contributing any new non-updateable
 * findings on the back-edge — the property that started the cycle is still
 * checked by its own enclosing call, so any non-updateable property is still
 * detected from at least one path.
 */
function modelHasNonUpdateable(program: Program, model: Model, state: NotUpdateableState): boolean {
  const cacheKey = getTypeName(model);
  const cached = state.modelHasNonUpdateableCache.get(cacheKey);
  if (cached !== undefined) return cached;
  if (state.inProgressModels.has(cacheKey)) return false;
  state.inProgressModels.add(cacheKey);
  try {
    for (const nestedProperty of model.properties.values()) {
      if (isNotUpdateable(program, nestedProperty, state)) {
        state.modelHasNonUpdateableCache.set(cacheKey, true);
        return true;
      }
    }
    state.modelHasNonUpdateableCache.set(cacheKey, false);
    return false;
  } finally {
    state.inProgressModels.delete(cacheKey);
  }
}

/**
 * Returns the nested `Model` to recurse into for the `notUpdateableInPatch`
 * check, or `undefined` when the property's type is not a complex keyed type.
 *
 * - Plain model types are returned directly (excluding arrays which are
 *   `Model<"Array">` in TypeSpec).
 * - For `Record<T>` types, the value type `T` is returned when it is a model.
 */
function getNestedModelToCheck(type: ModelProperty["type"]): Model | undefined {
  if (type.kind !== "Model") return undefined;
  // `Array<T>` is represented as a Model whose name is "Array"; skip it.
  if (type.name === "Array") return undefined;
  if (type.name === "Record") {
    const valueType = type.indexer?.value;
    if (valueType && valueType.kind === "Model" && valueType.name !== "Array") {
      return valueType;
    }
    return undefined;
  }
  return type;
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
    const offending = contentTypes.find((ct) => !allowed.has(ct));
    if (offending !== undefined) {
      context.reportDiagnostic({
        messageId: "nonMergePatchContentType",
        format: { operationName: operation.name, contentType: offending },
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
