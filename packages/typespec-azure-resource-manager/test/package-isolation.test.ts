import { expect, it, vi } from "vitest";
import * as library from "../src/index.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

it("loads the ARM public entry point without emitter or TCGC dependencies", () => {
  expect(library.$lib.name).toBe("@azure-tools/typespec-azure-resource-manager");
});
