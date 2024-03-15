import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { ok } from "assert";
import { describe, expect, it } from "vitest";
import { getOperations } from "./test-host.js";

describe("Foundations.Operation", () => {
  it("apply request trait", async () => {
    const [operations, diagnostics] = await getOperations(
      `
      alias RequestHeadersTraits = Azure.Core.Traits.RequestHeadersTrait<{
        @header headerViaTrait: string;
      }>;

      @test op test is Azure.Core.Foundations.Operation<{}, void, RequestHeadersTraits>;
      `
    );
    expectDiagnosticEmpty(diagnostics);

    ok(operations.length === 1);

    const contentTypeParam = operations[0].parameters.parameters.find(
      (p) => p.name === "header-via-trait"
    );
    ok(contentTypeParam, "Should have a parameter called 'header-via-trait'");
    expect(contentTypeParam.type).toBe("header");
    expect(contentTypeParam.param.name).toBe("headerViaTrait");
  });
});
