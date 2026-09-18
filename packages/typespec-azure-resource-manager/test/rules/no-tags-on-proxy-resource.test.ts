import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  expectDiagnostics,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { noTagsOnProxyResourceRule } from "../../src/rules/no-tags-on-proxy-resource.js";

const ruleCode = "@azure-tools/typespec-azure-resource-manager/no-tags-on-proxy-resource";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noTagsOnProxyResourceRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

describe("codefix", () => {
  it.each([
    "tags?: Record<string>;",
    "tags?: Record<string> /* Resource tags. */;",
    "tags?: Record<string> // Resource tags.\n;",
    '@encodedName("application/json", "tags") labels?: Record<string>;',
    '/** Resource tags. */ @doc("Resource tags.") tags?: Record<string>;',
    "tags?: Record<string>,",
    "tags?: Record<string>",
  ])("removes a directly declared envelope property: %s", async (declaration) => {
    const code = `
      @armProviderNamespace namespace MyService;
      model Widget is ProxyResource<WidgetProperties> {
        @key @segment("widgets") name: string;
        ${declaration}
      }
      model WidgetProperties { description?: string; }
    `;
    const fixed = code.replace(declaration, "");
    await tester.expect(code).applyCodeFix("remove-proxy-resource-tags").toEqual(fixed);
    await tester.expect(fixed).toBeValid();
  });

  it("preserves adjacent envelope properties", async () => {
    const code = `
      @armProviderNamespace namespace MyService;
      model Widget is ProxyResource<{}> {
        @key @segment("widgets") name: string;
        tags?: Record<string>; description?: string;
      }
    `;
    const fixed = code.replace("tags?: Record<string>;", "");
    await tester.expect(code).applyCodeFix("remove-proxy-resource-tags").toEqual(fixed);
    await tester.expect(fixed).toBeValid();
  });

  it.each([
    {
      name: "spread envelope property",
      resource: "model Widget is ProxyResource<WidgetProperties>",
      members: '@key @segment("widgets") name: string; ...Tags;',
      models: "model Tags { tags?: Record<string>; } model WidgetProperties {}",
    },
    {
      name: "copied envelope property",
      diagnosticNames: ["TaggedResource", "Widget"],
      resource: "model Widget is TaggedResource<WidgetProperties>",
      members: "",
      models: `
        model TaggedResource<T extends {}> is ProxyResource<T> {
          @key @segment("widgets") name: string;
          tags?: Record<string>;
        }
        model WidgetProperties {}
      `,
    },
    {
      name: "inherited envelope property",
      diagnosticNames: ["TaggedResource"],
      resource: "model Widget extends TaggedResource<WidgetProperties>",
      members: "",
      models: `
        model TaggedResource<T extends {}> is ProxyResource<T> {
          @key @segment("widgets") name: string;
          tags?: Record<string>;
        }
        model WidgetProperties {}
      `,
    },
    {
      name: "shared properties bag",
      resource: "model Widget is ProxyResource<WidgetProperties>",
      members: '@key @segment("widgets") name: string;',
      models: `
        model WidgetProperties { tags?: Record<string>; }
        model Other { properties: WidgetProperties; }
      `,
    },
    {
      name: "inherited properties bag",
      resource: "model Widget is ProxyResource<WidgetProperties>",
      members: '@key @segment("widgets") name: string;',
      models: `
        model BaseProperties { tags?: Record<string>; }
        model WidgetProperties extends BaseProperties {}
      `,
    },
  ])(
    "does not offer removal for a $name",
    async ({ resource, members, models, diagnosticNames = ["Widget"] }) => {
      const diagnostics = await runner.diagnose(
        `
        @armProviderNamespace namespace MyService;
        ${resource} {
          ${members}
        }
        ${models}
      `,
        { compilerOptions: { linterRuleSet: { enable: { [ruleCode]: true } } } },
      );
      expectDiagnostics(
        diagnostics,
        diagnosticNames.map((name) => ({ code: ruleCode, message: new RegExp(`'${name}'`) })),
      );
      for (const diagnostic of diagnostics) {
        expect(diagnostic.codefixes?.map((fix) => fix.id) ?? []).not.toContain(
          "remove-proxy-resource-tags",
        );
      }
    },
  );
});

describe("valid cases", () => {
  it("is valid for a proxy resource without tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is ProxyResource<WidgetProperties> {
          @key @segment("widgets") name: string;
        }

        model WidgetProperties {
          description?: string;
        }
        `,
      )
      .toBeValid();
  });

  it("is valid for a tracked resource with tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is TrackedResource<WidgetProperties> {
          @key @segment("widgets") name: string;
        }

        model WidgetProperties {
          description?: string;
        }
        `,
      )
      .toBeValid();
  });

  it("is valid when a property named tags is encoded to another JSON name", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is ProxyResource<WidgetProperties> {
          @key @segment("widgets") name: string;
        }

        model WidgetProperties {
          @encodedName("application/json", "labels")
          tags?: Record<string>;
        }
        `,
      )
      .toBeValid();
  });
});

describe("invalid cases", () => {
  it("emits a warning for tags on the proxy resource envelope", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is ProxyResource<WidgetProperties> {
          @key @segment("widgets") name: string;
          tags?: Record<string>;
        }

        model WidgetProperties {
          description?: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Proxy resource 'Widget' must not declare `tags` on its resource envelope or in its properties bag. Use a tracked resource if tags are required.",
      });
  });

  it("emits a warning for inherited tags in the properties bag", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is ProxyResource<WidgetProperties> {
          @key @segment("widgets") name: string;
        }

        model WidgetProperties extends BaseProperties {
          description?: string;
        }

        model BaseProperties {
          tags?: Record<string>;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Proxy resource 'Widget' must not declare `tags` on its resource envelope or in its properties bag. Use a tracked resource if tags are required.",
      });
  });

  it("emits a warning when another property is encoded as tags", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace namespace MyService;

        model Widget is ProxyResource<WidgetProperties> {
          @key @segment("widgets") name: string;
        }

        model WidgetProperties {
          @encodedName("application/json", "tags")
          labels?: Record<string>;
        }
        `,
      )
      .toEmitDiagnostics({
        code: ruleCode,
        message:
          "Proxy resource 'Widget' must not declare `tags` on its resource envelope or in its properties bag. Use a tracked resource if tags are required.",
      });
  });
});
