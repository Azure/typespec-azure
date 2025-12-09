import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("sets client default value for a model property with numeric value", async () => {
  await runner.compileWithBuiltInService(`
    model RequestOptions {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      timeout?: int32;
    }

    @test
    @route("/func1")
    op func1(@body body: RequestOptions): void;
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "RequestOptions")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const timeoutProperty = model.properties[0];
  ok(timeoutProperty);
  strictEqual(timeoutProperty.kind, "property");
  strictEqual(timeoutProperty.name, "timeout");
  strictEqual(timeoutProperty.clientDefaultValue, 30);
});

it("sets client default value for a model property with string value", async () => {
  await runner.compileWithBuiltInService(`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
      tier?: string;
    }

    @test
    @route("/func1")
    op func1(@body body: Config): void;
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "Config")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const tierProperty = model.properties[0];
  ok(tierProperty);
  strictEqual(tierProperty.kind, "property");
  strictEqual(tierProperty.name, "tier");
  strictEqual(tierProperty.clientDefaultValue, "standard");
});

it("sets client default value for a model property with boolean value", async () => {
  await runner.compileWithBuiltInService(`
    model Settings {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(false)
      enableCache?: boolean;
    }

    @test
    @route("/func1")
    op func1(@body body: Settings): void;
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "Settings")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const enableCacheProperty = model.properties[0];
  ok(enableCacheProperty);
  strictEqual(enableCacheProperty.kind, "property");
  strictEqual(enableCacheProperty.name, "enableCache");
  strictEqual(enableCacheProperty.clientDefaultValue, false);
});

it("does not set client default value for property without decorator", async () => {
  await runner.compile(`
    @service
    @test namespace MyService {
      @test
      model Config {
        timeout?: int32;
      }

      @test
      @route("/func1")
      op func1(@body body: Config): void;
    }
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "Config")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const timeoutProperty = model.properties[0];
  ok(timeoutProperty);
  strictEqual(timeoutProperty.kind, "property");
  strictEqual(timeoutProperty.name, "timeout");
  strictEqual(timeoutProperty.clientDefaultValue, undefined);
});

it("throws error when used on non-property targets", async () => {
  const diagnostics = await runner.diagnose(`
    @service
    @test namespace MyService {
      @test
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      model Config {
        timeout?: int32;
      }

      @test
      @route("/func1")
      op func1(@body body: Config): void;
    }
  `);

  expectDiagnostics(diagnostics, {
    code: "decorator-wrong-target",
  });
});

it("applies decorator with language scope", async () => {
  await runner.compileWithBuiltInService(`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30, "python")
      timeout?: int32;
    }

    @test
    @route("/func1")
    op func1(@body body: Config): void;
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "Config")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const timeoutProperty = model.properties[0];
  ok(timeoutProperty);
  strictEqual(timeoutProperty.kind, "property");
  strictEqual(timeoutProperty.name, "timeout");
  strictEqual(timeoutProperty.clientDefaultValue, 30);
});

it("applies decorator with different language scope should not apply", async () => {
  const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  await javaRunner.compileWithBuiltInService(`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30, "python")
      timeout?: int32;
    }

    @test
    @route("/func1")
    op func1(@body body: Config): void;
  `);

  const models = getAllModels(javaRunner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "Config")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 1);

  const timeoutProperty = model.properties[0];
  ok(timeoutProperty);
  strictEqual(timeoutProperty.kind, "property");
  strictEqual(timeoutProperty.name, "timeout");
  strictEqual(timeoutProperty.clientDefaultValue, undefined);
});

it("verify diagnostic gets raised for legacy usage", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });

  const result = await runnerWithCore.diagnose(
    `        
      namespace MyService {
        model Config {
          @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
          timeout?: int32;
        }

        @test
        @route("/func1")
        op func1(@body body: Config): void;
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

it("sets client default value for multiple properties", async () => {
  await runner.compileWithBuiltInService(`
    model RequestOptions {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      timeout?: int32;
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
      tier?: string;
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(true)
      retry?: boolean;
    }

    @test
    @route("/func1")
    op func1(@body body: RequestOptions): void;
  `);

  const models = getAllModels(runner.context);
  strictEqual(models.length, 1);
  const model = models.find((x) => x.name === "RequestOptions")!;
  ok(model);
  strictEqual(model.kind, "model");
  strictEqual(model.properties.length, 3);

  const timeoutProperty = model.properties.find((p) => p.name === "timeout")!;
  ok(timeoutProperty);
  strictEqual(timeoutProperty.clientDefaultValue, 30);

  const tierProperty = model.properties.find((p) => p.name === "tier")!;
  ok(tierProperty);
  strictEqual(tierProperty.clientDefaultValue, "standard");

  const retryProperty = model.properties.find((p) => p.name === "retry")!;
  ok(retryProperty);
  strictEqual(retryProperty.clientDefaultValue, true);
});

it("sets client default value for operation parameters", async () => {
  await runner.compileWithBuiltInService(`
    @route("/items")
    @get
    op getItems(
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
      @query pageSize?: int32,
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("asc")
      @query sortOrder?: string
    ): void;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");
  strictEqual(method.parameters.length, 2);

  const pageSizeParam = method.parameters.find((p) => p.name === "pageSize")!;
  ok(pageSizeParam);
  strictEqual(pageSizeParam.clientDefaultValue, 10);

  const sortOrderParam = method.parameters.find((p) => p.name === "sortOrder")!;
  ok(sortOrderParam);
  strictEqual(sortOrderParam.clientDefaultValue, "asc");
});

it("mixed with @alternateType", async () => {
  await runner.compileWithBuiltInService(`
    @route("/items")
    @get
    op getItems(
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
      @Azure.ClientGenerator.Core.alternateType(string)
      @query pageSize?: int32,
      
    ): void;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");

  const pageSizeParam = method.parameters.find((p) => p.name === "pageSize")!;
  ok(pageSizeParam);
  strictEqual(pageSizeParam.clientDefaultValue, "10");
});
