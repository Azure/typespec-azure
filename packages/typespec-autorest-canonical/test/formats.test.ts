import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { diagnoseOpenApiFor, openApiFor } from "./test-host.js";

describe("typespec-autorestcanonical: format", () => {
  it("allows supported formats", async () => {
    const res = await openApiFor(
      `
      @service
      namespace Test;

      model Widget {
        @format("uuid")
        prop: string;
      }

      op get(): void;
      `
    );
    const model = res.definitions["Widget"]!;
    deepStrictEqual(model, {
      properties: {
        prop: {
          format: "uuid",
          type: "string",
        },
      },
      required: ["prop"],
      type: "object",
    });
  });

  it("emits diagnostic for unsupported formats", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      @service
      namespace Test;

      model Widget {
        @format("fake")
        prop: string;
      }

      op get(): void;
      `
    );
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-autorest-canonical/invalid-format",
        message:
          "'string' format 'fake' is not supported in Autorestcanonical. It will not be emitted.",
      },
    ]);
  });
});
