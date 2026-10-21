import { Tester } from "#test/test-host.js";
import { expectDiagnostics, t } from "@typespec/compiler/testing";
import assert from "assert";
import { it } from "vitest";
import { FinalStateValue, getFinalStateOverride } from "../state/final-state.js";

it("correctly overrides PUT lro final-state-via", async () => {
  const { foo, program } = await Tester.compile(t.code`
    @pollingOperation(bar)
    @useFinalStateVia("operation-location")
    @test @put op ${t.op("foo")}(): {@header("Operation-Location") loc: string};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);

  const finalState = getFinalStateOverride(program, foo);
  assert.deepStrictEqual(finalState, FinalStateValue.operationLocation);
});
it("correctly overrides original-uri regardless of decorator order on PUT", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @test @put @useFinalStateVia("original-uri") op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
  expectDiagnostics(diagnostics, []);

  const { foo, program } = await Tester.compile(t.code`
    @pollingOperation(bar)
    @test @put @useFinalStateVia("original-uri") op ${t.op("foo")}(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);

  const finalState = getFinalStateOverride(program, foo);
  assert.deepStrictEqual(finalState, FinalStateValue.originalUri);
});
it("emits diagnostic for invalid PUT override", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @useFinalStateVia("operation-location")
    @test @put op foo(): {loc: string};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/invalid-final-state",
    severity: "warning",
    message:
      "The response is missing the 'Operation-Location' header required by final-state-via 'operation-location'. For example, spread 'Azure.Core.Foundations.LongRunningStatusLocation' into the response model.",
  });
});

it.each([
  ["location", "Location", "TypeSpec.Http.LocationHeader"],
  [
    "azure-async-operation",
    "Azure-AsyncOperation",
    "Azure.ResourceManager.ArmAsyncOperationHeader",
  ],
])(
  "identifies the missing header and a response model for %s",
  async (finalState, header, model) => {
    const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @useFinalStateVia("${finalState}")
    @post op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/invalid-final-state",
      severity: "warning",
      message: `The response is missing the '${header}' header required by final-state-via '${finalState}'. For example, spread '${model}' into the response model.`,
    });
  },
);
it("emits error for original-uri on non-PUT/PATCH/POST request", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @useFinalStateVia("original-uri")
    @delete op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/invalid-final-state",
    message:
      "The final state value 'original-uri' can only be used in http PUT, PATCH, or POST operations",
  });
});
