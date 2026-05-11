import {
  createRule,
  getSourceLocation,
  Operation,
  paramMessage,
  Program,
  SemanticNodeListener,
} from "@typespec/compiler";
import { getAllHttpServices } from "@typespec/http";
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
        const buckets = new Map<string, { path: string; operation: Operation }[]>();
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
            bucket.push({ path: op.path, operation: op.operation });
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

            context.reportDiagnostic({
              format: { pathA: op.path, pathB: firstPath },
              target: op.operation,
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
