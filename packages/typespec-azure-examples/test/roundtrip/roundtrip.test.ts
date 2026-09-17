import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  crawlExamples,
  deriveOperationKey,
  loadExampleFile,
  materializeLegacyExample,
  migrate,
  resolveExampleFiles,
} from "../../src/index.js";

/**
 * Round-trip proof on a real (small) service pulled from `azure-rest-api-specs`
 * (`specification/contosowidgetmanager`, Microsoft.Contoso). It proves the migrate → resolve
 * pipeline is lossless: for every API version, the examples materialized back from the unified
 * `examples.yaml` reproduce each original `x-ms-examples` document — the `title`/`operationId`
 * envelope, `parameters`, and `responses` all match. (Parameter *ordering* is normalized by the
 * bucketing, so the match is structural, not necessarily a raw byte diff.)
 *
 * This is the CI gate described in the epic (#4838): a service can only adopt `examples.yaml` if the
 * generated legacy files match what shipped before.
 */

const fixtureRoot = fileURLToPath(new URL("./fixtures/contoso", import.meta.url));
// The service's linear version order (oldest first), as `service.yaml` would declare it.
const versionOrder = ["2021-10-01-preview", "2021-11-01"];

interface OriginalExample {
  readonly operationId: string;
  readonly doc: Record<string, unknown>;
  readonly bodyParameterName?: string;
}

function bodyParameterName(paramLocations: ReadonlyMap<string, string>): string | undefined {
  for (const [name, location] of paramLocations) {
    if (location === "body") return name;
  }
  return undefined;
}

describe("migrate → resolve round-trip (Microsoft.Contoso)", () => {
  it("reproduces every original x-ms-examples file for every version", async () => {
    // 1. Index the originals by (version, operation key), keeping each operation's body param name.
    const crawl = await crawlExamples(fixtureRoot);
    expect(crawl.examples.length).toBe(14); // 7 operations × 2 versions

    const originals = new Map<string, OriginalExample>();
    for (const example of crawl.examples) {
      const key = `${example.version}::${deriveOperationKey(example.operationId)}`;
      originals.set(key, {
        operationId: example.operationId,
        doc: example.doc as Record<string, unknown>,
        bodyParameterName: bodyParameterName(example.paramLocations),
      });
    }

    // 2. Migrate the whole tree into the unified format.
    const result = await migrate(fixtureRoot, { versionOrder });
    expect(result.operationCount).toBe(7);
    const files = result.files.map((file) => loadExampleFile(file.path, file.content));

    // The two versions differ only by `api-version`, so every lineage collapses to a single base
    // entry — the unified files carry no `since` at all.
    const mergedYaml = result.files.map((file) => file.content).join("\n");
    expect(mergedYaml).not.toContain("since:");

    // 3. For each version, resolve and reconstruct the legacy files, comparing to the originals.
    for (const version of versionOrder) {
      const resolved = resolveExampleFiles(files, version, versionOrder);
      expect(resolved.diagnostics).toEqual([]);
      expect(resolved.examples).toHaveLength(7);

      for (const example of resolved.examples) {
        const key = `${version}::${example.operation}`;
        const original = originals.get(key);
        expect(original, `no original example for ${key}`).toBeDefined();

        const legacy = materializeLegacyExample(example, {
          operationId: original!.operationId,
          apiVersion: version,
          bodyParameterName: original!.bodyParameterName,
        });

        // The full reconstructed document (title + operationId envelope, parameters, responses)
        // must match the original x-ms-examples file exactly.
        expect(legacy, `document mismatch for ${key}`).toEqual(original!.doc);
        // `title` must be the first key, matching the dominant legacy convention.
        expect(Object.keys(legacy).slice(0, 2)).toEqual(["title", "operationId"]);
      }

      // Completeness: every original at this version was reproduced.
      const reproduced = new Set(resolved.examples.map((example) => example.operation));
      const expected = [...originals.keys()]
        .filter((key) => key.startsWith(`${version}::`))
        .map((key) => key.slice(version.length + 2));
      for (const operation of expected) {
        expect(
          reproduced.has(operation),
          `missing reproduced example for ${version} ${operation}`,
        ).toBe(true);
      }
    }
  });
});
