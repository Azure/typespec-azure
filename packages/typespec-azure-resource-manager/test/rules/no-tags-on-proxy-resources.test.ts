import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { noTagsOnProxyResourcesRule } from "../../src/rules/no-tags-on-proxy-resources.js";

const ruleCode = "@azure-tools/typespec-azure-resource-manager/no-tags-on-proxy-resources";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noTagsOnProxyResourcesRule,
    "@azure-tools/typespec-azure-resource-manager",
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
