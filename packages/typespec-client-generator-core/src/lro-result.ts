import {
  FinalStateValue,
  type LroMetadata,
  type LroProtocolMetadata,
} from "@azure-tools/typespec-azure-core";
import {
  createDiagnosticCollector,
  isService,
  type DecoratorContext,
  type Diagnostic,
  type DiagnosticTarget,
  type Entity,
  type Model,
  type ModelProperty,
  type Operation,
  type Program,
  type Scalar,
} from "@typespec/compiler";
import { SyntaxKind, type IdentifierNode, type MemberExpressionNode } from "@typespec/compiler/ast";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import {
  getHttpOperation,
  getHttpService,
  isMetadata,
  isVisible,
  Visibility,
} from "@typespec/http";
import type { ClientLroMetadata, ClientLroResultSource } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";

/** @internal */
export interface ClientLroResultReference {
  result: Model | ModelProperty;
  root?: Model;
  properties?: ModelProperty[];
  target: DiagnosticTarget;
}

interface ResponseSource {
  model: Model;
  source: ClientLroResultSource;
}

/** @internal */
export interface ClientLroResultSelection extends ResponseSource {
  properties: ModelProperty[];
  result: Model | Scalar;
  requiresAdvancedSupport: boolean;
}

/** @internal */
export function captureClientLroResult(
  context: DecoratorContext,
  result: Model | ModelProperty,
): ClientLroResultReference {
  const argument = context.getArgumentTarget(0);
  const reference: ClientLroResultReference = {
    result,
    target: argument ?? context.decoratorTarget,
  };
  if (result.kind === "Model") return { ...reference, root: result, properties: [] };
  if (!argument || !("kind" in argument) || argument.kind !== SyntaxKind.TypeReference) {
    return reference;
  }

  const prefixes: (IdentifierNode | MemberExpressionNode)[] = [];
  function visit(node: IdentifierNode | MemberExpressionNode) {
    if (node.kind === SyntaxKind.MemberExpression) visit(node.base);
    prefixes.push(node);
  }
  visit(argument.target);
  const properties: ModelProperty[] = [];
  for (const prefix of prefixes) {
    const type = context.program.checker.getTypeForNode({ ...argument, target: prefix });
    if (type.kind === "Model" && reference.root === undefined) reference.root = type;
    if (type.kind === "ModelProperty") properties.push(type);
  }
  reference.properties = properties;
  return reference;
}

/** @internal */
export function resolveClientLroResult(
  program: Program,
  operation: Operation,
  protocol: LroProtocolMetadata | undefined,
  reference: ClientLroResultReference,
): [ClientLroResultSelection | undefined, readonly Diagnostic[]] {
  const diagnostics = createDiagnosticCollector();
  function invalid(reason: string) {
    diagnostics.add(
      createDiagnostic({
        code: "invalid-client-lro-result",
        target: reference.target,
        format: { reason },
      }),
    );
    return diagnostics.wrap(undefined);
  }
  if (!protocol) return invalid("@clientLroResult requires a discoverable LRO protocol.");

  const sources: ResponseSource[] = [
    { model: protocol.polling.pollingInfo.responseModel, source: { kind: "polling" } },
  ];
  const finalStep = protocol.completion.finalStep;
  if (
    (finalStep?.kind === "finalOperationLink" || finalStep?.kind === "finalOperationReference") &&
    finalStep.responseModel.kind === "Model"
  ) {
    sources.push({ model: finalStep.responseModel, source: { kind: "final-operation" } });
  }
  if (protocol.completion.finalStateVia === FinalStateValue.originalUri) {
    const httpOperation = diagnostics.pipe(getHttpOperation(program, operation));
    let service = operation.interface?.namespace ?? operation.namespace;
    while (service?.namespace && !isService(program, service)) service = service.namespace;
    if (service) {
      const httpService = diagnostics.pipe(getHttpService(program, service));
      for (const candidate of httpService.operations) {
        if (candidate.verb !== "get" || candidate.path !== httpOperation.path) continue;
        if (
          candidate.parameters.body ||
          candidate.parameters.parameters.some(
            (parameter) =>
              parameter.type !== "path" &&
              !parameter.param.optional &&
              !(
                parameter.type === "query" &&
                httpOperation.parameters.parameters.some(
                  (original) =>
                    original.type === "query" &&
                    original.name === parameter.name &&
                    !original.param.optional &&
                    sameTypeInstance(original.param.type, parameter.param.type),
                )
              ),
          )
        ) {
          continue;
        }
        const bodies = new Set(
          candidate.responses
            .filter(
              (response) =>
                response.statusCodes !== "*" &&
                (typeof response.statusCodes === "number"
                  ? response.statusCodes >= 200 && response.statusCodes < 300
                  : response.statusCodes.start >= 200 && response.statusCodes.end < 300),
            )
            .flatMap((response) => response.responses.map((r) => r.body?.type)),
        );
        if (bodies.size !== 1) continue;
        const body = bodies.values().next().value;
        if (body?.kind === "Model") {
          sources.push({
            model: body,
            source: { kind: "original-uri", operation: candidate.operation },
          });
        }
      }
    }
  }

  let matches: (ResponseSource & { properties: ModelProperty[] })[] = [];
  for (const source of sources) {
    if (reference.root) {
      const prefixes = sameTypeInstance(source.model, reference.root)
        ? [[]]
        : reference.result.kind === "ModelProperty"
          ? findReferenceRoutes(source.model, reference.root)
          : [];
      for (const prefix of prefixes) {
        const properties: ModelProperty[] = [...prefix];
        const prefixType = prefix.at(-1)?.type ?? source.model;
        let model: Model | undefined = prefixType.kind === "Model" ? prefixType : undefined;
        let valid = true;
        for (const property of reference.properties ?? []) {
          const actual: ModelProperty | undefined = model && getProperty(model, property);
          if (!actual) {
            valid = false;
            break;
          }
          properties.push(actual);
          model = actual.type.kind === "Model" ? actual.type : undefined;
        }
        if (valid) matches.push({ ...source, properties });
      }
    } else if (reference.result.kind === "ModelProperty") {
      for (const properties of findReferenceRoutes(source.model, reference.result)) {
        matches.push({ ...source, properties });
      }
    }
  }

  if (matches.length > 1) {
    const establishedKind =
      finalStep?.kind === "finalOperationLink" || finalStep?.kind === "finalOperationReference"
        ? "final-operation"
        : protocol.completion.finalStateVia === FinalStateValue.originalUri
          ? "original-uri"
          : "polling";
    const established = matches.filter((match) => match.source.kind === establishedKind);
    if (established.length === 1) matches = established;
  }
  if (matches.length === 0) {
    return invalid(
      "The reference does not select a response body or property of this operation's proven LRO protocol.",
    );
  }
  if (matches.length !== 1) {
    return invalid(
      "The reference is ambiguous between LRO response sources or property paths; use a reference whose source and complete path can be established.",
    );
  }

  const selection = matches[0];
  for (const property of selection.properties) {
    if (isMetadata(program, property) || !isVisible(program, property, Visibility.Read)) {
      return invalid("The selected path must contain only readable response-body properties.");
    }
    if (
      property.optional &&
      !(
        selection.source.kind === "polling" &&
        sameProperty(property, protocol.polling.pollingInfo.resultProperty)
      )
    ) {
      return invalid(
        "Optional result properties require a missing-value contract and are not supported by @clientLroResult.",
      );
    }
  }
  const result = selection.properties.at(-1)?.type ?? selection.model;
  if (result.kind !== "Model" && result.kind !== "Scalar") {
    return invalid(
      "@clientLroResult requires a model, scalar, or array result without null or union traversal.",
    );
  }
  const establishedKind =
    finalStep?.kind === "finalOperationLink" || finalStep?.kind === "finalOperationReference"
      ? "final-operation"
      : protocol.completion.finalStateVia === FinalStateValue.originalUri
        ? "original-uri"
        : "polling";
  return diagnostics.wrap({
    ...selection,
    result,
    requiresAdvancedSupport:
      selection.source.kind !== establishedKind ||
      selection.properties.length > 1 ||
      (selection.properties.length > 0 && selection.source.kind !== "polling") ||
      finalStep?.kind === "noPollingResult",
  });
}

function getProperty(model: Model, reference: ModelProperty): ModelProperty | undefined {
  for (let current: Model | undefined = model; current; current = current.baseModel) {
    const property = [...current.properties.values()].find((p) => sameProperty(p, reference));
    if (property) return property;
  }
  return undefined;
}

/** @internal */
export function preservesLroPagingPath(
  selection: ClientLroMetadata,
  baseline: LroMetadata,
  pagingPath: ModelProperty[],
): boolean {
  const envelope = baseline.finalEnvelopeResult;
  const selectedEnvelope = selection.finalEnvelopeResult;
  const pagingRoot = pagingPath[0]?.model;
  if (
    !envelope ||
    envelope === "void" ||
    envelope.kind !== "Model" ||
    !selectedEnvelope ||
    selectedEnvelope === "void" ||
    selectedEnvelope.kind !== "Model" ||
    !pagingRoot
  ) {
    return false;
  }
  const baselinePath =
    baseline.finalStep?.kind === "pollingSuccessProperty" ? [baseline.finalStep.target] : [];
  const canonical = alignPaths(envelope, baselinePath, pagingRoot, pagingPath);
  if (!canonical) return false;
  const selectedPath = selection.finalResultSegments ?? [];
  return alignPaths(selectedEnvelope, selectedPath, envelope, canonical) !== undefined;
}

function alignPaths(
  selectedRoot: Model,
  selected: ModelProperty[],
  declaredRoot: Model,
  declared: ModelProperty[],
): ModelProperty[] | undefined {
  const selectedModels = pathModels(selectedRoot, selected);
  const declaredModels = pathModels(declaredRoot, declared);
  // A shared leaf model must not hide a mismatch at an earlier, shared response ancestor.
  for (let i = 0; i < selectedModels.length; i++) {
    for (let j = 0; j < declaredModels.length; j++) {
      if (!compatibleModels(selectedModels[i], declaredModels[j])) continue;
      const suffix = selected.slice(i);
      if (
        suffix.length > declared.length - j ||
        !suffix.every((property, index) => sameProperty(property, declared[j + index]))
      ) {
        return undefined;
      }
      return [...selected.slice(0, i), ...declared.slice(j)];
    }
  }
  return undefined;
}

function pathModels(root: Model, path: ModelProperty[]): Model[] {
  const models = [root];
  for (const property of path) {
    if (property.type.kind !== "Model") break;
    models.push(property.type);
  }
  return models;
}

function compatibleModels(left: Model, right: Model): boolean {
  for (let current: Model | undefined = left; current; current = current.baseModel) {
    if (sameTypeInstance(current, right)) return true;
  }
  for (let current: Model | undefined = right; current; current = current.baseModel) {
    if (sameTypeInstance(left, current)) return true;
  }
  return false;
}

function sameProperty(left: ModelProperty, right: ModelProperty | undefined): boolean {
  if (!right) return false;
  return (
    left === right ||
    (left.node !== undefined &&
      left.node === right.node &&
      left.model !== undefined &&
      right.model !== undefined &&
      sameTypeInstance(left.model, right.model))
  );
}

function sameTypeInstance(left: Entity, right: Entity): boolean {
  if (left === right) return true;
  if (left.entityKind !== "Type" || right.entityKind !== "Type") return false;
  if (
    left.kind !== right.kind ||
    !left.node ||
    left.node !== right.node ||
    unsafe_Realm.realmForType.get(left) === unsafe_Realm.realmForType.get(right)
  ) {
    return false;
  }
  const leftArgs = "templateMapper" in left ? left.templateMapper?.args : undefined;
  const rightArgs = "templateMapper" in right ? right.templateMapper?.args : undefined;
  if (!leftArgs || !rightArgs) return leftArgs === rightArgs;
  return (
    leftArgs.length === rightArgs.length &&
    leftArgs.every((arg, index) => sameTypeInstance(arg, rightArgs[index]))
  );
}

function findReferenceRoutes(root: Model, target: Model | ModelProperty): ModelProperty[][] {
  const routes: ModelProperty[][] = [];
  const shortestRoutes = new Map<Model, ModelProperty[] | undefined>();
  function isTargetModel(model: Model): boolean {
    if (target.kind !== "Model") return false;
    for (let current: Model | undefined = model; current; current = current.baseModel) {
      if (sameTypeInstance(current, target)) return true;
    }
    return false;
  }
  function simpleRoute(root: Model): ModelProperty[] | undefined {
    const queue: { model: Model; path: ModelProperty[] }[] = [{ model: root, path: [] }];
    const visited = new Set<Model>();
    for (let index = 0; index < queue.length; index++) {
      const { model, path } = queue[index];
      if (visited.has(model)) continue;
      visited.add(model);
      if (isTargetModel(model)) return path;
      for (let current: Model | undefined = model; current; current = current.baseModel) {
        for (const property of current.properties.values()) {
          if (target.kind === "ModelProperty" && sameProperty(property, target)) {
            return [...path, property];
          }
          if (property.type.kind === "Model") {
            queue.push({ model: property.type, path: [...path, property] });
          }
        }
      }
    }
    return undefined;
  }
  function visit(model: Model, path: ModelProperty[], ancestors: Set<Model>) {
    if (routes.length > 1) return;
    if (!shortestRoutes.has(model)) shortestRoutes.set(model, simpleRoute(model));
    const suffix = shortestRoutes.get(model);
    if (!suffix) return;
    if (ancestors.has(model)) {
      routes.push([...path, ...suffix]);
      return;
    }
    if (isTargetModel(model)) routes.push(path);
    const nextAncestors = new Set(ancestors).add(model);
    for (let current: Model | undefined = model; current; current = current.baseModel) {
      for (const property of current.properties.values()) {
        if (target.kind === "ModelProperty" && sameProperty(property, target)) {
          routes.push([...path, property]);
        }
        if (property.type.kind === "Model") {
          visit(property.type, [...path, property], nextAncestors);
        }
      }
    }
  }
  visit(root, [], new Set());
  return routes;
}
