import { expectDiagnostics, t } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { getAllModels } from "../../src/types.js";
import {
  AzureCoreTester,
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithService,
} from "../tester.js";

it("sets client default value for a model property with numeric value", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model RequestOptions {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      timeout?: int32;
    }

    @route("/func1")
    op func1(@body body: RequestOptions): void;
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const { program } = await SimpleTesterWithService.compile(t.code`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
      tier?: string;
    }

    @route("/func1")
    op func1(@body body: Config): void;
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const { program } = await SimpleTesterWithService.compile(t.code`
    model Settings {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(false)
      enableCache?: boolean;
    }

    @route("/func1")
    op func1(@body body: Settings): void;
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const { program } = await SimpleTester.compile(t.code`
    @service
    namespace MyService {
      model Config {
        timeout?: int32;
      }

      @route("/func1")
      op func1(@body body: Config): void;
    }
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const diagnostics = await SimpleTester.diagnose(`
    @service
    namespace MyService {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      model Config {
        timeout?: int32;
      }

      @route("/func1")
      op func1(@body body: Config): void;
    }
  `);

  expectDiagnostics(diagnostics, {
    code: "decorator-wrong-target",
  });
});

it("applies decorator with language scope", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30, "python")
      timeout?: int32;
    }

    @route("/func1")
    op func1(@body body: Config): void;
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const { program } = await SimpleTesterWithService.compile(t.code`
    model Config {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30, "python")
      timeout?: int32;
    }

    @route("/func1")
    op func1(@body body: Config): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });

  const models = getAllModels(context);
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
  const diagnostics = await AzureCoreTester.diagnose(
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
      compilerOptions: {
        linterRuleSet: {
          enable: {
            "@azure-tools/typespec-azure-core/no-legacy-usage": true,
          },
        },
      },
    },
  );
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-azure-core/no-legacy-usage",
    message:
      'Referencing elements inside Legacy namespace "Azure.ClientGenerator.Core.Legacy" is not allowed.',
  });
});

it("sets client default value for multiple properties", async () => {
  const { program } = await SimpleTesterWithService.compile(t.code`
    model RequestOptions {
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(30)
      timeout?: int32;
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("standard")
      tier?: string;
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(true)
      retry?: boolean;
    }

    @route("/func1")
    op func1(@body body: RequestOptions): void;
  `);
  const context = await createSdkContextForTester(program);

  const models = getAllModels(context);
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
  const { program } = await SimpleTesterWithService.compile(t.code`
    @route("/items")
    @get
    op getItems(
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue(10)
      @query pageSize?: int32,
      
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("asc")
      @query sortOrder?: string
    ): void;
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(t.code`
    @route("/items")
    @get
    op getItems(
      @Azure.ClientGenerator.Core.Legacy.clientDefaultValue("10")
      @Azure.ClientGenerator.Core.alternateType(string)
      @query pageSize?: int32,
      
    ): void;
  `);
  const context = await createSdkContextForTester(program);

  const sdkPackage = context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");

  const pageSizeParam = method.parameters.find((p) => p.name === "pageSize")!;
  ok(pageSizeParam);
  strictEqual(pageSizeParam.clientDefaultValue, "10");
});
