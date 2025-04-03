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
      #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
      @flattenProperty
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

it("throws deprecation warning if not suppressed", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    @test namespace MyService {
      @test
      model Model1{
        @flattenProperty
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
    code: "deprecated",
  });
});

it("throws error when used on other targets", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    @test namespace MyService {
      @test
      @flattenProperty
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
      #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
      @test
      model Model1{
        @flattenProperty
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
