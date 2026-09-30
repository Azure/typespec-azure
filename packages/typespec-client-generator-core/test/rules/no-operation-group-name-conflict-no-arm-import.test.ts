import { expect, it, vi } from "vitest";

vi.mock("@azure-tools/typespec-azure-resource-manager", () => {
  throw new Error("Loading the TCGC public entry point must not require ARM.");
});

it("loads the TCGC public entry point without importing ARM", async () => {
  const { $linter } = await import("../../src/index.js");
  expect($linter).toBeDefined();
});
