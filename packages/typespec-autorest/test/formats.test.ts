import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import { AzureTester, diagnoseOpenApiFor, openApiFor } from "./test-host.js";

describe("typespec-autorest: format", () => {
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
      `,
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
      model Widget {
        @format("fake")
        prop: string;
      }
      `,
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/invalid-format",
      message: "'string' format 'fake' is not supported in Autorest. It will not be emitted.",
    });
  });

  it("emits diagnostic for unsupported encoding", async () => {
    const diagnostics = await diagnoseOpenApiFor(
      `
      model Widget {
        @encode(ArrayEncoding.commaDelimited)
        prop: string[];
      }
      `,
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-autorest/invalid-format",
      message:
        "'string' encoding format 'ArrayEncoding.commaDelimited' is not supported in Autorest. It will not be emitted.",
    });
  });

  it("does not emit diagnostic for Azure.Core scalars", async () => {
    const diagnostics = await AzureTester.diagnose(
      `
      @service
          namespace Test;

      model Widget {
        eTag: eTag;
        ipv4Address: ipV4Address;
        ipv6Address: ipV6Address;
      }

      op get(): void;
      `,
    );
    expectDiagnosticEmpty(diagnostics);
  });
});
