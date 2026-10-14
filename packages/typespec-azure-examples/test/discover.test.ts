import { mkdtemp, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { validateExamplesDir } from "../src/discover.js";

const examplesYaml = `
$namespace: Microsoft.Test
Things.get:
  - request: { path: { id: "1" } }
    responses:
      200: { body: { ok: true } }
  - since: "2024-06-01"
    request: { path: { id: "1" } }
    responses:
      200: { body: { ok: true } }
`;

async function fixture(serviceYaml: string | undefined): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "examples-discover-"));
  await writeFile(join(dir, "examples.yaml"), examplesYaml);
  if (serviceYaml !== undefined) {
    await writeFile(join(dir, "service.yaml"), serviceYaml);
  }
  return dir;
}

const codes = (diagnostics: { code: string }[]) => diagnostics.map((d) => d.code);

describe("validateExamplesDir service.yaml handling", () => {
  it("warns and skips the since check when service.yaml has no readable versions", async () => {
    const dir = await fixture("not: a version list\n");
    const { diagnostics } = await validateExamplesDir(dir);
    expect(codes(diagnostics)).toContain("invalid-service-yaml");
    expect(codes(diagnostics)).not.toContain("unknown-since-version");
  });

  it("runs the since check against a valid service.yaml", async () => {
    const dir = await fixture(`versions:\n  - version: "2024-06-01"\n`);
    const { diagnostics } = await validateExamplesDir(dir);
    expect(codes(diagnostics)).not.toContain("invalid-service-yaml");
    expect(codes(diagnostics)).not.toContain("unknown-since-version");
  });
});
