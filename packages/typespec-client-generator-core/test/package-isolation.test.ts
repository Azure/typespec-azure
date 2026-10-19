import { expect, it, vi } from "vitest";
import * as library from "../src/index.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});

it("loads the SDK public entry point without the AutoRest emitter", () => {
  expect(library.$lib.name).toBe("@azure-tools/typespec-client-generator-core");
});
