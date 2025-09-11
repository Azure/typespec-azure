import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getAllModels } from "../../src/types.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("marks a model property to be flattened with suppression of deprecation warning", async () => {
  await runner.compileWithBuiltInService(`
    model Model1{
      @Azure.ClientGenerator.Core.Legacy.flattenProperty
      child: Model2;
    }

    @test
    model Model2{}

    @test
    @route("/func1")
    op func1(@body body: Model1): void;
  `);
  const models = getAllModels(runner.context);
  strictEqual(models.length, 2);
  const model1 = models.find((x) => x.name === "Model1")!;
  strictEqual(model1.kind, "model");
  strictEqual(model1.properties.length, 1);
  const childProperty = model1.properties[0];
  strictEqual(childProperty.kind, "property");
  strictEqual(childProperty.flatten, true);
});

it("doesn't mark a un-flattened model property", async () => {
  await runner.compile(`
    @service
    @test namespace MyService {
      @test
      model Model1{
        child: Model2;
      }

      @test
      model Model2{}

      @test
      @route("/func1")
      op func1(@body body: Model1): void;
    }
  `);
  const models = getAllModels(runner.context);
  strictEqual(models.length, 2);
  const model1 = models.find((x) => x.name === "Model1")!;
  strictEqual(model1.kind, "model");
  strictEqual(model1.properties.length, 1);
  const childProperty = model1.properties[0];
  strictEqual(childProperty.kind, "property");
  strictEqual(childProperty.flatten, false);
});

it("throws error when used on other targets", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    @test namespace MyService {
      @test
      @Azure.ClientGenerator.Core.Legacy.flattenProperty
      model Model1{
        child: Model2;
      }

      @test
      model Model2{}

      @test
      @route("/func1")
      op func1(@body body: Model1): void;
    }
  `);

  expectDiagnostics(diagnostics, {
    code: "decorator-wrong-target",
  });
});

it("throws error when used on a polymorphism type", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    @test namespace MyService {
      @test
      model Model1{
        @Azure.ClientGenerator.Core.Legacy.flattenProperty
        child: Model2;
      }

      @test
      @discriminator("kind")
      model Model2{
        kind: string;
      }
    }
  `);

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/flatten-polymorphism",
  });
});

it("verify diagnostic gets raised for usage", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });

  const result = await runnerWithCore.diagnose(
    `        
      namespace MyService {
        model Model1{
          @Azure.ClientGenerator.Core.Legacy.flattenProperty
          child: Model2;
        }

        @test
        model Model2{}

        @test
        @route("/func1")
        op func1(@body body: Model1): void;
      }
      `,
    {
      linterRuleSet: {
        enable: {
          "@azure-tools/typespec-azure-core/no-legacy-usage": true,
        },
      },
    },
  );
  expectDiagnostics(result, [
    {
      code: "@azure-tools/typespec-azure-core/no-legacy-usage",
      message:
        'Referencing elements inside Legacy namespace "Azure.ClientGenerator.Core.Legacy" is not allowed.',
    },
  ]);
});
