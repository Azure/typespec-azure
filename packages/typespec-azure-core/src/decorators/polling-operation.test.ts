import { Tester } from "#test/test-host.js";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { it } from "vitest";

it("emit error if response of operation is a scalar", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @put op foo(): string;

    @route("/polling")
    @get op bar(): string;
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/polling-operation-return-model",
    message: "An operation annotated with @pollingOperation must return a model or union of model.",
  });
});

it("emit error if response of operation is union with a scalar", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @put op foo(): {@statusCode _: 200} | string;

    @route("/polling")
    @get op bar(): string;
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/polling-operation-return-model",
    message: "An operation annotated with @pollingOperation must return a model or union of model.",
  });
});

it("succeed if response is a model", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @put op foo(): {};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Canceled"};
  `);
  expectDiagnosticEmpty(diagnostics);
});

it("succeed if response is a union of model", async () => {
  const diagnostics = await Tester.diagnose(`
    @pollingOperation(bar)
    @put op foo(): {@statusCode _: 200} | {@statusCode _: 201};

    @route("/polling")
    @get op bar(): {status: "Succeeded" | "Failed" | "Canceled"};
  `);
  expectDiagnosticEmpty(diagnostics);
});
