import { getSourceLocation, resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { subscriptionsAndResourceGroupCasingRule } from "../../src/rules/subscriptions-and-resource-group-casing.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("Native lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    subscriptionsAndResourceGroupCasingRule,
    "tsp-lintdiff-local-linter",
  );
}

async function nativeFixture(name: string) {
  return (
    await readFile(
      new URL(`../fixtures/SubscriptionsAndResourceGroupCasing/${name}/main.tsp`, import.meta.url),
      "utf8",
    )
  )
    .replace('import "../../lib/imports.tsp";', "")
    .replace("using TypeSpec.OpenAPI;", "")
    .replace('@extension("x-ms-examples", #{})', "")
    .replace("getWidget(", "/*target*/getWidget(");
}

async function source(path: string) {
  return (await nativeFixture("compliant")).replace(/@route\("[^"]*"\)/, `@route("${path}")`);
}

const suffix =
  "/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";

describe("subscriptions-and-resource-group-casing", () => {
  it.each([
    ["incorrect", 0, true],
    ["correct", 1, false],
  ] as const)(
    "validates the published %s standard ARM template example",
    async (_, index, violates) => {
      const documentation = await readFile(
        new URL("../fixtures/SubscriptionsAndResourceGroupCasing/rule.md", import.meta.url),
        "utf8",
      );
      const examples = [...documentation.matchAll(/```typespec\r?\n([\s\S]*?)```/g)];
      expect(examples).toHaveLength(2);
      const setup = `
        using TypeSpec.Http;
        using TypeSpec.Rest;
        using Azure.ResourceManager;
        @service @armProviderNamespace namespace Microsoft.TestService;
        model WidgetProperties {}
        model Widget is ProxyResource<WidgetProperties> {
          ...ResourceNameParameter<Resource = Widget, KeyName = "widgetName", SegmentName = "widgets">;
        }
        interface Operations extends Azure.ResourceManager.Operations {}
      `;
      const code = setup + examples[index][1].replace("read is", "/*target*/read is");
      const expectation = (await tester()).expect(code);
      if (!violates) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics(({ target }) => ({
          code: "tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing",
          message: "The path segment resourcegroups should be resourceGroups.",
          pos: getSourceLocation(target).pos,
          end: getSourceLocation(target).end,
        }));
      }
    },
  );
  it.each([
    ["/Subscriptions" + suffix, [["Subscriptions", "subscriptions"]]],
    [
      "/subscriptions" + suffix.replace("resourceGroups", "resourcegroups"),
      [["resourcegroups", "resourceGroups"]],
    ],
    [
      "/SUBSCRIPTIONS" + suffix.replace("resourceGroups", "RESOURCEGROUPS"),
      [
        ["SUBSCRIPTIONS", "subscriptions"],
        ["RESOURCEGROUPS", "resourceGroups"],
      ],
    ],
    ["/subscriptions" + suffix + "/Subscriptions", [["Subscriptions", "subscriptions"]]],
    [
      "/Subscriptions" + suffix + "/Subscriptions",
      [
        ["Subscriptions", "subscriptions"],
        ["Subscriptions", "subscriptions"],
      ],
    ],
  ] as const)(
    "reports each incorrect complete segment at the operation: %s",
    async (path, mismatches) => {
      await (await tester()).expect(await source(path)).toEmitDiagnostics(({ target }) =>
        mismatches.map(([actual, expected]) => ({
          code: "tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing",
          message: `The path segment ${actual} should be ${expected}.`,
          pos: getSourceLocation(target).pos,
          end: getSourceLocation(target).end,
        })),
      );
    },
  );

  it.each(["/subscriptions" + suffix, "/SubscriptionsHistory" + suffix])(
    "accepts canonical casing and unrelated collection-name prefixes: %s",
    async (path) => {
      await (await tester()).expect(await source(path)).toBeValid();
    },
  );

  it("checks operations in a provider's nested namespace", async () => {
    await (await tester()).expect(await nativeFixture("nested-provider")).toEmitDiagnostics([
      {
        code: "tsp-lintdiff-local-linter/subscriptions-and-resource-group-casing",
        message: "The path segment Subscriptions should be subscriptions.",
      },
    ]);
  });

  it("excludes non-ARM operations from the mixed lintdiff ruleset", async () => {
    await (
      await tester()
    )
      .expect(
        `
      using TypeSpec.Http;
      @service namespace DataPlane;
      @get @route("/Subscriptions")
      op read(): string;
    `,
      )
      .toBeValid();
  });
});
