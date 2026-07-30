import { mkdir, mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { resolveExamplesDir } from "../../src/resolve/index.js";

const serviceYaml = `
versions:
  - version: "2023-01-01"
    source: typespec
  - version: "2024-06-01"
    source: typespec
`;

const examplesYaml = `
$namespace: Microsoft.Test
Things.get:
  - request: { path: { id: "1" } }
    responses:
      200:
        body: { tier: base, nextLink: "https://h/x?api-version={api-version}" }
  - since: "2024-06-01"
    request: { path: { id: "1" } }
    responses:
      200:
        body: { tier: premium, nextLink: "https://h/x?api-version={api-version}" }
`;

async function fixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "examples-resolve-"));
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "service.yaml"), serviceYaml);
  await writeFile(join(dir, "examples.yaml"), examplesYaml);
  return dir;
}

describe("resolveExamplesDir (end-to-end)", () => {
  it("reads service.yaml order and resolves the base for the earliest version", async () => {
    const dir = await fixture();
    const result = await resolveExamplesDir(dir, "2023-01-01");
    expect(result.order).toEqual(["2023-01-01", "2024-06-01"]);
    expect(result.diagnostics).toEqual([]);
    expect(result.examples).toHaveLength(1);
    expect((result.examples[0].responses as any)["200"].body.tier).toBe("base");
  });

  it("resolves the since entry for the later version and materializes api-version", async () => {
    const dir = await fixture();
    const result = await resolveExamplesDir(dir, "2024-06-01");
    const body = (result.examples[0].responses as any)["200"].body;
    expect(body.tier).toBe("premium");
    expect(body.nextLink).toBe("https://h/x?api-version=2024-06-01");
  });
});
