import {
  CodeFix,
  createRule,
  DecoratorApplication,
  getSourceLocation,
  Model,
  ModelProperty,
  Operation,
  paramMessage,
  Program,
  SemanticNodeListener,
} from "@typespec/compiler";
import { StringLiteralNode, SyntaxKind } from "@typespec/compiler/ast";
import { getAllHttpServices, HttpOperation } from "@typespec/http";
import { isInternalTypeSpec } from "./utils.js";

/**
 * No two ARM operation paths may differ only by casing.
 */
export const armNoPathCasingConflictsRule = createRule({
  name: "arm-no-path-casing-conflicts",
  severity: "warning",
  description: "Operation paths must be unique case-insensitively.",
  url: "https://azure.github.io/typespec-azure/docs/libraries/azure-resource-manager/rules/arm-no-path-casing-conflicts",
  messages: {
    default: paramMessage`Operation path '${"pathA"}' differs from operation path '${"pathB"}' only by character casing. Each ARM operation path must be unique case-insensitively.`,
  },
  create(context): SemanticNodeListener {
    return {
      root: (program: Program) => {
        const [services] = getAllHttpServices(program);

        // Bucket eligible operations by lowercased path. Path parameter names
        // are part of the comparison: `/{scope}/...` and `/{resourceUri}/...`
        // are in different buckets, while `/{scope}/...` and `/{Scope}/...`
        // share a bucket.
        const buckets = new Map<string, HttpOperation[]>();
        for (const service of services) {
          for (const op of service.operations) {
            if (op.operation.namespace && isInternalTypeSpec(program, op.operation.namespace)) {
              continue;
            }
            const key = op.path.toLowerCase();
            let bucket = buckets.get(key);
            if (bucket === undefined) {
              bucket = [];
              buckets.set(key, bucket);
            }
            bucket.push(op);
          }
        }

        for (const bucket of buckets.values()) {
          if (bucket.length < 2) continue;

          // Skip buckets where every path string is identical — exact
          // duplicates are handled by `@route`.
          const distinctSpellings = new Set(bucket.map((o) => o.path));
          if (distinctSpellings.size < 2) continue;

          // Sort deterministically by source location for stable diagnostics.
          const sorted = [...bucket].sort((a, b) => compareBySource(a.operation, b.operation));

          const firstPath = sorted[0].path;
          for (let i = 1; i < sorted.length; i++) {
            const op = sorted[i];
            if (op.path === firstPath) continue;

            const codefix = tryCreateSegmentCasingCodeFix(op, firstPath);

            context.reportDiagnostic({
              format: { pathA: op.path, pathB: firstPath },
              target: op.operation,
              codefixes: codefix ? [codefix] : undefined,
            });
          }
        }
      },
    };
  },
});

function compareBySource(a: Operation, b: Operation): number {
  const sa = getSourceLocation(a);
  const sb = getSourceLocation(b);
  const fa = sa?.file?.path ?? "";
  const fb = sb?.file?.path ?? "";
  if (fa !== fb) return fa < fb ? -1 : 1;
  const pa = sa?.pos ?? 0;
  const pb = sb?.pos ?? 0;
  return pa - pb;
}

/**
 * If the only differences between `offending.path` and `firstPath` are in
 * non-parameter literal segment tokens (i.e. they differ only by case), build
 * a CodeFix that lowercases the matching `@segment("...")` decorator string
 * literals reachable from this operation.
 */
function tryCreateSegmentCasingCodeFix(
  offending: HttpOperation,
  firstPath: string,
): CodeFix | undefined {
  const aTokens = offending.path.split("/");
  const bTokens = firstPath.split("/");
  if (aTokens.length !== bTokens.length) return undefined;

  const offendingSegments: string[] = [];
  for (let i = 0; i < aTokens.length; i++) {
    if (aTokens[i] === bTokens[i]) continue;
    if (aTokens[i].toLowerCase() !== bTokens[i].toLowerCase()) return undefined;
    const isParamA = aTokens[i].startsWith("{") && aTokens[i].endsWith("}");
    const isParamB = bTokens[i].startsWith("{") && bTokens[i].endsWith("}");
    if (isParamA || isParamB) {
      return undefined;
    }
    offendingSegments.push(aTokens[i]);
  }

  if (offendingSegments.length === 0) return undefined;

  // Find @segment decorator nodes whose argument matches an offending segment.
  const literalNodes = collectSegmentLiteralNodes(offending, new Set(offendingSegments));
  if (literalNodes.length === 0) return undefined;

  return {
    id: "arm-segment-to-lowercase",
    label: "Lowercase the conflicting @segment(...) value(s)",
    fix(fixContext) {
      return literalNodes.map((node) =>
        fixContext.replaceText(getSourceLocation(node), `"${node.value.toLowerCase()}"`),
      );
    },
  };
}

function collectSegmentLiteralNodes(op: HttpOperation, values: Set<string>): StringLiteralNode[] {
  const seen = new Set<unknown>();
  const result: StringLiteralNode[] = [];

  const visitDecorators = (decorators: readonly DecoratorApplication[]) => {
    for (const dec of decorators) {
      if (dec.decorator.name !== "$segment") continue;
      const node = dec.node;
      if (!node || node.arguments.length === 0) continue;
      const arg = node.arguments[0];
      if (arg.kind !== SyntaxKind.StringLiteral) continue;
      const stringNode = arg as StringLiteralNode;
      if (!values.has(stringNode.value)) continue;
      if (seen.has(stringNode)) continue;
      seen.add(stringNode);
      result.push(stringNode);
    }
  };

  const visitedModels = new Set<Model>();
  const visitModel = (model: Model) => {
    if (visitedModels.has(model)) return;
    visitedModels.add(model);
    for (const prop of model.properties.values()) {
      visitProperty(prop);
    }
    if (model.baseModel) visitModel(model.baseModel);
  };

  const visitedProps = new Set<ModelProperty>();
  const visitProperty = (prop: ModelProperty) => {
    if (visitedProps.has(prop)) return;
    visitedProps.add(prop);
    visitDecorators(prop.decorators);
    if (prop.type.kind === "Model") {
      visitModel(prop.type);
    }
  };

  // Scan operation's own decorators.
  visitDecorators(op.operation.decorators);

  // Scan the operation's parameter model and its referenced models for
  // @segment decorators (this typically reaches the resource's `name`
  // property where ARM segment decorators live).
  if (op.operation.parameters) {
    visitModel(op.operation.parameters);
  }

  return result;
}
