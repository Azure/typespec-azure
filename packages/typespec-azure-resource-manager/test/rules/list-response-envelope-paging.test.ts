import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    listResponseEnvelopeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
}, 30_000);

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/list-response-envelope",
  message: "Paged ARM list responses must declare a 'value' property of array type.",
};

const continuationTokenDiagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/list-response-envelope",
  severity: "warning",
  message: "Use @nextLink pagination instead of @continuationToken in Azure APIs.",
} as const;

it("reports a request token even when the response has a valid next-link envelope", async () => {
  await tester
    .expect(
      `
      @get @list op listWidgets(@query @continuationToken token?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    )
    .toEmitDiagnostics([continuationTokenDiagnostic]);
});

it("reports paired tokens independently of a valid response envelope", async () => {
  await tester
    .expect(
      `
      @get @list op listWidgets(@query @continuationToken token?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
        @header @continuationToken token?: string;
      };
    `,
    )
    .toEmitDiagnostics([continuationTokenDiagnostic, continuationTokenDiagnostic]);
});

it.each([false, true])("supports ARM property suppression: %s", async (suppress) => {
  const diagnostics = await Tester.diagnose(
    `
      model Options {
        ${suppress ? '#suppress "@azure-tools/typespec-azure-resource-manager/list-response-envelope" "Preserve the published token-based paging contract."' : ""}
        @continuationToken token?: string;
      }
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: {
            "@azure-tools/typespec-azure-core/list-response-envelope": false,
            "@azure-tools/typespec-azure-resource-manager/list-response-envelope": true,
          },
        },
      },
    },
  );
  if (suppress) {
    expectDiagnosticEmpty(diagnostics);
  } else {
    expectDiagnostics(diagnostics, [continuationTokenDiagnostic]);
  }
});

it("avoids duplicate token warnings when ARM all follows core all", async () => {
  const diagnostics = await Tester.diagnose(
    `model Options { @continuationToken token?: string; }`,
    {
      compilerOptions: {
        linterRuleSet: {
          extends: [
            "@azure-tools/typespec-azure-core/all",
            "@azure-tools/typespec-azure-resource-manager/all",
          ],
        },
      },
    },
  );
  expectDiagnostics(
    diagnostics.filter((diagnostic) => diagnostic.code.endsWith("/list-response-envelope")),
    [continuationTokenDiagnostic],
  );
});

it.each(["Azure.Core", "Azure.ResourceManager"])("ignores library tokens in %s", async (ns) => {
  await tester
    .expect(
      `
      namespace ${ns} {
        model Options { @continuationToken token?: string; }
      }
    `,
    )
    .toBeValid();
});

const resource = `
  @armProviderNamespace
  @service(#{ title: "Test" })
  namespace Microsoft.Test;

  model Widget is ProxyResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

function listResourceWithResponse(response: string): string {
  return `
    ${resource}
    ${response}
    @armResourceOperations
    interface Widgets {
      listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
    }
  `;
}

it("reports a missing value array on an ARM list response override", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model WidgetPage {
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
      `),
    )
    .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
});

it("reports a paginated POST list action without value", async () => {
  await tester
    .expect(
      `
        ${resource}
        model WidgetPage {
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
        @armResourceOperations
        interface Widgets {
          @list
          listCustom is ArmResourceActionSync<Widget, void, ArmResponse<WidgetPage>>;
        }
      `,
    )
    .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
});

it("reports a non-array value even when another property supplies page items", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model WidgetPage {
          value: string;
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
      `),
    )
    .toEmitDiagnostics({ ...diagnostic, target: "value" });
});

it("rejects a non-standard next-link property in the combined envelope check", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model WidgetPage {
          @pageItems value: Widget[];
          @nextLink nextPage?: string;
        }
      `),
    )
    .toEmitDiagnostics({ code: diagnostic.code, target: "nextPage" });
});

it("accepts a value array with the standard next link", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model WidgetPage {
          @pageItems value: Widget[];
          @nextLink nextLink?: string;
        }
      `),
    )
    .toBeValid();
});

it("accepts an inherited value array", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model BasePage {
          @pageItems value: Widget[];
          @nextLink nextLink?: string;
        }
        model WidgetPage extends BasePage {}
      `),
    )
    .toBeValid();
});

it("reports an inherited non-array value", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model BasePage {
          value: string;
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
        model WidgetPage extends BasePage {}
      `),
    )
    .toEmitDiagnostics({ ...diagnostic, target: "value" });
});

it("accepts the standard ARM list response template", async () => {
  await tester
    .expect(
      `
        ${resource}
        @armResourceOperations
        interface Widgets {
          listByParent is ArmResourceListByParent<Widget>;
        }
      `,
    )
    .toBeValid();
});

it("retains the collection-path envelope requirement without paging next-link metadata", async () => {
  await tester
    .expect(
      listResourceWithResponse(`
        model WidgetPage {
          @pageItems items: Widget[];
        }
      `),
    )
    .toEmitDiagnostics({ code: diagnostic.code, target: "items" });
});

it("ignores an operation without the list decorator", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/widgets") @get op fetchWidgets(): WidgetPage;
      `,
    )
    .toBeValid();
});

it("checks authored list responses without a provider decorator", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/widgets") @get @list op listWidgets(): WidgetPage;
      `,
    )
    .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
});

it("reports separately on operations sharing one invalid response", async () => {
  await tester
    .expect(
      `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          value: string;
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/one") @get @list op listOne(): WidgetPage;
        @route("/two") @post @list op listTwo(): WidgetPage;
      `,
    )
    .toEmitDiagnostics([
      { ...diagnostic, target: "value" },
      { ...diagnostic, target: "value" },
    ]);
});
