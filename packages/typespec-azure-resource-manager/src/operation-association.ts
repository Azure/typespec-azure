import type { Model, Namespace, Operation, Program } from "@typespec/compiler";
import { isDeclaredInNamespace } from "@typespec/compiler";
import {
  unsafe_mutateSubgraph,
  unsafe_mutateSubgraphWithNamespace,
  type unsafe_MutatorWithNamespace as MutatorWithNamespace,
  type unsafe_Realm as Realm,
} from "@typespec/compiler/experimental";
import { useStateMap } from "@typespec/compiler/utils";
import { reportDiagnostic } from "./lib.js";
import {
  getArmResourceOperationData,
  type ArmOperationIdentifier,
  type ArmOperationKind,
} from "./operations.js";
import { getResourceNameExpression, type ResourceNameExpression } from "./resource-name.js";
import { ArmStateKeys } from "./state.js";

interface ResourceIdentifier extends ArmOperationIdentifier {
  owner: Model;
}

interface SourceRegistration {
  resourceModel?: Model;
  identifiers: ResourceIdentifier[];
  expression?: ResourceNameExpression;
  operands: Set<Model>;
  selectedResources: Map<ArmOperationKind, Set<Model | undefined>>;
  selectedOperands?: Set<Model | undefined>;
}

interface AssociationContext {
  program: Program;
  version: string;
  namespace: Namespace;
  recipe: MutatorWithNamespace;
  sources: Map<Operation, SourceRegistration>;
  operations: Map<Operation, Operation>;
  models: Map<Model, Model>;
  failed: boolean;
}

function activeContext(program: Program): AssociationContext | undefined {
  return program
    .stateMap(ArmStateKeys.armOperationProjectionContext)
    .get(program.getGlobalNamespaceType());
}

function setActiveContext(program: Program, context: AssociationContext | undefined): void {
  const state = program.stateMap(ArmStateKeys.armOperationProjectionContext);
  const key = program.getGlobalNamespaceType();
  if (context === undefined) state.delete(key);
  else state.set(key, context);
}

function fail(context: AssociationContext, operation: Operation): false {
  if (!context.failed) {
    reportDiagnostic(context.program, {
      code: "arm-resource-version-operation-association",
      format: { version: context.version, operation: operation.name },
      target: operation,
    });
  }
  context.failed = true;
  return false;
}

function counterpart(context: AssociationContext, source: Model): Model | undefined {
  const cached = context.models.get(source);
  if (cached !== undefined) return cached;
  // Use the same recipe identity: the compiler can return an in-progress or cached clone.
  const result = unsafe_mutateSubgraph(context.program, [context.recipe], source).type;
  if (result.kind !== "Model") return undefined;
  context.models.set(source, result);
  return result;
}

/** Check before any operation registration can write through an original resource key. */
export function checkOperationResourceAssociation(
  program: Program,
  operation: Operation,
  resource: Model,
  kind: ArmOperationKind,
): boolean {
  const context = activeContext(program);
  if (context === undefined) return true;
  if (context.failed) return false;
  const source = context.operations.get(operation);
  // Namespace traversal also replays sibling services, which are outside this selection.
  if (source !== undefined && !isDeclaredInNamespace(source, context.namespace)) return false;
  const registration = source === undefined ? undefined : context.sources.get(source);
  if (registration === undefined) return fail(context, operation);
  let allowed = registration.selectedResources.get(kind);
  if (allowed === undefined) {
    const candidates = registration.identifiers
      .filter((identifier) => identifier.kind === kind)
      .map((identifier) => identifier.resource ?? identifier.owner);
    if (candidates.length === 0 && registration.resourceModel !== undefined) {
      candidates.push(registration.resourceModel);
    }
    allowed = new Set(candidates.map((model) => counterpart(context, model)));
    registration.selectedResources.set(kind, allowed);
  }
  return (!context.failed && allowed.has(resource)) || fail(context, operation);
}

/** Parent operands are independent of an operation's singular resource association. */
export function checkOperationResourceOperands(
  program: Program,
  operation: Operation,
  operands: readonly Model[],
): boolean {
  const context = activeContext(program);
  if (context === undefined) return true;
  if (context.failed) return false;
  const source = context.operations.get(operation);
  if (source !== undefined && !isDeclaredInNamespace(source, context.namespace)) return false;
  const registration = source === undefined ? undefined : context.sources.get(source);
  if (registration === undefined) return fail(context, operation);
  const expected = (registration.selectedOperands ??= new Set(
    [...registration.operands].map((model) => counterpart(context, model)),
  ));
  return (
    (!context.failed && operands.every((model) => expected.has(model))) || fail(context, operation)
  );
}

function identifierIndex(program: Program): Map<Operation, ResourceIdentifier[]> {
  const result = new Map<Operation, ResourceIdentifier[]>();
  for (const [owner, identifiers] of resourceIdentifiers(program)) {
    for (const identifier of identifiers) {
      let records = result.get(identifier.operation);
      if (records === undefined) {
        records = [];
        result.set(identifier.operation, records);
      }
      records.push({ ...identifier, owner });
    }
  }
  return result;
}

const [, , resourceIdentifiers] = useStateMap<Model, Set<ArmOperationIdentifier>>(
  ArmStateKeys.resourceOperationList,
);
const [, , operationMetadata] = useStateMap<
  Operation,
  NonNullable<ReturnType<typeof getArmResourceOperationData>>
>(ArmStateKeys.armResourceOperationData);

function isModel(value: unknown): value is Model {
  return (
    typeof value === "object" &&
    value !== null &&
    "entityKind" in value &&
    value.entityKind === "Type" &&
    "kind" in value &&
    value.kind === "Model"
  );
}

function collectOperands(expression: ResourceNameExpression | undefined, models: Set<Model>) {
  if (expression === undefined) return;
  switch (expression.kind) {
    case "model":
    case "legacy-resource":
    case "legacy-extension":
      models.add(expression.model);
      break;
    case "concat":
      expression.parts.forEach((part) => collectOperands(part, models));
      break;
  }
}

function captureSources(
  program: Program,
  namespace: Namespace,
): Map<Operation, SourceRegistration> {
  const identifiers = identifierIndex(program);
  const result = new Map<Operation, SourceRegistration>();
  const metadata = operationMetadata(program);
  for (const operation of new Set([...metadata.keys(), ...identifiers.keys()])) {
    if (!isDeclaredInNamespace(operation, namespace)) continue;
    const expression = getResourceNameExpression(program, operation);
    const operands = new Set<Model>();
    collectOperands(expression, operands);
    for (const application of operation.decorators) {
      for (const argument of application.args) {
        if (isModel(argument.jsValue)) operands.add(argument.jsValue);
      }
    }
    result.set(operation, {
      resourceModel: getArmResourceOperationData(program, operation)?.resourceModel,
      identifiers: identifiers.get(operation) ?? [],
      expression,
      operands,
      selectedResources: new Map(),
    });
  }
  return result;
}

function expressionMatches(
  context: AssociationContext,
  source: ResourceNameExpression | undefined,
  selected: ResourceNameExpression | undefined,
): boolean {
  if (source === undefined || selected === undefined) return source === selected;
  switch (source.kind) {
    case "model":
    case "legacy-resource":
    case "legacy-extension":
      return source.kind === selected.kind && counterpart(context, source.model) === selected.model;
    case "concat":
      return (
        selected.kind === "concat" &&
        source.parts.length === selected.parts.length &&
        source.parts.every((part, index) => expressionMatches(context, part, selected.parts[index]))
      );
    case "explicit":
    case "literal":
      return source.kind === selected.kind && source.value === selected.value;
  }
}

function retainedOperations(namespace: Namespace): Set<Operation> {
  const operations = new Set<Operation>();
  visit(namespace);
  return operations;

  function visit(current: Namespace) {
    for (const operation of current.operations.values()) operations.add(operation);
    for (const iface of current.interfaces.values()) {
      for (const operation of iface.operations.values()) operations.add(operation);
    }
    for (const child of current.namespaces.values()) visit(child);
  }
}

function validate(context: AssociationContext, namespace: Namespace): boolean {
  const selectedIdentifiers = identifierIndex(context.program);
  for (const operation of retainedOperations(namespace)) {
    const source = context.operations.get(operation);
    const registration = source === undefined ? undefined : context.sources.get(source);
    const metadata = getArmResourceOperationData(context.program, operation);
    const actual = selectedIdentifiers.get(operation) ?? [];
    if (registration === undefined) {
      if (metadata !== undefined || actual.length > 0) return fail(context, operation);
      continue;
    }
    if (
      registration.resourceModel !== undefined &&
      counterpart(context, registration.resourceModel) !== metadata?.resourceModel
    ) {
      return fail(context, operation);
    }
    // Each resource-keyed identifier is independent of first-write operation metadata.
    const expected = new Map<Model, Map<Model | undefined, Map<string, number>>>();
    for (const identifier of registration.identifiers) {
      const owner = counterpart(context, identifier.owner);
      const resource =
        identifier.resource === undefined ? undefined : counterpart(context, identifier.resource);
      if (owner === undefined || (identifier.resource !== undefined && resource === undefined)) {
        return fail(context, operation);
      }
      let resources = expected.get(owner);
      if (resources === undefined) expected.set(owner, (resources = new Map()));
      let kinds = resources.get(resource);
      if (kinds === undefined) resources.set(resource, (kinds = new Map()));
      const key = `${identifier.kind}:${identifier.resourceKind ?? ""}`;
      kinds.set(key, (kinds.get(key) ?? 0) + 1);
    }
    if (actual.length !== registration.identifiers.length) return fail(context, operation);
    for (const identifier of actual) {
      const kinds = expected.get(identifier.owner)?.get(identifier.resource);
      const key = `${identifier.kind}:${identifier.resourceKind ?? ""}`;
      const count = kinds?.get(key) ?? 0;
      if (count === 0) return fail(context, operation);
      kinds!.set(key, count - 1);
    }
    if (
      !expressionMatches(
        context,
        registration.expression,
        getResourceNameExpression(context.program, operation),
      )
    ) {
      return fail(context, operation);
    }
  }
  return !context.failed;
}

export function projectArmResourceNamespace(
  program: Program,
  namespace: Namespace,
  recipe: MutatorWithNamespace,
  version: string,
): { providerNamespace: Namespace; realm: Realm } | undefined {
  if (typeof recipe.Operation !== "function") {
    reportDiagnostic(program, {
      code: "arm-resource-version-projection-failed",
      format: { version },
      target: namespace,
    });
    return undefined;
  }
  const originalOperation = recipe.Operation;
  const context: AssociationContext = {
    program,
    version,
    namespace,
    recipe: {
      ...recipe,
      Operation(source, selected, p, realm) {
        context.operations.set(selected, source);
        originalOperation(source, selected, p, realm);
      },
    },
    sources: captureSources(program, namespace),
    operations: new Map(),
    models: new Map(),
    failed: false,
  };
  const previous = activeContext(program);
  setActiveContext(program, context);
  try {
    const projection = unsafe_mutateSubgraphWithNamespace(program, [context.recipe], namespace);
    if (context.failed) return undefined;
    if (projection.realm === null || projection.type.kind !== "Namespace") {
      reportDiagnostic(program, {
        code: "arm-resource-version-projection-failed",
        format: { version },
        target: namespace,
      });
      return undefined;
    }
    if (!validate(context, projection.type)) return undefined;
    return { providerNamespace: projection.type, realm: projection.realm };
  } finally {
    setActiveContext(program, previous);
  }
}
