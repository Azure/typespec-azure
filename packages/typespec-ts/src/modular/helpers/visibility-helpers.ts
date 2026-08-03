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

interface SplitState {
  context: SdkContext;
  /** Shared `@typespec/http` metadata oracle (canonical baseline = Read). */
  metadata: MetadataInfo;
  /**
   * Every reachable `(model, visibility)` pair in the write-body graph, keyed by
   * `${crossLanguageDefinitionId}|${visibility}`. Built in the collect phase;
   * carries the reference edges and per-node analysis flags.
   */
  nodes: Map<string, ModelNode>;
  /**
   * The write clone materialized for each node that `needsClone`, keyed the same
   * way as `nodes`. A node absent here collapsed (its write view equals the read
   * model).
   */
  cloneByKey: Map<string, SdkModelType>;
}

/**
 * A `(model, visibility)` vertex in the write-body reference graph.
 */
interface ModelNode {
  model: SdkModelType;
  visibility: Visibility;
  /**
   * Keys of the nodes this node references: its model-typed properties plus, for
   * a discriminated hierarchy, its base and direct subtypes. Edges are what the
   * needs-clone propagation walks; the discriminated links are bidirectional so
   * a whole hierarchy needs cloning together.
   */
  refKeys: Set<string>;
  /** True if the model drops at least one of its own properties under `visibility`. */
  ownPropertyDropped: boolean;
  /**
   * True if the node can reach any property-dropping node (itself included) — i.e.
   * its write view differs from the read model, so it needs a clone. Derived from
   * `ownPropertyDropped` by `markNodesNeedingClones`.
   */
  needsClone: boolean;
}

/**
 * Experimental pre-pass that splits request-body models by their write
 * visibility so that properties which are not part of an operation's write view
 * (e.g. required `@visibility(Lifecycle.Read)` ARM properties) no longer leak
 * into the generated input type.
 *
 * This is implemented entirely in the emitter (no TCGC dependency beyond the
 * public `SdkModelType` shape and the stable `@typespec/http` visibility
 * helpers). It runs as a single graph rewrite in four phases:
 *
 *  1. **Collect** — from every HTTP operation's model request body (resolving
 *     the write visibility from the verb: `POST` -> Create, `PUT` -> Create|Update,
 *     ...), walk the reachable `(model, visibility)` graph, recording reference
 *     edges (model-typed properties plus, for discriminated bases, their whole
 *     subtype hierarchy) and which nodes drop a property under that visibility.
 *  2. **Mark** — a node *needs a clone* iff it can reach any drop (transitive
 *     closure). Computed by reverse-propagating from the drop nodes, so cycles
 *     and mutual recursion fall out naturally with no special-casing.
 *  3. **Materialize + wire** — clone every node that needs one (suffixed, dropped
 *     properties removed) and, in a uniform sweep, repoint every clone's
 *     model-typed properties, `baseModel`, and `discriminatedSubtypes` at the
 *     matching clones. Because all clones exist before any wiring, self-cycles
 *     (`NodeCreate.next` -> `NodeCreate`), mutual recursion, and discriminated
 *     hierarchies are all handled by the same code. The original graph is never
 *     mutated, so response types keep the full (read) model.
 *  4. **Repoint operations** — walk `bodyParam.methodParameterSegments` (which
 *     map each client-method parameter to the HTTP payload) and point every
 *     model-typed parameter (plus the payload side — the whole `bodyParam.type`
 *     for a non-spread body, or the matching wrapper property for a *spread*
 *     body) at its clone, then register every clone in `sdkPackage.models` so the
 *     subsequent `visitPackageTypes` graph walk emits it.
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

  const state = createSplitState(context);
  const methods = context.sdkPackage.clients.flatMap((client) =>
    getAllOperationsFromClient(client),
  );

  // Phase 1 — collect the reachable write-body graph.
  for (const method of methods) {
    collectMethodRoots(state, method);
  }

  // Phase 2 — mark every node whose write view differs from the read model.
  markNodesNeedingClones(state);

  // Phase 3 — materialize the clones, then wire all reference edges uniformly.
  buildClones(state);

  // Phase 4 — repoint each operation body/parameters at the clones.
  for (const method of methods) {
    repointMethodBody(state, method);
  }

  // Register every produced clone so the later `visitPackageTypes` graph walk
  // emits it. Each is a freshly created model, so there is nothing to dedup.
  for (const clone of state.cloneByKey.values()) {
    context.sdkPackage.models.push(clone);
  }
}

function createSplitState(context: SdkContext): SplitState {
  return {
    context,
    metadata: createMetadataInfo(context.program, { canonicalVisibility: Visibility.Read }),
    nodes: new Map<string, ModelNode>(),
    cloneByKey: new Map<string, SdkModelType>(),
  };
}

/** Stable key identifying a `(model, visibility)` node (and its clone). */
function nodeKeyFor(model: SdkModelType, visibility: Visibility): string {
  return `${model.crossLanguageDefinitionId}|${visibility}`;
}

// ---------------------------------------------------------------------------
// Phase 1 — collect: build the reachable `(model, visibility)` reference graph.
// ---------------------------------------------------------------------------

/**
 * Collects the write-body roots of a single operation. Resolves the write
 * visibility from the verb, then walks `bodyParam.methodParameterSegments` (each
 * segment's root is a client-method parameter) and collects every model-typed
 * parameter as a graph root.
 */
function collectMethodRoots(
  state: SplitState,
  method: SdkServiceMethod<SdkHttpOperation>,
): void {
  const operation = method.operation;
  const bodyParam = operation?.bodyParam;
  if (!bodyParam || bodyParam.type.kind !== "model") {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );

  for (const segment of bodyParam.methodParameterSegments) {
    const methodParam = segment[0];
    if (!methodParam || methodParam.type.kind !== "model") {
      continue;
    }
    collectNode(state, methodParam.type, visibility);
  }
}

/**
 * Cycle-safe DFS that records a `(model, visibility)` node and its outgoing
 * reference edges, returning the node's key. The node is seeded in `state.nodes`
 * *before* recursing, so cyclic and mutually-recursive graphs terminate.
 *
 * Edges recorded:
 *  - one per model-typed own property whose target is (transitively) collected;
 *  - for a model in a discriminated hierarchy, *bidirectional* edges to its base
 *    and direct subtypes, and recursion into the whole tree. The bidirectional
 *    links make the needs-clone propagation treat the hierarchy as one unit (a
 *    subtype must re-parent to the projected base to shed inherited read-only
 *    props even when it drops nothing itself).
 *
 * `ownPropertyDropped` is set when the model omits at least one own property under this
 * visibility (a dropped payload property or metadata).
 */
function collectNode(
  state: SplitState,
  model: SdkModelType,
  visibility: Visibility,
): string {
  const key = nodeKeyFor(model, visibility);
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
    // A property not part of the payload for this visibility (e.g. required
    // read-only `id`/`name`, or `@header`/`@path` metadata) is a drop. If
    // `__raw` is missing we cannot decide and conservatively keep it.
    if (
      property.kind === "property" &&
      property.__raw &&
      !state.metadata.isPayloadProperty(property.__raw, visibility)
    ) {
      node.ownPropertyDropped = true;
      continue;
    }
    if (property.kind === "property" && property.type.kind === "model") {
      node.refKeys.add(collectNode(state, property.type, visibility));
    }
  }

  // Discriminated hierarchy: link base <-> subtypes bidirectionally and follow
  // the whole tree. Non-discriminated inheritance is intentionally not rewired.
  if (findDiscriminatedRoot(model)) {
    for (const neighbor of discriminatedNeighbors(model)) {
      const neighborKey = collectNode(state, neighbor, visibility);
      node.refKeys.add(neighborKey);
      state.nodes.get(neighborKey)!.refKeys.add(key);
    }
  }

  return key;
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

// ---------------------------------------------------------------------------
// Phase 2 — mark: a node changes iff it can reach any dropped property.
// ---------------------------------------------------------------------------

/**
 * Marks every node whose write view differs from the read model, so it needs a
 * clone. A node needs a clone iff it can reach (via reference edges) some node
 * that drops an own property — itself included. Computed by reverse-propagating
 * `needsClone` from the drop nodes, so self-cycles, mutual recursion, and
 * discriminated hierarchies (whose edges are bidirectional) all fall out with no
 * special-casing.
 */
function markNodesNeedingClones(state: SplitState): void {
  // Reverse adjacency: predecessors that reference each node.
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

  // Seed the queue with every own-drop node, then walk reverse edges.
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

// ---------------------------------------------------------------------------
// Phase 3 — build clones: materialize the nodes that need clones, then wire them.
// ---------------------------------------------------------------------------

/**
 * Builds the write clone for every node that `needsClone`, in two passes over the
 * graph. The two passes are the crux of the design, so they live together:
 *
 *  1. **Materialize** — allocate an *empty-bodied* clone (suffixed name, no
 *     properties yet) for every node that needs one. Nodes that need no clone
 *     collapse to the read model.
 *  2. **Wire** — now that *all* clones exist, fill each clone's edges by
 *     repointing at the other clones. Materializing every shell first is what
 *     lets a forward reference, a self-cycle (`NodeCreate.next` -> `NodeCreate`),
 *     or mutual recursion resolve to a clone instead of falling back to the read
 *     model — wiring can never observe a not-yet-created target.
 *
 * Wiring covers both:
 *  - own properties: dropped payload/metadata properties are removed, and each
 *    surviving model-typed property is repointed at its target's clone (if the
 *    target needs one);
 *  - discriminated hierarchy: `baseModel` and `discriminatedSubtypes` are
 *    repointed at the clones so a subtype re-parents to the projected base and
 *    `getDirectSubtypes` still finds the projected subtypes (driving the
 *    `${Base}Union` alias). Non-discriminated inheritance is left untouched.
 */
function buildClones(state: SplitState): void {
  // Pass 1 — materialize an empty-bodied shell for every node that needs a clone.
  for (const [key, node] of state.nodes) {
    if (!node.needsClone) {
      continue;
    }
    const clone: SdkModelType = {
      ...node.model,
      name: `${node.model.name}${getVisibilitySuffix(node.visibility, Visibility.Read)}`,
      properties: [],
    };
    state.cloneByKey.set(key, clone);
  }

  // Pass 2 — wire every clone's edges, now that all shells exist.
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
      if (property.kind === "property" && property.type.kind === "model") {
        const nestedClone = state.cloneByKey.get(nodeKeyFor(property.type, visibility));
        if (nestedClone) {
          wiredProperty = { ...property, type: nestedClone };
        }
      }
      properties.push(wiredProperty);
    }
    clone.properties = properties;

    if (findDiscriminatedRoot(model)) {
      if (model.baseModel) {
        clone.baseModel =
          state.cloneByKey.get(nodeKeyFor(model.baseModel, visibility)) ?? model.baseModel;
      }
      if (model.discriminatedSubtypes) {
        clone.discriminatedSubtypes = Object.fromEntries(
          Object.entries(model.discriminatedSubtypes).map(([discriminatorValue, subtype]) => [
            discriminatorValue,
            state.cloneByKey.get(nodeKeyFor(subtype, visibility)) ?? subtype,
          ]),
        );
      }
    }
  }
}

function repointMethodBody(
  state: SplitState,
  method: SdkServiceMethod<SdkHttpOperation>,
): void {
  const operation = method.operation;
  const bodyParam = operation?.bodyParam;
  if (!bodyParam || bodyParam.type.kind !== "model") {
    return;
  }

  const visibility = resolveRequestVisibility(
    state.context.program,
    operation.__raw.operation,
    operation.verb,
  );

  // TCGC exposes how each client-method parameter maps to the HTTP payload via
  // `bodyParam.methodParameterSegments`. Each segment is a path whose root
  // (`segment[0]`) is a method parameter; that object is the very same instance
  // held by `method.parameters`, so mutating its `.type` in place updates the
  // client signature (and every other reference to it) at once.
  //
  // The projection of each parameter is identical for spread and non-spread
  // bodies. Only the *payload* side differs:
  //   - Non-spread: the payload IS the body model (`segment[0].type === bodyParam.type`),
  //     so we repoint `bodyParam.type`, which drives the whole-model serializer.
  //   - Spread: `bodyParam.type` is a synthesized wrapper (never emitted) whose
  //     properties map to the individual parameters; `buildBodyParameter`
  //     serializes it by walking those properties, so we repoint the matching
  //     wrapper property instead of the wrapper itself.
  for (const segment of bodyParam.methodParameterSegments) {
    const methodParam = segment[0];
    if (!methodParam || methodParam.type.kind !== "model") {
      continue;
    }

    const clone = state.cloneByKey.get(nodeKeyFor(methodParam.type, visibility));
    if (!clone) {
      // The write view is identical to the read model (collapse).
      continue;
    }

    const originalType = methodParam.type;
    methodParam.type = clone;

    if (originalType === bodyParam.type) {
      // Non-spread: the method parameter *is* the whole body, so repoint the
      // payload model directly (drives the whole-model serializer).
      bodyParam.type = clone;
    } else {
      // Spread: the payload is a synthesized wrapper serialized property by
      // property, so repoint the wrapper property this parameter maps to.
      for (const bodyProperty of bodyParam.type.properties) {
        if (bodyProperty.type === originalType) {
          bodyProperty.type = clone;
        }
      }
    }
  }
}
