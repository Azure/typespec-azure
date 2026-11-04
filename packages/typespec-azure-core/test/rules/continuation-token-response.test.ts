import { Tester } from "#test/test-host.js";
import {
  type LinterRuleTester,
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { continuationTokenResponseRule } from "../../src/rules/continuation-token-response.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    continuationTokenResponseRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/continuation-token-response",
  severity: "warning",
  message:
    "This list operation has a request @continuationToken but no response @continuationToken. If the service uses nextLink, remove the redundant token parameter when compatible; otherwise, annotate the token actually returned by the service.",
} as const;

it.each(["", "@nextLink nextLink?: url;"])(
  "warns on a request-only token with response navigation %j",
  async (navigation) => {
    await tester
      .expect(
        `
        @list op listWidgets(@query @continuationToken token?: string): {
          @pageItems value: string[];
          ${navigation}
        };
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  },
);

it.each(["@header @continuationToken token?: string", "...Token", "@body options: Token"])(
  "finds request tokens in %s",
  async (parameters) => {
    await tester
      .expect(
        `
      model BaseToken { @continuationToken token?: string; }
      model Token extends BaseToken {}
      @list op listWidgets(${parameters}): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  },
);

it("warns for ResourceList with a list query parameter trait", async () => {
  await tester
    .expect(
      `
      using Azure.Core.Traits;
      @resource("widgets") model Widget { @key id: string; }
      alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
      op listWidgets is Operations.ResourceList<Widget, ListQueryParametersTrait<{
        @query @continuationToken continuationToken?: string;
      }>>;
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it.each([
  "@continuationToken token?: string;",
  "@header @continuationToken token?: string;",
  "metadata: { @continuationToken token?: string | null; };",
  "...Token;",
])("accepts a paired response token in %s", async (response) => {
  await tester
    .expect(
      `
      model Token { @continuationToken token?: string; }
      @list op listWidgets(@query @continuationToken token?: string): {
        @pageItems value: string[];
        ${response}
      };
    `,
    )
    .toBeValid();
});

it("finds an inherited response token alongside an error response", async () => {
  await tester
    .expect(
      `
      model Token { @continuationToken token?: string; }
      model WidgetPage extends Token { @pageItems value: string[]; }
      @error model Error { message: string; }
      @list op listWidgets(@query @continuationToken token?: string): WidgetPage | Error;
    `,
    )
    .toBeValid();
});

it("accepts nextLink paging without a token annotation", async () => {
  await tester
    .expect(
      `
      @list op listWidgets(@query continuationToken?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    )
    .toBeValid();
});

it("does not enforce the inverse mismatch", async () => {
  await tester
    .expect(
      `
      @list op listWidgets(): {
        @pageItems value: string[];
        @continuationToken token?: string;
      };
    `,
    )
    .toBeValid();
});

it("ignores operations without @list", async () => {
  await tester
    .expect(
      `
      op read(@query @continuationToken token?: string): string;
    `,
    )
    .toBeValid();
});

it.each(["Azure.Core", "Azure.ResourceManager"])("ignores library types in %s", async (ns) => {
  await tester
    .expect(
      `
      namespace ${ns} {
        @list op listWidgets(@continuationToken token?: string): {
          @pageItems value: string[];
        };
      }
    `,
    )
    .toBeValid();
});

it("checks instantiated operations rather than template declarations", async () => {
  await tester
    .expect(
      `
      @list op ListWidgets<T>(@continuationToken token?: string): {
        @pageItems value: T[];
      };
      interface Lists<T> {
        @list listWidgets(@continuationToken token?: string): {
          @pageItems value: T[];
        };
      }
      @route("/strings") op listStrings is ListWidgets<string>;
      interface StringLists extends Lists<string> {}
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it.each([false, true])("supports operation suppression: %s", async (suppress) => {
  const diagnostics = await Tester.diagnose(
    `
      ${suppress ? '#suppress "@azure-tools/typespec-azure-core/continuation-token-response" "Preserve the published API contract."' : ""}
      @list op listWidgets(@query @continuationToken token?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-azure-core/continuation-token-response": true },
        },
      },
    },
  );
  if (suppress) {
    expectDiagnosticEmpty(diagnostics);
  } else {
    expectDiagnostics(diagnostics, [diagnostic]);
  }
});
