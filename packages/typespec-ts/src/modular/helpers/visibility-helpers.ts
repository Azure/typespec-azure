import { UsageFlags } from "@azure-tools/typespec-client-generator-core";
import type {
  SdkHttpOperation,
  SdkModelPropertyType,
  SdkModelType,
  SdkServiceMethod,
  SdkType,
} from "@azure-tools/typespec-client-generator-core";
import {
  Visibility,
  createMetadataInfo,
  getVisibilitySuffix,
  resolveRequestVisibility,
} from "@typespec/http";
import type { MetadataInfo } from "@typespec/http";

import { getAllOperationsFromClient } from "../../framework/hooks/sdk-types.js";
import type { SdkContext } from "../../utils/interfaces.js";
import { getDirectSubtypes } from "./type-helpers.js";

const responseUsageFlags =
  UsageFlags.Output |
  UsageFlags.Exception |
  UsageFlags.LroInitial |
  UsageFlags.LroPolling |
  UsageFlags.LroFinalEnvelope;

interface SplitState {
  context: SdkContext;
  /** Shared `@typespec/http` metadata oracle (canonical baseline = Read). */
  metadata: MetadataInfo;
  /**
   * Every reachable `(model, visibility)` pair in the write-body graph, keyed by
   * an emitter-local model identity plus visibility.
   */
  nodes: Map<string, ModelNode>;
  /**
   * The write clone materialized for each node that `needsClone`, keyed the same
   * way as `nodes`.
   */
  cloneByKey: Map<string, SdkModelType>;
  /** Stable emitter-local IDs preserving `SdkModelType` object identity. */
  modelIds: WeakMap<SdkModelType, number>;
  nextModelId: number;
}

/** A `(model, visibility)` vertex in the write-body reference graph. */
interface ModelNode {
  model: SdkModelType;
  visibility: Visibility;
  /**
   * Keys of referenced nodes. Discriminated hierarchy links are bidirectional
   * so the whole hierarchy is projected together.
   */
  refKeys: Set<string>;
  /** True if the model drops at least one own property under `visibility`. */
  ownPropertyDropped: boolean;
  /** True if this node can reach any property-dropping node. */
  needsClone: boolean;
}

/**
 * Projects request models whose write graph differs from their read graph.
 * This must run before `visitPackageTypes` builds the emit queue.
 */
export function applyVisibilityModelSplit(context: SdkContext): void {
  if (!context.emitterOptions?.experimentalSplitModelsByVisibility) {
    return;
  }

  const state = createSplitState(context);
  const methods = context.sdkPackage.clients.flatMap((client) =>
    getAllOperationsFromClient(client),
  );

  // Phase 1 — collect the reachable `(model, visibility)` reference graph.
  for (const method of methods) {
    collectMethodRoots(state, method);
  }

  // Phase 2 — mark models whose write graph differs from their read graph.
  markNodesNeedingClones(state);

  // Phase 3 — materialize projected models and wire their references.
  buildClones(state);

  // Phase 4 — repoint operation parameters and payloads to projected models.
  for (const method of methods) {
    repointMethodBody(state, method);
  }

  // Register projected models for the subsequent emit queue traversal.
  for (const clone of state.cloneByKey.values()) {
    context.sdkPackage.models.push(clone);
  }
}

/** Creates the graph state using Read as the canonical model visibility. */
function createSplitState(context: SdkContext): SplitState {
  return {
    context,
    metadata: createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read }),
    nodes: new Map<string, ModelNode>(),
    cloneByKey: new Map<string, SdkModelType>(),
    modelIds: new WeakMap<SdkModelType, number>(),
    nextModelId: 0,
  };
}

/** Stable key identifying a `(model, visibility)` node (and its clone). */
function nodeKeyFor(state: SplitState, model: SdkModelType, visibility: Visibility): string {
  let modelId = state.modelIds.get(model);
  if (modelId === undefined) {
    modelId = state.nextModelId++;
    state.modelIds.set(model, modelId);
  }
  return `${modelId}|${visibility}`;
}

/**
 * Collects the write-body roots of a single operation. The root of each
 * `methodParameterSegments` entry is the client-method parameter.
 */
function collectMethodRoots(state: SplitState, method: SdkServiceMethod<SdkHttpOperation>): void {
  const operation = method.operation;
  const bodyParam = operation?.bodyParam;
  if (!bodyParam) {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );

  for (const segment of bodyParam.methodParameterSegments) {
    const methodParam = segment[0];
    if (!methodParam) {
      continue;
    }
    collectReferencedModels(state, methodParam.type, visibility, new Set<string>());
  }
}

/**
 * Cycle-safe DFS that records a `(model, visibility)` node and its outgoing
 * references. Nodes are registered before recursion so cyclic graphs terminate.
 */
function collectNode(state: SplitState, model: SdkModelType, visibility: Visibility): string {
  const key = nodeKeyFor(state, model, visibility);
  if (state.nodes.has(key)) {
    return key;
  }

  const node: ModelNode = {
    model,
    visibility,
    refKeys: new Set<string>(),
    ownPropertyDropped: false,
    needsClone: false,
  };
  // Seed before recursing so cycles terminate at the already-seeded node.
  state.nodes.set(key, node);

  for (const property of model.properties) {
    if (
      property.kind === "property" &&
      property.__raw &&
      !state.metadata.isPayloadProperty(property.__raw, visibility)
    ) {
      node.ownPropertyDropped = true;
      continue;
    }

    if (property.kind === "property") {
      collectReferencedModels(state, property.type, visibility, node.refKeys);
    }
  }

  if (model.baseModel) {
    node.refKeys.add(collectNode(state, model.baseModel, visibility));
  }

  // Link base and subtypes bidirectionally so the projected hierarchy stays together.
  if (findDiscriminatedRoot(model)) {
    for (const neighbor of discriminatedNeighbors(model)) {
      const neighborKey = collectNode(state, neighbor, visibility);
      node.refKeys.add(neighborKey);
      state.nodes.get(neighborKey)!.refKeys.add(key);
    }
  }

  return key;
}

/** Collects model references nested in supported container types. */
function collectReferencedModels(
  state: SplitState,
  type: SdkType,
  visibility: Visibility,
  refKeys: Set<string>,
): void {
  if (type.kind === "model") {
    refKeys.add(collectNode(state, type, visibility));
    return;
  }
  switch (type.kind) {
    case "array":
    case "dict":
      collectReferencedModels(state, type.valueType, visibility, refKeys);
      break;
    case "nullable":
      collectReferencedModels(state, type.type, visibility, refKeys);
      break;
    case "tuple":
      for (const valueType of type.valueTypes) {
        collectReferencedModels(state, valueType, visibility, refKeys);
      }
      break;
    case "union":
      for (const variantType of type.variantTypes) {
        collectReferencedModels(state, variantType, visibility, refKeys);
      }
      break;
  }
}

/** The base model and direct subtypes that share a node's discriminated tree. */
function discriminatedNeighbors(model: SdkModelType): SdkModelType[] {
  const neighbors: SdkModelType[] = [];
  if (model.baseModel) {
    neighbors.push(model.baseModel);
  }
  neighbors.push(...getDirectSubtypes(model));
  return neighbors;
}

/**
 * Walks up the inheritance chain and returns the top-most ancestor that
 * declares a discriminator.
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
 * Marks nodes whose write graph differs from the read graph by
 * reverse-propagating from nodes that directly drop a property.
 */
function markNodesNeedingClones(state: SplitState): void {
  // Reverse edges propagate a nested difference back to every parent.
  const predecessors = new Map<string, string[]>();
  for (const [key, node] of state.nodes) {
    for (const referencedKey of node.refKeys) {
      let referrers = predecessors.get(referencedKey);
      if (!referrers) {
        referrers = [];
        predecessors.set(referencedKey, referrers);
      }
      referrers.push(key);
    }
  }

  const queue: string[] = [];
  for (const [key, node] of state.nodes) {
    if (node.ownPropertyDropped) {
      node.needsClone = true;
      queue.push(key);
    }
  }
  while (queue.length > 0) {
    const key = queue.shift()!;
    for (const predecessorKey of predecessors.get(key) ?? []) {
      const predecessor = state.nodes.get(predecessorKey)!;
      if (!predecessor.needsClone) {
        predecessor.needsClone = true;
        queue.push(predecessorKey);
      }
    }
  }
}

/**
 * Creates projected model shells, then wires properties and inheritance after
 * every shell exists. This ordering lets forward, cyclic, and mutually recursive
 * references resolve to projected models instead of the original read models.
 */
function buildClones(state: SplitState): void {
  // Pass 1: create every shell before wiring references.
  for (const [key, node] of state.nodes) {
    if (!node.needsClone) {
      continue;
    }
    const clone: SdkModelType = {
      ...node.model,
      name: `${node.model.name}${getVisibilitySuffix(node.visibility, Visibility.Read)}`,
      properties: [],
      usage: (node.model.usage | UsageFlags.Input) & ~responseUsageFlags,
    };
    state.cloneByKey.set(key, clone);
  }

  // Pass 2: remove dropped properties and wire surviving references.
  for (const [key, node] of state.nodes) {
    const clone = state.cloneByKey.get(key);
    if (!clone) {
      continue;
    }
    const { model, visibility } = node;

    const properties: SdkModelPropertyType[] = [];
    for (const property of model.properties) {
      if (
        property.kind === "property" &&
        property.__raw &&
        !state.metadata.isPayloadProperty(property.__raw, visibility)
      ) {
        continue;
      }
      let wiredProperty = property;
      if (property.kind === "property") {
        const projectedType = projectTypeReferences(state, property.type, visibility);
        if (projectedType !== property.type) {
          wiredProperty = { ...property, type: projectedType };
        }
      }
      properties.push(wiredProperty);
    }
    clone.properties = properties;

    if (model.baseModel) {
      clone.baseModel =
        state.cloneByKey.get(nodeKeyFor(state, model.baseModel, visibility)) ?? model.baseModel;
    }
    if (findDiscriminatedRoot(model)) {
      if (model.discriminatedSubtypes) {
        clone.discriminatedSubtypes = Object.fromEntries(
          Object.entries(model.discriminatedSubtypes).map(([discriminatorValue, subtype]) => [
            discriminatorValue,
            state.cloneByKey.get(nodeKeyFor(state, subtype, visibility)) ?? subtype,
          ]),
        );
      }
    }
  }
}

/** Replaces model references nested in supported container types. */
function projectTypeReferences(state: SplitState, type: SdkType, visibility: Visibility): SdkType {
  if (type.kind === "model") {
    return state.cloneByKey.get(nodeKeyFor(state, type, visibility)) ?? type;
  }
  switch (type.kind) {
    case "array":
    case "dict": {
      const projectedValueType = projectTypeReferences(state, type.valueType, visibility);
      return projectedValueType === type.valueType
        ? type
        : { ...type, valueType: projectedValueType };
    }
    case "nullable": {
      const projectedType = projectTypeReferences(state, type.type, visibility);
      return projectedType === type.type ? type : { ...type, type: projectedType };
    }
    case "tuple": {
      const projectedValueTypes = type.valueTypes.map((valueType) =>
        projectTypeReferences(state, valueType, visibility),
      );
      return projectedValueTypes.every((valueType, index) => valueType === type.valueTypes[index])
        ? type
        : { ...type, valueTypes: projectedValueTypes };
    }
    case "union": {
      const projectedVariantTypes = type.variantTypes.map((variantType) =>
        projectTypeReferences(state, variantType, visibility),
      );
      return projectedVariantTypes.every(
        (variantType, index) => variantType === type.variantTypes[index],
      )
        ? type
        : { ...type, variantTypes: projectedVariantTypes };
    }
  }
  return type;
}

/**
 * Repoints client-method parameters and their HTTP payload representation to
 * projected models.
 */
function repointMethodBody(state: SplitState, method: SdkServiceMethod<SdkHttpOperation>): void {
  const operation = method.operation;
  const bodyParam = operation?.bodyParam;
  if (!bodyParam) {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );

  for (const segment of bodyParam.methodParameterSegments) {
    const methodParam = segment[0];
    if (!methodParam) {
      continue;
    }

    const originalType = methodParam.type;
    const projectedType = projectTypeReferences(state, originalType, visibility);
    if (projectedType === originalType) {
      // The write view is identical to the read model (collapse).
      continue;
    }

    methodParam.type = projectedType;

    if (originalType === bodyParam.type) {
      // A non-spread body uses the method parameter model as the payload model.
      bodyParam.type = projectedType;
    } else if (bodyParam.type.kind === "model") {
      // A spread body uses a synthesized wrapper serialized property by property.
      for (const bodyProperty of bodyParam.type.properties) {
        if (bodyProperty.type === originalType) {
          bodyProperty.type = projectedType;
        }
      }
    }
  }
}
