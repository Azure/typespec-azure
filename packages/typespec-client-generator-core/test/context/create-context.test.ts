import { resolvePath } from "@typespec/compiler";
import { findTestPackageRoot, resolveVirtualPath } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { readFile } from "fs/promises";
import { beforeEach, describe, it } from "vitest";
import { createSdkContext } from "../../src/context.js";
import { listClients } from "../../src/decorators.js";
import { SdkTestLibrary } from "../../src/testing/index.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("createSdkContext", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("multiple call with versioning", async () => {
    const tsp = `
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
      }

      @client({name: "TestClient"})
      @test
      interface Test {}
    `;

    const runnerWithVersion = await createSdkTestRunner({
      emitterName: "@azure-tools/typespec-python",
    });

    await runnerWithVersion.compile(tsp);
    let clients = listClients(runnerWithVersion.context);
    strictEqual(clients.length, 1);
    ok(clients[0].type);

    const newSdkContext = await createSdkContext(runnerWithVersion.context.emitContext);
    clients = listClients(newSdkContext);
    strictEqual(clients.length, 1);
    ok(clients[0].type);
  });

  it("export TCGC output from emitter", async () => {
    await runner.compile(
      `
      @service({
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input)
      model Test{
      }
    `,
      {
        noEmit: false,
        emit: [SdkTestLibrary.name],
        options: {
          [SdkTestLibrary.name]: { "emitter-output-dir": resolveVirtualPath("tsp-output") },
        },
      },
    );

    const output = runner.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
    const expected = (
      await readFile(
        resolvePath(
          await findTestPackageRoot(import.meta.url),
          "test",
          "context",
          "output",
          "tcgc-output.yaml",
        ),
      )
    ).toString();
    strictEqual(output, expected);
  });

  it("export TCGC output with emitter name from emitter", async () => {
    await runner.compile(
      `
      @service({
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input, "csharp")
      model Test{
      }
    `,
      {
        noEmit: false,
        emit: [SdkTestLibrary.name],
        options: {
          [SdkTestLibrary.name]: {
            "emitter-output-dir": resolveVirtualPath("tsp-output"),
            "emitter-name": "@azure-tools/typespec-csharp",
          },
        },
      },
    );

    const output = runner.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
    const expected = (
      await readFile(
        resolvePath(
          await findTestPackageRoot(import.meta.url),
          "test",
          "context",
          "output",
          "tcgc-output.yaml",
        ),
      )
    ).toString();
    strictEqual(output, expected);
  });

  it("export TCGC output from context", async () => {
    runner = await createSdkTestRunner(
      { emitterName: "@azure-tools/typespec-python" },
      { exportTCGCoutput: true },
    );

    await runner.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input)
      model Test{
      }
    `);

    const output = runner.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
    const expected = (
      await readFile(
        resolvePath(
          await findTestPackageRoot(import.meta.url),
          "test",
          "context",
          "output",
          "tcgc-output.yaml",
        ),
      )
    ).toString();
    strictEqual(output, expected);
  });

  it("export TCGC output with emitter name from context", async () => {
    runner = await createSdkTestRunner(
      { emitterName: "@azure-tools/typespec-python" },
      { exportTCGCoutput: true },
    );

    await runner.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input, "python")
      model Test{
      }
    `);

    const output = runner.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
    const expected = (
      await readFile(
        resolvePath(
          await findTestPackageRoot(import.meta.url),
          "test",
          "context",
          "output",
          "tcgc-output.yaml",
        ),
      )
    ).toString();
    strictEqual(output, expected);
  });
});
