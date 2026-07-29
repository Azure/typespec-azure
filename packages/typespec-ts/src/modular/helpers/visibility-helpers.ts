import {
  SdkHttpOperation,
  SdkModelPropertyType,
  SdkModelType,
  SdkServiceMethod,
} from "@azure-tools/typespec-client-generator-core";
import {
  MetadataInfo,
  Visibility,
  createMetadataInfo,
  getVisibilitySuffix,
  resolveRequestVisibility,
} from "@typespec/http";

import { getAllOperationsFromClient } from "../../framework/hooks/sdk-types.js";
import { SdkContext } from "../../utils/interfaces.js";
import { getDirectSubtypes } from "./type-helpers.js";

interface ProjectionState {
  context: SdkContext;
  /** Shared `@typespec/http` metadata oracle (canonical baseline = Read). */
  metadata: MetadataInfo;
  /** Memoized projections keyed by `${crossLanguageDefinitionId}|${visibility}`. */
  cache: Map<string, ModelProjection>;
  /** Every distinct split model produced, for registration / emission. */
  produced: Set<SdkModelType>;
}

/**
 * Result of projecting a model to a write visibility: the model to use for that
 * visibility (a split clone when `changed`, otherwise the original) and whether
 * the projection actually dropped anything.
 */
interface ModelProjection {
  model: SdkModelType;
  changed: boolean;
}

/**
 * Experimental pre-pass that splits request-body models by their write
 * visibility so that properties which are not part of an operation's write view
 * (e.g. required `@visibility(Lifecycle.Read)` ARM properties) no longer leak
 * into the generated input type.
 *
 * This is implemented entirely in the emitter (no TCGC dependency beyond the
 * public `SdkModelType` shape and the stable `@typespec/http` visibility
 * helpers). For every HTTP operation with a model request body it:
 *
 *  1. Resolves the write visibility from the verb (`POST` -> Create,
 *     `PUT` -> Create|Update, ...).
 *  2. Clone-projects the body model to that visibility, dropping properties that
 *     are not part of the payload and recursing into nested models (and, for
 *     discriminated bases, their whole subtype hierarchy). The original graph is
 *     never mutated, so response types keep the full (read) model.
 *  3. Repoints the operation's `bodyParam.type` and the corresponding client
 *     method parameters to the projected model.
 *  4. Registers every produced split model in `sdkPackage.models` so the
 *     subsequent `visitPackageTypes` graph walk emits them.
 *
 * Projected models are simply named `${sourceName}${suffix}` (e.g. `FooCreate`,
 * `FooCreateOrUpdate`). Deduplication against a same-named user model is left to
 * the emitter binder (see the NOTE below).
 *
 * Must run before `visitPackageTypes` so the repointed graph is picked up when
 * the emit queue is built.
 *
 * NOTE: name collisions between a synthesized split (`FooCreate`) and a
 * user-declared model of the same name are intentionally NOT resolved here in
 * this PoC — the emitter binder falls back to a positional `FooCreate_1` rename.
 * See the "Open question — collision-aware naming" section in the design doc.
 */
export function applyVisibilityModelSplit(context: SdkContext): void {
  if (!context.emitterOptions?.experimentalSplitModelsByVisibility) {
    return;
  }

  const state = createProjectionState(context);

  for (const client of context.sdkPackage.clients) {
    for (const method of getAllOperationsFromClient(client)) {
      repointMethodBody(state, method);
    }
  }

  // Register every produced split model (including nested ones) so the later
  // `visitPackageTypes` graph walk emits them. Each produced model is a freshly
  // created clone, so there is nothing to dedup against the existing list.
  for (const producedModel of state.produced) {
    context.sdkPackage.models.push(producedModel);
  }
}

function createProjectionState(context: SdkContext): ProjectionState {
  return {
    context,
    metadata: createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read }),
    cache: new Map<string, ModelProjection>(),
    produced: new Set<SdkModelType>(),
  };
}

/** Cache key for a `(model, visibility)` projection. */
function cacheKeyFor(model: SdkModelType, visibility: Visibility): string {
  return `${model.crossLanguageDefinitionId}|${visibility}`;
}

function projectModelToVisibility(
  state: ProjectionState,
  model: SdkModelType,
  visibility: Visibility,
): ModelProjection {
  const cacheKey = cacheKeyFor(model, visibility);
  const cachedProjection = state.cache.get(cacheKey);
  if (cachedProjection) {
    return cachedProjection;
  }

  // Any model that participates in a discriminated hierarchy — as the base *or*
  // as a subtype reached directly (e.g. an operation whose body is `Cat`, not
  // `Pet`) — is projected through the whole tree. This keeps a single set of
  // clones per hierarchy, so a subtype referenced directly reuses the same
  // re-parented clone instead of getting a duplicate `CatCreate`.
  const discriminatedRoot = findDiscriminatedRoot(model);
  if (discriminatedRoot) {
    projectDiscriminatedHierarchy(state, discriminatedRoot, visibility);
    // The hierarchy pass caches every node it changed (base + subtypes). If this
    // model wasn't cached, the whole tree collapsed → use the original.
    return state.cache.get(cacheKey) ?? { model, changed: false };
  }

  // Seed with the original before recursing so cyclic graphs terminate. A cyclic
  // back-reference to the same (model, visibility) resolves to the original
  // (unprojected) model; full cyclic write-model fidelity is a follow-up.
  const projection: ModelProjection = { model, changed: false };
  state.cache.set(cacheKey, projection);

  const { properties, changed } = projectOwnProperties(state, model, visibility);

  if (!changed) {
    // Collapse: the write view equals the full (read) model, keep the original.
    return projection;
  }

  const projectedModel: SdkModelType = {
    ...model,
    name: `${model.name}${getVisibilitySuffix(visibility, Visibility.Read)}`,
    properties,
  };
  projection.model = projectedModel;
  projection.changed = true;
  state.produced.add(projectedModel);
  return projection;
}

/**
 * Walks up a model's inheritance chain and returns the top-most ancestor that
 * declares a discriminator (`discriminatedSubtypes`), or `undefined` if neither
 * the model nor any ancestor is discriminated. Returns the model itself when it
 * is the discriminated base.
 */
function findDiscriminatedRoot(model: SdkModelType): SdkModelType | undefined {
  let root: SdkModelType | undefined;
  let current: SdkModelType | undefined = model;
  while (current) {
    if (current.discriminatedSubtypes) {
      root = current;
    }
    current = current.baseModel;
  }
  return root;
}

/**
 * Projects a model's own properties to the given visibility: drops properties
 * that are not part of the payload for this visibility and recurses into nested
 * model-typed properties. Inherited (base) properties are not included here —
 * `SdkModelType.properties` holds own properties only, so read-only props on a
 * base are stripped when that base is itself projected.
 */
function projectOwnProperties(
  state: ProjectionState,
  model: SdkModelType,
  visibility: Visibility,
): { properties: SdkModelPropertyType[]; changed: boolean } {
  let changed = false;
  const properties: SdkModelPropertyType[] = [];
  for (const property of model.properties) {
    // Drop properties not part of the payload for this visibility (e.g. required
    // read-only `id`/`name`). Metadata (`@header`/`@path`/...) is dropped too. If
    // `__raw` is missing we cannot decide and conservatively keep the property.
    if (
      property.kind === "property" &&
      property.__raw &&
      !state.metadata.isPayloadProperty(property.__raw, visibility)
    ) {
      changed = true;
      continue;
    }
    let projectedProperty = property;
    if (property.type.kind === "model") {
      const nestedProjection = projectModelToVisibility(state, property.type, visibility);
      if (nestedProjection.changed) {
        changed = true;
        projectedProperty = { ...property, type: nestedProjection.model };
      }
    }
    properties.push(projectedProperty);
  }
  return { properties, changed };
}

/**
 * Projects a discriminated base together with its full subtype hierarchy.
 *
 * The whole tree collapses (returns the original base, no clones) only when
 * neither the base nor any subtype loses a property to the write visibility.
 * Otherwise every node is cloned with the visibility suffix and re-wired:
 *  - each clone's `baseModel` points at its parent's clone (so a subtype that
 *    adds no read-only props of its own is *still* cloned — it must re-parent to
 *    the projected base to shed the base's read-only props it would inherit);
 *  - each clone's `discriminatedSubtypes` map points at the projected subtypes,
 *    so `getDirectSubtypes` finds them and the `${Base}Union` alias is emitted.
 *
 * Every node (base + subtypes) is cached, so a subtype reached directly by an
 * operation body resolves to the same clone as one reached through the base.
 */
function projectDiscriminatedHierarchy(
  state: ProjectionState,
  root: SdkModelType,
  visibility: Visibility,
): ModelProjection {
  const rootCacheKey = cacheKeyFor(root, visibility);
  const cachedRootProjection = state.cache.get(rootCacheKey);
  if (cachedRootProjection) {
    return cachedRootProjection;
  }

  // Seed the root before recursing so cyclic references terminate at the original.
  const rootProjection: ModelProjection = { model: root, changed: false };
  state.cache.set(rootCacheKey, rootProjection);

  // Collect the root and all of its (transitive) subtypes.
  const hierarchyModels: SdkModelType[] = [];
  const collectSubtree = (model: SdkModelType): void => {
    hierarchyModels.push(model);
    getDirectSubtypes(model).forEach(collectSubtree);
  };
  collectSubtree(root);

  // Project each model's own properties once (this also registers nested splits).
  // The tree renames together if any model changes; otherwise it collapses.
  const projectedPropsByModel = new Map(
    hierarchyModels.map(
      (model) => [model, projectOwnProperties(state, model, visibility)] as const,
    ),
  );
  const treeChanged = [...projectedPropsByModel.values()].some((projection) => projection.changed);
  if (!treeChanged) {
    return rootProjection;
  }

  const visibilitySuffix = getVisibilitySuffix(visibility, Visibility.Read);
  const cloneByOriginal = new Map<SdkModelType, SdkModelType>();

  // First pass: clone every model (suffixed, read-only props stripped) and cache
  // it so direct references reuse the clone.
  for (const model of hierarchyModels) {
    const clone: SdkModelType = {
      ...model,
      name: `${model.name}${visibilitySuffix}`,
      properties: projectedPropsByModel.get(model)!.properties,
    };
    cloneByOriginal.set(model, clone);
    state.produced.add(clone);
    state.cache.set(cacheKeyFor(model, visibility), {
      model: clone,
      changed: true,
    });
  }

  // Second pass: re-point inheritance and discriminator edges at the clones.
  for (const model of hierarchyModels) {
    const clone = cloneByOriginal.get(model)!;
    if (model.baseModel) {
      clone.baseModel = cloneByOriginal.get(model.baseModel) ?? model.baseModel;
    }
    if (model.discriminatedSubtypes) {
      clone.discriminatedSubtypes = Object.fromEntries(
        Object.entries(model.discriminatedSubtypes).map(([discriminatorValue, subtype]) => [
          discriminatorValue,
          cloneByOriginal.get(subtype) ?? subtype,
        ]),
      );
    }
  }

  return state.cache.get(rootCacheKey)!;
}

function repointMethodBody(
  state: ProjectionState,
  method: SdkServiceMethod<SdkHttpOperation>,
): void {
  const operation = method.operation;
  if (!operation?.bodyParam) {
    return;
  }

  const originalBodyType = operation.bodyParam.type;
  if (originalBodyType.kind !== "model") {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );
  const projectedBodyType = projectModelToVisibility(state, originalBodyType, visibility).model;
  if (projectedBodyType === originalBodyType) {
    // The write view is identical to the read model (collapse).
    return;
  }

  // Repoint the client-method parameters that reference the body model. If none
  // do (e.g. a spread body), leave the operation untouched in this PoC.
  let didRepointParam = false;
  for (const parameter of method.parameters) {
    if (parameter.type === originalBodyType) {
      parameter.type = projectedBodyType;
      didRepointParam = true;
    }
  }

  if (!didRepointParam) {
    return;
  }

  operation.bodyParam.type = projectedBodyType;
}
