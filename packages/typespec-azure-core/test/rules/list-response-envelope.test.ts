import { Tester } from "#test/test-host.js";
import {
  type LinterRuleTester,
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    listResponseEnvelopeRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/list-response-envelope",
  severity: "warning",
  message:
    "This list operation has a request @continuationToken but no response @continuationToken. Review the SDK paging contract: when the response uses @nextLink, the pager may resume with a URL rather than the raw request token.",
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

it("warns once for ResourceList with a list query parameter trait", async () => {
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
  "@continuationToken token?: string; @nextLink nextLink?: url;",
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

it("accepts next-link paging without a token annotation or ARM envelope names", async () => {
  await tester
    .expect(
      `
      @list op listWidgets(@query continuationToken?: string): {
        @pageItems items: string[];
        @nextLink more?: url;
        totalCount: int32;
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

it("ignores unmarked operations and unused annotated models", async () => {
  await tester
    .expect(
      `
      model Options { @continuationToken token?: string; }
      op read(@query @continuationToken token?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
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

it("checks concrete operations rather than template declarations", async () => {
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

it("reports one warning per operation rather than per repeated decorator", async () => {
  await tester
    .expect(
      `
      @list op listWidgets(
        @query @continuationToken @continuationToken token?: string
      ): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it.each([false, true])("supports operation suppression: %s", async (suppress) => {
  const diagnostics = await Tester.diagnose(
    `
      ${suppress ? '#suppress "@azure-tools/typespec-azure-core/list-response-envelope" "Preserve the published API contract."' : ""}
      @list op listWidgets(@query @continuationToken token?: string): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-azure-core/list-response-envelope": true },
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
