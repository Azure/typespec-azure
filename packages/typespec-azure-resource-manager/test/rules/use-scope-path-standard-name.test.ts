import { Tester } from "#test/tester.js";
import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { useScopePathStandardNameRule } from "../../src/rules/use-scope-path-standard-name.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-path-standard-name";
const message = "Resource-group paths must include '/resourceGroups/{resourceGroupName}'.";
const subscriptionMessage = "Subscription paths must include '/subscriptions/{subscriptionId}'.";
const service = "@service @armProviderNamespace namespace Microsoft.Test;";
let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useScopePathStandardNameRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it.each(["get", "put", "patch", "delete"])(
  "reports a missing resource-group parameter on %s at the operation",
  async (verb) => {
    await tester
      .expect(
        `
        ${service}
        @${verb} @route("/resourceGroups/providers/Microsoft.Test/widgets")
        op /*target*/probe(): void;
      `,
      )
      .toEmitDiagnostics(({ target }) => ({
        code,
        severity: "warning",
        message,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      }));
  },
);

it("reports a differently named resource-group parameter", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/{groupName}/providers/Microsoft.Test/widgets")
      op read(@path groupName: string): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("reports a differently named subscription parameter", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/subscriptions/{subId}/providers/Microsoft.Test/widgets")
      op read(@path subId: string): void;
    `,
    )
    .toEmitDiagnostics([
      {
        code,
        severity: "warning",
        message: subscriptionMessage,
      },
    ]);
});

it("reports both independently actionable scope naming failures", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/subscriptions/{subId}/resourceGroups/{groupName}/widgets")
      op /*target*/read(@path subId: string, @path groupName: string): void;
    `,
    )
    .toEmitDiagnostics(({ target }) => [
      {
        code,
        severity: "warning",
        message,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      },
      {
        code,
        severity: "warning",
        message: subscriptionMessage,
        pos: getSourceLocation(target).pos,
        end: getSourceLocation(target).end,
      },
    ]);
});

it.each([
  "/subscriptions/providers/Microsoft.Test/widgets",
  "/SUBSCRIPTIONS/fixedSubscription/widgets",
  "/subscriptions/fixedSubscription/widgets/{subscriptionId}",
])("reports a noncanonical subscription scope in %s", async (path) => {
  await tester
    .expect(
      `
      ${service}
      @get @route("${path}")
      op read(${path.includes("{subscriptionId}") ? "@path subscriptionId: string" : ""}): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message: subscriptionMessage }]);
});

it.each([
  "/SUBSCRIPTIONS/{SUBSCRIPTIONID}/widgets",
  "/subscriptions/{SUBSCRIPTIONID}/widgets/subscriptions/other",
])("accepts a canonical full-path subscription occurrence in %s", async (path) => {
  await tester
    .expect(
      `
      ${service}
      @get @route("${path}")
      op read(@path SUBSCRIPTIONID: string): void;
    `,
    )
    .toBeValid();
});

it("uses the serialized subscription parameter name in both directions", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/subscriptions/{subscriptionId}/widgets")
      op read(@path("subscriptionId") subId: string): void;
    `,
    )
    .toBeValid();
  await tester
    .expect(
      `
      ${service}
      @get @route("/subscriptions/{subId}/widgets")
      op read(@path("subId") subscriptionId: string): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message: subscriptionMessage }]);
});

it("reports a literal resource-group value", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/fixedGroup/providers/Microsoft.Test/widgets")
      op read(): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("does not mistake a parameter on another segment for a canonical group scope", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/fixedGroup/providers/Microsoft.Test/widgets/{resourceGroupName}")
      op read(@path resourceGroupName: string): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("accepts the canonical resource-group parameter", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets")
      op read(@path resourceGroupName: string): void;
    `,
    )
    .toBeValid();
});

it("matches the segment and parameter name without regard to case", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/RESOURCEGROUPS/{RESOURCEGROUPNAME}/providers/Microsoft.Test/widgets")
      op read(@path RESOURCEGROUPNAME: string): void;
    `,
    )
    .toBeValid();
});

it("still reports a noncanonical parameter after an uppercase scope segment", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/RESOURCEGROUPS/{groupName}/providers/Microsoft.Test/widgets")
      op read(@path groupName: string): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("checks the serialized path name instead of the TypeSpec property name", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets")
      op read(@path("resourceGroupName") groupName: string): void;
    `,
    )
    .toBeValid();

  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/{groupName}/providers/Microsoft.Test/widgets")
      op read(@path("groupName") resourceGroupName: string): void;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("accepts paths without a resource-group segment", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/subscriptions/{subscriptionId}/providers/Microsoft.Test/widgets")
      op read(@path subscriptionId: string): void;
    `,
    )
    .toBeValid();
});

it("does not match collection names that only share the resourceGroups prefix", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroupsHistory/fixedGroup")
      op read(): void;
    `,
    )
    .toBeValid();
});

it("accepts a canonical occurrence even when another resourceGroups segment differs", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/resourceGroups/literal")
      op read(@path resourceGroupName: string): void;
    `,
    )
    .toBeValid();
});

it.each(["post", "head"])("does not check %s scope paths", async (verb) => {
  await tester
    .expect(
      `
      ${service}
      @${verb} @route("/subscriptions/fixedSubscription/resourceGroups/fixedGroup/providers/Microsoft.Test/widgets")
      op probe(): void;
    `,
    )
    .toBeValid();
});

it("does not check a non-ARM service", async () => {
  await tester
    .expect(
      `
      @service namespace Example;
      @get @route("/subscriptions/fixedSubscription/resourceGroups/fixedGroup/providers/Example/widgets")
      op read(): void;
    `,
    )
    .toBeValid();
});

it("checks only the ARM operation in a mixed-service program", async () => {
  await tester
    .expect(
      `
      @service @armProviderNamespace namespace Microsoft.Test {
        @get @route("/resourceGroups/fixedGroup/widgets")
        op /*target*/read(): void;
      }
      @service namespace Example {
        @get @route("/resourceGroups/fixedGroup/widgets")
        op read(): void;
      }
    `,
    )
    .toEmitDiagnostics(({ target }) => ({
      code,
      severity: "warning",
      message,
      pos: getSourceLocation(target).pos,
      end: getSourceLocation(target).end,
    }));
});

it("reports each eligible operation sharing an invalid path", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/fixedGroup/widgets") op read(): void;
      @delete @route("/resourceGroups/fixedGroup/widgets") op remove(): void;
    `,
    )
    .toEmitDiagnostics([
      { code, severity: "warning", message },
      { code, severity: "warning", message },
    ]);
});

it("checks a concrete operation template without reporting its declaration", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/resourceGroups/fixedGroup/widgets") op read<T>(): T;
      op concrete is read<string>;
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("checks a concrete interface without reporting its template declaration", async () => {
  await tester
    .expect(
      `
      ${service}
      interface Reads<T> {
        @get @route("/resourceGroups/fixedGroup/widgets") read(): T;
      }
      interface Widgets extends Reads<string> {}
    `,
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

function templateFixture(baseParameters = "") {
  return `
    ${service}
    model WidgetProperties { description?: string; }
    model Widget is ProxyResource<WidgetProperties> {
      ...ResourceNameParameter<Widget>;
    }
    interface Operations extends Azure.ResourceManager.Operations {}
    ${baseParameters}
    @armResourceOperations
    interface Widgets {
      read is ArmResourceRead<Widget${baseParameters ? ", BaseParameters = CustomBase" : ""}>;
    }
  `;
}

it("reports a supported custom base on a standard ARM read template", async () => {
  await tester
    .expect(
      templateFixture(`
      model CustomBase {
        ...CommonTypes.ApiVersionParameter;
        ...CommonTypes.SubscriptionIdParameter;
        @path @segment("resourceGroups") groupName: string;
      }
    `),
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("reports a literal group supplied through a standard ARM template", async () => {
  await tester
    .expect(
      templateFixture(`
      model CustomBase {
        ...CommonTypes.ApiVersionParameter;
        ...CommonTypes.SubscriptionIdParameter;
        @path @segment("resourceGroups") groupName: "fixedGroup";
      }
    `),
    )
    .toEmitDiagnostics([{ code, severity: "warning", message }]);
});

it("accepts a standard ARM read template with its default base parameters", async () => {
  await tester.expect(templateFixture()).toBeValid();
});

it("accepts a custom base that retains the standard resource-group parameter", async () => {
  await tester
    .expect(
      templateFixture(`
      model CustomBase {
        ...CommonTypes.ApiVersionParameter;
        ...CommonTypes.SubscriptionIdParameter;
        ...ResourceGroupParameter;
      }
    `),
    )
    .toBeValid();
});

it.each([
  { subscription: "subscriptionId", group: "resourceGroupName", messages: [] },
  { subscription: "subscriptionId", group: "groupName", messages: [message] },
  { subscription: "subId", group: "resourceGroupName", messages: [subscriptionMessage] },
  { subscription: "subId", group: "groupName", messages: [message, subscriptionMessage] },
])(
  "checks standard ARM templates with $subscription and $group independently",
  async ({ subscription, group, messages }) => {
    const result = tester.expect(
      templateFixture(`
        model CustomBase {
          ...CommonTypes.ApiVersionParameter;
          @path @segment("subscriptions") ${subscription}: string;
          @path @segment("resourceGroups") ${group}: string;
        }
      `),
    );
    if (messages.length === 0) {
      await result.toBeValid();
    } else {
      await result.toEmitDiagnostics(
        messages.map((message) => ({ code, severity: "warning", message })),
      );
    }
  },
);

it("accepts routes without either scope segment", async () => {
  await tester
    .expect(
      `
      ${service}
      @get @route("/providers/Microsoft.Test/widgets")
      op read(): void;
    `,
    )
    .toBeValid();
});
