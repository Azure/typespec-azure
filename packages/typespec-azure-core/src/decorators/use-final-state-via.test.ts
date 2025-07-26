import { expectDiagnostics, t } from "@typespec/compiler/testing";
import assert from "assert";
import { it } from "vitest";
import { Tester } from "../../test/test-host.js";
import { FinalStateValue } from "../lro-helpers.js";
import { getFinalStateOverride } from "../state/final-state.js";

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
    message:
      "There was no header corresponding to the desired final-state-via value 'operation-location'.",
  });
});

it("emits error for missing header", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @useFinalStateVia("location")
    @post op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/invalid-final-state",
    message: `There was no header corresponding to the desired final-state-via value 'location'.`,
  });
});
it("emits error for original-uri on non-PUT request", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @useFinalStateVia("original-uri")
    @post op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Cancelled"};
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/invalid-final-state",
    message: "The final state value 'original-uri' can only be used in http PUT operations",
  });
});
