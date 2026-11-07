import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, expect, it } from "vitest";
import { resolveArmResources } from "../../src/resource.js";
import { noResourceDuplicatesRule } from "../../src/rules/no-resource-duplicates.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noResourceDuplicatesRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const service = `
  @armProviderNamespace @service namespace Microsoft.Contoso;
  model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
  @parentResource(Widget)
  model Part is ProxyResource<{}> { ...ResourceNameParameter<Part>; }
`;

function legacy(
  options: {
    parentSegment?: string;
    segment?: string;
    parameter?: string;
    resourceName?: string;
    scope?: "tenant" | "subscription" | "resource-group";
  } = {},
) {
  return `
    @armResourceOperations interface PartsLegacy
      extends Azure.ResourceManager.Legacy.LegacyOperations<
        {
          ...ApiVersionParameter;
          ${options.scope === "tenant" ? "" : "...SubscriptionIdParameter;"}
          ${options.scope === "tenant" || options.scope === "subscription" ? "" : "...ResourceGroupParameter;"}
          ...Azure.ResourceManager.Legacy.Provider;
          @path @segment("${options.parentSegment ?? "widgets"}") @key widgetName: string;
        },
        { @path @segment("${options.segment ?? "parts"}") @key ${options.parameter ?? "partName"}: string; }
        ${options.resourceName === undefined ? "" : `, ErrorResponse, "${options.resourceName}"`}
      > {}
  `;
}

const instancePath =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Contoso/widgets/{widgetName}/parts/{partName}";

const diagnostic = (
  name = "WidgetsParts",
  path = instancePath,
  first = "Part",
  resourceType = "Microsoft.Contoso/widgets/parts",
) => ({
  code: "@azure-tools/typespec-azure-resource-manager/no-resource-duplicates",
  severity: "warning" as const,
  message: `Resource '${name}' resolves to the same resource type '${resourceType}' and instance path '${path}' as resource '${first}'. Use consistent resource names and operation templates so this instance resolves to a single resource.`,
});

const mixedOperations = `
  @armResourceOperations interface Parts {
    get is ArmResourceRead<Part>;
    /*target*/createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
    list is ArmResourceListByParent<Part>;
  }
`;

it("reproduces the split legacy PUT and standard read/list identities", async () => {
  const { program } = await Tester.compile(service + legacy() + mixedOperations);
  const parts = resolveArmResources(program).resources?.filter(
    (r) => r.resourceInstancePath === instancePath,
  );
  expect(parts).toHaveLength(2);
  expect(parts?.map((r) => r.resourceInstancePath)).toEqual([instancePath, instancePath]);
  expect(parts?.map((r) => r.resourceName)).toEqual(["Part", "WidgetsParts"]);
});

it("warns on the duplicate operation, not the model or synthetic parent", async () => {
  await tester
    .expect(service + legacy() + mixedOperations)
    .toEmitDiagnostics((x) => ({ ...diagnostic(), pos: x.pos.target.pos }));
});

it("accepts consistent standard operations", async () => {
  await tester
    .expect(
      `${service}
    @armResourceOperations interface Parts {
      get is ArmResourceRead<Part>;
      createOrUpdate is ArmResourceCreateOrReplaceSync<Part>;
      list is ArmResourceListByParent<Part>;
    }
  `,
    )
    .toBeValid();
});

it("accepts consistent legacy operations", async () => {
  await tester
    .expect(
      `${service}${legacy()}
    @armResourceOperations interface Parts {
      get is PartsLegacy.Read<Part>;
      createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
      list is PartsLegacy.List<Part>;
    }
  `,
    )
    .toBeValid();
});

it("accepts explicit legacy names aligned with the standard resource name", async () => {
  await tester.expect(service + legacy({ resourceName: "Part" }) + mixedOperations).toBeValid();
});

it("accepts an operation-level legacy name override without changing the resource path", async () => {
  const source =
    service +
    legacy() +
    mixedOperations.replace(
      "PartsLegacy.CreateOrUpdateSync<Part>",
      'PartsLegacy.CreateOrUpdateSync<Part, OverrideResourceName = "Part">',
    );
  await tester.expect(source).toBeValid();
  const { program } = await Tester.compile(source);
  const parts = resolveArmResources(program).resources?.filter(
    (resource) => resource.resourceInstancePath === instancePath,
  );
  expect(parts).toHaveLength(1);
  expect(parts?.[0].resourceName).toBe("Part");
  expect(parts?.[0].operations.lifecycle.read?.map((operation) => operation.name)).toEqual(["get"]);
  expect(
    parts?.[0].operations.lifecycle.createOrUpdate?.map((operation) => operation.name),
  ).toEqual(["createOrUpdate"]);
  expect(parts?.[0].operations.lists.map((operation) => operation.name)).toEqual(["list"]);
});

it.each([
  {
    title: "resource segment casing",
    options: { segment: "Parts" },
    path: instancePath.replace("/parts/", "/Parts/"),
    resourceType: "Microsoft.Contoso/widgets/Parts",
  },
  {
    title: "parent segment casing",
    options: { parentSegment: "Widgets" },
    path: instancePath.replace("/widgets/", "/Widgets/"),
    resourceType: "Microsoft.Contoso/Widgets/parts",
  },
  {
    title: "parameter name casing",
    options: { parameter: "PartName" },
    path: instancePath.replace("{partName}", "{PartName}"),
    resourceType: "Microsoft.Contoso/widgets/parts",
  },
])("matches $title case-insensitively", async ({ options, path, resourceType }) => {
  await tester
    .expect(service + legacy(options) + mixedOperations)
    .toEmitDiagnostics(diagnostic("WidgetsParts", path, "Part", resourceType));
});

it.each([
  { title: "different parameter names", options: { parameter: "name" } },
  { title: "different resource types", options: { segment: "otherParts" } },
  { title: "different parent paths", options: { parentSegment: "otherWidgets" } },
  { title: "subscription scope", options: { scope: "subscription" as const } },
  { title: "tenant scope", options: { scope: "tenant" as const } },
])("accepts $title", async ({ options }) => {
  await tester.expect(service + legacy(options) + mixedOperations).toBeValid();
});

it("does not multiply warnings when a duplicate has multiple lifecycle operations", async () => {
  await tester
    .expect(
      `${service}${legacy()}
    @armResourceOperations interface Parts {
      get is ArmResourceRead<Part>;
      createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
      delete is PartsLegacy.DeleteSync<Part>;
    }
  `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("reports each additional resource record, rather than each pair", async () => {
  await tester
    .expect(
      `${service}${legacy()}${legacy({ segment: "Parts", resourceName: "ThirdPart" }).replace("PartsLegacy", "ThirdLegacy")}
    @armResourceOperations interface Parts {
      get is ArmResourceRead<Part>;
      createOrUpdate is PartsLegacy.CreateOrUpdateSync<Part>;
      anotherRead is ThirdLegacy.Read<Part>;
    }
  `,
    )
    .toEmitDiagnostics([
      diagnostic(),
      diagnostic(
        "ThirdPart",
        instancePath.replace("/parts/", "/Parts/"),
        "Part",
        "Microsoft.Contoso/widgets/Parts",
      ),
    ]);
});

it("detects collisions between different resource models", async () => {
  await tester
    .expect(
      `${service}
    @parentResource(Widget)
    model AlternatePart is ProxyResource<{}> {
      ...ResourceNameParameter<AlternatePart, KeyName = "partName", SegmentName = "parts">;
    }
    @armResourceOperations interface Parts {
      get is ArmResourceRead<Part>;
      /*target*/createOrUpdate is ArmResourceCreateOrReplaceSync<AlternatePart>;
    }
  `,
    )
    .toEmitDiagnostics((x) => ({ ...diagnostic("AlternatePart"), pos: x.pos.target.pos }));
});

it("supports suppression on the duplicate operation", async () => {
  const source = service + legacy() + mixedOperations;
  const options = {
    compilerOptions: {
      linterRuleSet: {
        enable: {
          "@azure-tools/typespec-azure-resource-manager/no-resource-duplicates": true,
        },
      },
    },
  };
  const [, diagnostics] = await Tester.compileAndDiagnose(source, options);
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0].code).toBe(diagnostic().code);
  await Tester.compile(
    source.replace(
      "/*target*/",
      '#suppress "@azure-tools/typespec-azure-resource-manager/no-resource-duplicates" "Legacy naming retained for compatibility."\n',
    ),
    options,
  );
});

it("ignores unused library templates and resources without identity operations", async () => {
  await tester.expect(service + legacy()).toBeValid();
});

it("does not lint Azure.Core or Azure.ResourceManager library declarations", async () => {
  await tester.expect("").toBeValid();
});

function customPair(firstPath: string, secondPath: string) {
  function parameters(path: string) {
    return [...path.matchAll(/\{(\w+)\}/g)].map((match) => `@path ${match[1]}: string`).join(", ");
  }
  return `${service}
    @armResourceOperations(#{ allowStaticRoutes: true }) interface CustomParts {
      @route("${firstPath}") @get @armResourceRead(Part, "Part")
      read(${parameters(firstPath)}): Part | ErrorResponse;
      @route("${secondPath}") @put @armResourceCreateOrUpdate(Part, "WidgetsParts")
      create(${parameters(secondPath)}, @body resource: { properties: {} }): Part | ErrorResponse;
    }
  `;
}

it("matches provider namespace casing on custom identity operations", async () => {
  const path = instancePath.replace("Microsoft.Contoso", "microsoft.contoso");
  await tester
    .expect(customPair(instancePath, path))
    .toEmitDiagnostics(diagnostic("WidgetsParts", path, "Part", "microsoft.contoso/widgets/parts"));
});

it("accepts different provider namespaces", async () => {
  await tester
    .expect(customPair(instancePath, instancePath.replace("Microsoft.Contoso", "Microsoft.Other")))
    .toBeValid();
});

it("accepts different singleton literals", async () => {
  await tester
    .expect(
      customPair(
        instancePath.replace("{partName}", "default"),
        instancePath.replace("{partName}", "current"),
      ),
    )
    .toBeValid();
});

it("does not equate singleton literals with parameters", async () => {
  await tester
    .expect(customPair(instancePath, instancePath.replace("{partName}", "default")))
    .toBeValid();
});

it("detects duplicate singleton instances", async () => {
  const path = instancePath.replace("{partName}", "default");
  await tester.expect(customPair(path, path)).toEmitDiagnostics(diagnostic("WidgetsParts", path));
});

it("accepts different extension target paths", async () => {
  const suffix = "/providers/Microsoft.Contoso/widgets/{widgetName}/parts/{partName}";
  await tester
    .expect(
      customPair(
        "/subscriptions/{subscriptionId}/providers/Microsoft.Other/targets/{targetName}" + suffix,
        "/subscriptions/{subscriptionId}/providers/Microsoft.Other/otherTargets/{targetName}" +
          suffix,
      ),
    )
    .toBeValid();
});
