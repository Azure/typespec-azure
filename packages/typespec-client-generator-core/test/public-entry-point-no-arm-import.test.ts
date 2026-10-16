import { expect, it, vi } from "vitest";
import { $linter } from "../src/index.js";

vi.mock("@azure-tools/typespec-azure-resource-manager", () => {
  throw new Error("Loading the TCGC public entry point must not require ARM.");
});

it("loads the TCGC public entry point without importing ARM", () => {
  expect($linter).toBeDefined();
});
