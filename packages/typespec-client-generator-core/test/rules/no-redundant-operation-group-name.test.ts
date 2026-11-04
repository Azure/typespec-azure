import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noRedundantOperationGroupNameRule } from "../../src/rules/no-redundant-operation-group-name.js";
import { ArmTester, AzureCoreTester, SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.import("@typespec/openapi").createInstance(),
    noRedundantOperationGroupNameRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

const header = "@service namespace Test;";
const diagnostic = (methodName = "listPaths", groupName = "Paths") => ({
  code: "@azure-tools/typespec-client-generator-core/no-redundant-operation-group-name",
  severity: "warning" as const,
  message: `SDK method '${methodName}' repeats its operation group name '${groupName}'. Remove the group name from the method name.`,
});

it.each(["listPath", "listPaths", "PathDetails", "getPathStatus"])(
  "reports the redundant group name in %s",
  async (name) => {
    await tester
      .expect(`${header} interface Paths { @get op ${name}(): string; }`)
      .toEmitDiagnostics(diagnostic(name));
  },
);

it.each(["list", "getDetails", "listpaths", "listPat"])(
  "accepts the distinct case-sensitive method name %s",
  async (name) => {
    await tester.expect(`${header} interface Paths { @get op ${name}(): string; }`).toBeValid();
  },
);

it("targets the authored operation in a namespace subclient", async () => {
  await tester
    .expect(
      t.code`${header}
        namespace Paths {
          @get op ${t.op("listPaths")}(): string;
        }`,
    )
    .toEmitDiagnostics(({ listPaths }) => ({
      ...diagnostic(),
      pos: getSourceLocation(listPaths).pos,
      end: getSourceLocation(listPaths).end,
    }));
});

it("reports each offending operation once, even with repeated matches", async () => {
  await tester
    .expect(
      `${header}
      interface Paths {
        @get @route("/one") op listPathPaths(): string;
        @get @route("/two") op getPath(): string;
      }`,
    )
    .toEmitDiagnostics([diagnostic("listPathPaths"), diagnostic("getPath")]);
});

it("uses the full literal group name rather than a regex or underscore segment", async () => {
  await tester
    .expect(
      `${header}
      @clientName("Path.Items") interface First { @get @route("/one") op listPathXItems(): string; }
      @clientName("Paths_Admin") interface Second { @get @route("/two") op listPaths(): string; }`,
    )
    .toBeValid();
  await tester
    .expect(
      `${header}
      @clientName("Path.Items") interface Group {
        @clientName("listPath.Items") @get op list(): string;
      }`,
    )
    .toEmitDiagnostics(diagnostic("listPath.Items", "Path.Items"));
});

it("accepts a group with no nonempty noun after removing its terminal s", async () => {
  await tester.expect(`${header} interface s { @get op list(): string; }`).toBeValid();
});

it("uses common method name overrides in both directions", async () => {
  await tester
    .expect(
      `${header}
      interface Paths {
        @clientName("list") @get @route("/one") op listPaths(): string;
        @clientName("listPaths") @get @route("/two") op list(): string;
      }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("uses common group name overrides in both directions", async () => {
  await tester
    .expect(
      `${header}
      @clientName("Items") interface Paths { @get @route("/one") op listPaths(): string; }
      @clientName("Paths") interface Other { @get @route("/two") op listPaths(): string; }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("ignores language-specific group and method overrides", async () => {
  await tester
    .expect(
      `${header}
      @clientName("Items", "csharp") interface Paths {
        @clientName("list", "csharp") @get @route("/one") op listPaths(): string;
      }
      @clientName("Items", "java") interface Other {
        @clientName("listItems", "java") @get @route("/two") op list(): string;
      }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("uses friendly names as the common-name fallback", async () => {
  await tester
    .expect(
      `${header}
      @friendlyName("Paths") interface Other {
        @friendlyName("listPaths") @get op list(): string;
      }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("checks only the immediate owning subclient, not its ancestors", async () => {
  await tester
    .expect(
      `${header}
      namespace Paths {
        interface Items { @get op listPaths(): string; }
      }`,
    )
    .toBeValid();
});

it("does not treat root clients or unowned operations as operation groups", async () => {
  await tester
    .expect(
      `
      interface Helpers { @get @route("/helper") op listHelpers(): string; }
      @service namespace Paths {
        @get @route("/root") op listPaths(): string;
        interface Items { @get @route("/items") op listItems(): string; }
      }
    `,
    )
    .toEmitDiagnostics(diagnostic("listItems", "Items"));
});

it("uses an explicitly named subclient", async () => {
  await tester
    .expect(
      `
      @service namespace Test {}
      @client({service: Test}) namespace RootClient {
        @client({name: "Paths"}) interface Other { @get op listPaths(): string; }
      }
    `,
    )
    .toEmitDiagnostics(diagnostic());
});

it("honors relocation to an actual group in both directions", async () => {
  await tester
    .expect(
      `${header}
      interface Paths { @get @route("/one") op listPaths(): string; }
      interface Items { @get @route("/two") op listPaths(): string; }
      @@clientLocation(Paths.listPaths, Items);
      @@clientLocation(Items.listPaths, Paths);`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("checks virtual groups and exempts operations relocated to a root client", async () => {
  await tester
    .expect(
      `${header}
      @get @route("/one") op listPaths(): string;
      interface Items { @get @route("/two") op listItems(): string; }
      @@clientLocation(listPaths, "Paths");
      @@clientLocation(Items.listItems, Test);`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("uses ownership of inherited operations rather than the template group name", async () => {
  await tester
    .expect(
      `${header}
      interface Base<T> { @get op listPaths(): T; }
      interface Paths extends Base<string> {}`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("uses a concrete operation alias name", async () => {
  await tester
    .expect(
      `${header}
      @get op Read<T>(): T;
      interface Paths { op listPaths is Read<string>; }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("is independent of explicit OpenAPI operation IDs", async () => {
  await tester
    .expect(
      `${header}
      interface Paths {
        @OpenAPI.operationId("Paths_list") @get @route("/one") op listPaths(): string;
        @OpenAPI.operationId("Paths_listPaths") @get @route("/two") op list(): string;
      }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it.each([
  {
    audience: "ARM",
    base: ArmTester,
    setup: `
      @armProviderNamespace @service @armCommonTypesVersion(CommonTypes.Versions.v5)
      namespace Arm;
      model Widget is TrackedResource<WidgetProperties> {
        @key("widgetName") @segment("widgets") name: string;
      }
      model WidgetProperties { provisioningState?: ResourceProvisioningState; }
    `,
    decorator: "@armResourceOperations",
    template: "ArmResourceRead<Widget>",
  },
  {
    audience: "data-plane",
    base: AzureCoreTester,
    setup: `
      @service namespace DataPlane;
      @resource("widgets") model Widget { @key id: string; }
      alias Operations = Azure.Core.ResourceOperations<
        NoConditionalRequests & NoRepeatableRequests & NoClientRequestId
      >;
    `,
    decorator: "",
    template: "Operations.ResourceRead<Widget>",
  },
])(
  "checks $audience standard operation templates",
  async ({ base, setup, decorator, template }) => {
    const standardTester = createLinterRuleTester(
      await base.createInstance(),
      noRedundantOperationGroupNameRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await standardTester
      .expect(`${setup} ${decorator} interface Widgets { getWidget is ${template}; }`)
      .toEmitDiagnostics(diagnostic("getWidget", "Widgets"));
    await standardTester
      .expect(`${setup} ${decorator} interface Widgets { get is ${template}; }`)
      .toBeValid();
  },
);
