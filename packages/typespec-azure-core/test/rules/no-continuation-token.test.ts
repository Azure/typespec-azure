import { Tester } from "#test/test-host.js";
import {
  type LinterRuleTester,
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noContinuationTokenRule } from "../../src/rules/no-continuation-token.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noContinuationTokenRule,
    "@azure-tools/typespec-azure-core",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-core/no-continuation-token",
  severity: "warning",
  message: "Use @nextLink pagination instead of @continuationToken in Azure APIs.",
} as const;

it.each(["query", "header"])("warns on paired %s continuation tokens", async (location) => {
  await tester
    .expect(
      `
      @list op listWidgets(@${location} @continuationToken token?: string): {
        @pageItems value: string[];
        @continuationToken token?: string;
      };
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("warns on a response header token", async () => {
  await tester
    .expect(
      `
      model ResponseHeaders { @header @continuationToken token?: string; }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("warns on a token without requiring a paging operation", async () => {
  await tester
    .expect(
      `
      op read(@query @continuationToken token?: string): string;
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("warns on a nested token", async () => {
  await tester
    .expect(
      `
      model Response {
        metadata: { @continuationToken token?: string; };
      }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("warns on an inherited token at its declaration", async () => {
  await tester
    .expect(
      `
      model Token { @continuationToken token?: string; }
      model Response extends Token { value: string[]; }
    `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it.each(["...Token", "...TokenCopy"])("warns on token usage through %s", async (spread) => {
  await tester
    .expect(
      `
      model Token { @continuationToken token?: string; }
      model TokenCopy is Token;
      op read(${spread}): string;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
});

it("accepts next-link paging", async () => {
  await tester
    .expect(
      `
      @list op listWidgets(): {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      };
    `,
    )
    .toBeValid();
});

it("does not infer decorators from property names", async () => {
  await tester
    .expect(
      `
      model Options { continuationToken?: string; skipToken?: string; }
    `,
    )
    .toBeValid();
});

it.each(["Azure.Core", "Azure.ResourceManager"])("ignores library types in %s", async (ns) => {
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

it.each([false, true])("supports property suppression: %s", async (suppress) => {
  const diagnostics = await Tester.diagnose(
    `
      model Options {
        ${suppress ? '#suppress "@azure-tools/typespec-azure-core/no-continuation-token" "Preserve the published token-based paging contract."' : ""}
        @continuationToken token?: string;
      }
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-azure-core/no-continuation-token": true },
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
