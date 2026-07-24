import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpModelSuffixRule } from "../../src/rules/csharp-model-suffix.js";
import { AzureCoreTester, d, SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const ruleCode = `${libraryName}/csharp-model-suffix`;
const conventions = [
  { badSuffix: "Options", replacementSuffix: "Config" },
  { badSuffix: "Request", replacementSuffix: "Content" },
  { badSuffix: "Response", replacementSuffix: "Result" },
] as const;

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);
});

it.each(conventions)(
  "emits warning when model name ends with $badSuffix",
  async ({ badSuffix, replacementSuffix }) => {
    await tester.expect(`model Foo${badSuffix} { id: string; }`).toEmitDiagnostics({
      code: ruleCode,
      message: `Model 'Foo${badSuffix}' ends with '${badSuffix}'. Use '${replacementSuffix}' suffix instead (e.g. 'Foo${replacementSuffix}'). Use @clientName("Foo${replacementSuffix}", "csharp") to rename it for C#.`,
    });
  },
);

it.each(conventions)(
  "emits warning when @clientName introduces $badSuffix suffix for C#",
  async ({ badSuffix, replacementSuffix }) => {
    await tester
      .expect(
        `@clientName("Foo${badSuffix}", "csharp") model Foo${replacementSuffix} { id: string; }`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  },
);

it.each(conventions)(
  "is valid when model name ends with $replacementSuffix",
  async ({ replacementSuffix }) => {
    await tester.expect(`model Foo${replacementSuffix} { id: string; }`).toBeValid();
  },
);

it.each(conventions)(
  "is valid when C# client name uses $replacementSuffix",
  async ({ badSuffix, replacementSuffix }) => {
    await tester
      .expect(
        `@clientName("Foo${replacementSuffix}", "csharp") model Foo${badSuffix} { id: string; }`,
      )
      .toBeValid();
  },
);

it("does not flag ClientOptions", async () => {
  await tester.expect(`model WidgetClientOptions { id: string; }`).toBeValid();
});

it("is valid for RequestBody suffix", async () => {
  await tester.expect(`model FooRequestBody { id: string; }`).toBeValid();
});

it("emits warning for service-defined ErrorResponse", async () => {
  await tester.expect(`model ErrorResponse { code: string; }`).toEmitDiagnostics({
    code: ruleCode,
  });
});

it("does not flag Azure.Core library request models", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);

  await azureCoreTester
    .expect(
      `model Widget {
        id: string;
      }
      alias RequestPayload = Foundations.ResourceBody<Widget>;`,
    )
    .toBeValid();
});

it("does not flag the standard Azure.Core ErrorResponse", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);

  await azureCoreTester.expect(`alias StandardError = Foundations.ErrorResponse;`).toBeValid();
});

it("does not flag the standard Azure.ResourceManager CommonTypes ErrorResponse", async () => {
  await tester
    .expect(
      `namespace Azure.ResourceManager.CommonTypes;
      model ErrorResponse {
        error: string;
      }`,
    )
    .toBeValid();
});

describe("operation-aware body suffixes", () => {
  it.each(["Parameter", "Parameters", "Request"])(
    "uses Patch for a direct PATCH body ending in %s",
    async (suffix) => {
      await tester
        .expect(
          `model Widget${suffix} { name: string; }
          @route("/widgets/{id}") @patch
          op update(@path id: string, @body body: Widget${suffix}): void;`,
        )
        .toEmitDiagnostics({
          code: ruleCode,
          message: `Model 'Widget${suffix}' is used as a direct PATCH body. Use 'Patch' suffix instead (e.g. 'WidgetPatch'). Use @clientName("WidgetPatch", "csharp") to rename it for C#.`,
        });
    },
  );

  it.each([
    ["WidgetUpdateParameters", "WidgetPatch"],
    ["WidgetPatchParameters", "WidgetPatch"],
    ["WidgetPatchRequest", "WidgetPatch"],
  ])("normalizes %s to %s for a direct PATCH body", async (modelName, suggestion) => {
    await tester
      .expect(
        `model ${modelName} { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: ${modelName}): void;`,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: `Model '${modelName}' is used as a direct PATCH body. Use 'Patch' suffix instead (e.g. '${suggestion}'). Use @clientName("${suggestion}", "csharp") to rename it for C#.`,
      });
  });

  it.each(["Patch", "Content", "Data", "Identity"])(
    "accepts %s on a direct PATCH body when it is not a targeted suffix",
    async (suffix) => {
      await tester
        .expect(
          `model Widget${suffix} { name: string; }
          @route("/widgets/{id}") @patch
          op update(@path id: string, @body body: Widget${suffix}): void;`,
        )
        .toBeValid();
    },
  );

  it.each(["put", "post"])(
    "uses Content for a direct %s body ending in Parameters",
    async (verb) => {
      await tester
        .expect(
          `model WidgetParameters { name: string; }
          @route("/widgets") @${verb}
          op create(@body body: WidgetParameters): void;`,
        )
        .toEmitDiagnostics({
          code: ruleCode,
          message: `Model 'WidgetParameters' is used as a direct PUT/POST body or nested request content. Use 'Content' suffix instead (e.g. 'WidgetContent'). Use @clientName("WidgetContent", "csharp") to rename it for C#.`,
        });
    },
  );

  it("allows Content and Data for direct PUT/POST bodies", async () => {
    await tester
      .expect(
        `model WidgetContent { name: string; }
        model WidgetData { name: string; }
        @route("/widgets") @put
        op replace(@body body: WidgetContent): void;
        @route("/widgets/action") @post
        op act(@body body: WidgetData): void;`,
      )
      .toBeValid();
  });

  it.each(["Parameter", "Parameters", "Request"])(
    "uses Content for nested PATCH body model ending in %s",
    async (suffix) => {
      await tester
        .expect(
          `model WidgetPatch { details: WidgetDetails${suffix}; }
          model WidgetDetails${suffix} { name: string; }
          @route("/widgets/{id}") @patch
          op update(@path id: string, @body body: WidgetPatch): void;`,
        )
        .toEmitDiagnostics({
          code: ruleCode,
          message: `Model 'WidgetDetails${suffix}' is used as a direct PUT/POST body or nested request content. Use 'Content' suffix instead (e.g. 'WidgetDetailsContent'). Use @clientName("WidgetDetailsContent", "csharp") to rename it for C#.`,
        });
    },
  );

  it("finds nested models through arrays and unions", async () => {
    await tester
      .expect(
        `model WidgetPatch {
          details: WidgetDetailsParameters[];
          choice: WidgetChoiceRequest | string;
        }
        model WidgetDetailsParameters { name: string; }
        model WidgetChoiceRequest { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetPatch): void;`,
      )
      .toEmitDiagnostics([{ code: ruleCode }, { code: ruleCode }]);
  });

  it("finds nested models through an anonymous body and record indexer", async () => {
    await tester
      .expect(
        `model WidgetDetailsParameters { name: string; }
        @route("/widgets/{id}") @patch
        op update(
          @path id: string,
          @body body: { details: Record<WidgetDetailsParameters> }
        ): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("finds nested models through a direct body's indexer", async () => {
    await tester
      .expect(
        `model WidgetDetailsParameters { name: string; }
        model WidgetPatch is Record<WidgetDetailsParameters>;
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetPatch): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("finds models in a tuple body", async () => {
    await tester
      .expect(
        `model WidgetParameters { name: string; }
        @route("/widgets") @post
        op create(@body body: [WidgetParameters]): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("handles recursive nested body models", async () => {
    await tester
      .expect(
        `model WidgetPatch { details: WidgetDetailsParameters; }
        model WidgetDetailsParameters {
          name: string;
          child?: WidgetDetailsParameters;
        }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetPatch): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("classifies a named multipart PATCH body", async () => {
    await tester
      .expect(
        `model WidgetParameters {
          file: HttpPart<string>;
        }
        @route("/widgets/{id}") @patch
        op update(
          @path id: string,
          @header contentType: "multipart/form-data",
          @multipartBody body: WidgetParameters
        ): void;`,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: `Model 'WidgetParameters' is used as a direct PATCH body. Use 'Patch' suffix instead (e.g. 'WidgetPatch'). Use @clientName("WidgetPatch", "csharp") to rename it for C#.`,
      });
  });

  it("does not require Content for nested domain models", async () => {
    await tester
      .expect(
        `model WidgetPatch { identity: Identity; }
        model Identity { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetPatch): void;`,
      )
      .toBeValid();
  });

  it("allows compatible reuse by PATCH operations", async () => {
    await tester
      .expect(
        `model WidgetParameters { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetParameters): void;
        @route("/widgets/{id}/settings") @patch
        op updateSettings(@path id: string, @body body: WidgetParameters): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("allows compatible reuse by PUT and POST operations", async () => {
    await tester
      .expect(
        `model WidgetParameters { name: string; }
        @route("/widgets") @put
        op replace(@body body: WidgetParameters): void;
        @route("/widgets/action") @post
        op act(@body body: WidgetParameters): void;`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  });

  it("does not report mixed direct PATCH and PUT usage", async () => {
    await tester
      .expect(
        `model WidgetParameters { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetParameters): void;
        @route("/widgets/{id}") @put
        op replace(@path id: string, @body body: WidgetParameters): void;`,
      )
      .toBeValid();
  });

  it("does not report mixed direct PATCH and nested usage", async () => {
    await tester
      .expect(
        `model SharedParameters { name: string; }
        model OtherPatch { shared: SharedParameters; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: SharedParameters): void;
        @route("/other/{id}") @patch
        op updateOther(@path id: string, @body body: OtherPatch): void;`,
      )
      .toBeValid();
  });

  it("does not report a model shared by a request and response", async () => {
    await tester
      .expect(
        `model WidgetParameters { name: string; }
        @route("/widgets") @post
        op create(@body body: WidgetParameters): WidgetParameters;`,
      )
      .toBeValid();
  });

  it("does not report a model shared by another request verb and a response", async () => {
    await tester
      .expect(
        `model WidgetRequest { name: string; }
        @route("/widgets") @delete
        op delete(@body body: WidgetRequest): WidgetRequest;`,
      )
      .toBeValid();
  });

  it("preserves generic Request handling for another request verb", async () => {
    await tester
      .expect(
        `model WidgetRequest { name: string; }
        @route("/widgets") @delete
        op delete(@body body: WidgetRequest): void;`,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: `Model 'WidgetRequest' ends with 'Request'. Use 'Content' suffix instead (e.g. 'WidgetContent'). Use @clientName("WidgetContent", "csharp") to rename it for C#.`,
      });
  });

  it("uses the resolved C# name for operation-aware checks", async () => {
    await tester
      .expect(
        `@clientName("WidgetParameters", "csharp")
        model WidgetContent { name: string; }
        @route("/widgets/{id}") @patch
        op update(@path id: string, @body body: WidgetContent): void;`,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message: `Model 'WidgetParameters' is used as a direct PATCH body. Use 'Patch' suffix instead (e.g. 'WidgetPatch'). Use @clientName("WidgetPatch", "csharp") to rename it for C#.`,
      });
  });
});

describe("codefix", () => {
  it.each(conventions)(
    "writes @@clientName for $badSuffix to client.tsp",
    async ({ badSuffix, replacementSuffix }) => {
      const baseRunner = await SimpleBaseTester.createInstance();
      const baseTester = createLinterRuleTester(baseRunner, csharpModelSuffixRule, libraryName);

      await baseTester
        .expect({
          "main.tsp": `model Foo${badSuffix} { id: string; }`,
          "client.tsp": ``,
        })
        .applyCodeFix("add-clientName-in-client-tsp")
        .toEqual({
          "client.tsp": d`
            import "@azure-tools/typespec-client-generator-core";

            using Azure.ClientGenerator.Core;

            @@clientName(Foo${badSuffix}, "Foo${replacementSuffix}", "csharp");
          `,
        });
    },
  );

  it("writes a PATCH-aware @@clientName to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(baseRunner, csharpModelSuffixRule, libraryName);

    await baseTester
      .expect({
        "main.tsp": `
            import "@typespec/http";
            using Http;
            model WidgetUpdateParameters { name: string; }
            @route("/widgets/{id}") @patch
            op update(@path id: string, @body body: WidgetUpdateParameters): void;
          `,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": d`
            import "@azure-tools/typespec-client-generator-core";

            using Azure.ClientGenerator.Core;

            @@clientName(WidgetUpdateParameters, "WidgetPatch", "csharp");
          `,
      });
  });
});
