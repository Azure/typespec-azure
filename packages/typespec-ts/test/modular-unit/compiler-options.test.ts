import type { CompilerOptions } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { afterEach, describe, it } from "vitest";
import { clearCompileCache, compileTypeSpecFor, rlcEmitterFor } from "../util/test-util.js";

const compilerOptions: CompilerOptions = {
  configFile: {
    projectRoot: ".",
    kind: "project",
    features: ["union-extends"],
    diagnostics: [],
    outputDir: "tsp-output",
  },
};

const code = `
model Named { name: string; }
model Cat extends Named { meow: boolean; }
union Pets extends Named { cat: Cat }
@route("/pets")
@post
op sendPet(@body pet: Pets): Pets;
`;

describe("Per-scenario compiler options", () => {
  afterEach(clearCompileCache);

  for (const [name, compile] of [
    [
      "rlcEmitterFor",
      (options: CompilerOptions) => rlcEmitterFor(code, { compilerOptions: options }),
    ],
    ["compileTypeSpecFor", (options: CompilerOptions) => compileTypeSpecFor(code, [], options)],
  ] as const) {
    it(`${name} keeps feature-enabled and feature-disabled compilations separate`, async () => {
      const disabled = await compile({});
      expectDiagnostics(disabled.program.diagnostics, {
        code: "union-extends-disabled",
      });

      const enabled = await compile(compilerOptions);
      expectDiagnosticEmpty(enabled.program.diagnostics);

      const disabledAgain = await compile({});
      expectDiagnostics(disabledAgain.program.diagnostics, {
        code: "union-extends-disabled",
      });
    });
  }
});
