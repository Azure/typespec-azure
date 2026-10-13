import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, expect, it } from "vitest";
import { scopePathSegmentCasingRule } from "../../src/rules/scope-path-segment-casing.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    scopePathSegmentCasingRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

async function checkPath(path: string, mismatches: [string, string][]) {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get @route("${path}")
      op /*target*/read(): void;
      `,
    )
    .toEmitDiagnostics(({ target }) =>
      mismatches.map(([actual, expected]) => ({
        code: "@azure-tools/typespec-azure-resource-manager/scope-path-segment-casing",
        severity: "warning",
        message: `The path segment ${actual} should be ${expected}.`,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      })),
    );
}

async function documentationExample(index: number) {
  const documentation = await readFile(
    new URL("../../src/rules/scope-path-segment-casing.md", import.meta.url),
    "utf8",
  );
  const examples = [...documentation.matchAll(/```typespec\r?\n([\s\S]*?)```/g)];
  expect(examples).toHaveLength(2);
  return `
    @service @armProviderNamespace namespace Microsoft.Contoso;
    model WidgetProperties {}
    model Widget is ProxyResource<WidgetProperties> {
      ...ResourceNameParameter<Resource = Widget, KeyName = "widgetName", SegmentName = "widgets">;
    }
    interface Operations extends Azure.ResourceManager.Operations {}
    ${examples[index][1].replace("read is", "/*target*/read is")}
  `;
}

it("reports noncanonical subscriptions without provider metadata when enabled", async () => {
  await checkPath("/Subscriptions", [["Subscriptions", "subscriptions"]]);
});

it("reports noncanonical resourceGroups", async () => {
  await checkPath("/subscriptions/resourcegroups", [["resourcegroups", "resourceGroups"]]);
});

it("reports both noncanonical scope segments at the operation", async () => {
  await checkPath("/SUBSCRIPTIONS/RESOURCEGROUPS", [
    ["SUBSCRIPTIONS", "subscriptions"],
    ["RESOURCEGROUPS", "resourceGroups"],
  ]);
});

it("checks a later noncanonical occurrence after a canonical occurrence", async () => {
  await checkPath("/subscriptions/Subscriptions", [["Subscriptions", "subscriptions"]]);
});

it("reports each repeated noncanonical occurrence", async () => {
  await checkPath("/Subscriptions/Subscriptions", [
    ["Subscriptions", "subscriptions"],
    ["Subscriptions", "subscriptions"],
  ]);
});

it("accepts canonical scope segments", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get @route("/subscriptions/resourceGroups")
      op read(): void;
    `,
    )
    .toBeValid();
});

it("accepts collection names that only share a reserved prefix", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get @route("/SubscriptionsHistory/resourceGroups")
      op read(): void;
    `,
    )
    .toBeValid();
});

it("does not check path parameter identifiers", async () => {
  await tester
    .expect(
      `
      @service namespace Microsoft.Contoso;
      @get @route("/{Subscriptions}/{RESOURCEGROUPS}")
      op read(@path Subscriptions: string, @path RESOURCEGROUPS: string): void;
    `,
    )
    .toBeValid();
});

it("validates the published incorrect standard ARM template example", async () => {
  await tester.expect(await documentationExample(0)).toEmitDiagnostics(({ target }) => ({
    code: "@azure-tools/typespec-azure-resource-manager/scope-path-segment-casing",
    severity: "warning",
    message: "The path segment resourcegroups should be resourceGroups.",
    pos: getSourceLocation(target).pos,
    end: getSourceLocation(target).end,
  }));
});

it("validates the published correct standard ARM template example", async () => {
  await tester.expect(await documentationExample(1)).toBeValid();
});
