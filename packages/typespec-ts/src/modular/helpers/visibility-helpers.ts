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
 *     are not part of the payload and recursing into nested models. The original
 *     graph is never mutated, so response types keep the full (read) model.
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

  // Register every produced split model (including nested ones) for emission.
  const models = context.sdkPackage.models;
  const existing = new Set<SdkModelType>(models);
  for (const produced of state.produced) {
    if (!existing.has(produced)) {
      models.push(produced);
      existing.add(produced);
    }
  }
}

interface ProjectionState {
  context: SdkContext;
  /** Shared `@typespec/http` metadata oracle (canonical baseline = Read). */
  metadata: MetadataInfo;
  /** Memoized projections keyed by `${crossLanguageDefinitionId}|${visibility}`. */
  cache: Map<string, { result: SdkModelType; changed: boolean }>;
  /** Every distinct split model produced, for registration / emission. */
  produced: Set<SdkModelType>;
}

function createProjectionState(context: SdkContext): ProjectionState {
  return {
    context,
    metadata: createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read }),
    cache: new Map<string, { result: SdkModelType; changed: boolean }>(),
    produced: new Set<SdkModelType>(),
  };
}

function projectModelToVisibility(
  state: ProjectionState,
  model: SdkModelType,
  visibility: Visibility,
): { result: SdkModelType; changed: boolean } {
  const key = `${model.crossLanguageDefinitionId}|${visibility}`;
  const cached = state.cache.get(key);
  if (cached) {
    return cached;
  }

  // Seed with the original before recursing so cyclic graphs terminate. A cyclic
  // back-reference to the same (model, visibility) resolves to the original
  // (unprojected) model; full cyclic write-model fidelity is a follow-up.
  const holder = { result: model, changed: false };
  state.cache.set(key, holder);

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
      const nested = projectModelToVisibility(state, property.type, visibility);
      if (nested.changed) {
        changed = true;
        projectedProperty = { ...property, type: nested.result };
      }
    }
    properties.push(projectedProperty);
  }

  if (!changed) {
    // Collapse: the write view equals the full (read) model, keep the original.
    return holder;
  }

  const projected: SdkModelType = {
    ...model,
    name: `${model.name}${getVisibilitySuffix(visibility, Visibility.Read)}`,
    properties,
  };
  holder.result = projected;
  holder.changed = true;
  state.produced.add(projected);
  return holder;
}

function repointMethodBody(
  state: ProjectionState,
  method: SdkServiceMethod<SdkHttpOperation>,
): void {
  const operation = method.operation;
  if (!operation?.bodyParam) {
    return;
  }

  const original = operation.bodyParam.type;
  if (original.kind !== "model") {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );
  const projected = projectModelToVisibility(state, original, visibility).result;
  if (projected === original) {
    // The write view is identical to the read model (collapse).
    return;
  }

  // Repoint the client-method parameters that reference the body model. If none
  // do (e.g. a spread body), leave the operation untouched in this PoC.
  let repointedMethodParam = false;
  for (const parameter of method.parameters) {
    if (parameter.type === original) {
      parameter.type = projected;
      repointedMethodParam = true;
    }
  }

  if (!repointedMethodParam) {
    return;
  }

  operation.bodyParam.type = projected;
}
