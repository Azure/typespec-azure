import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { pageableRequires200ResponseRule } from "../../src/rules/pageable-requires-200-response.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.import("@typespec/openapi")
    .wrap(
      (code) => `
      @service namespace Contoso;
      model Page {
        @pageItems value: string[];
        @nextLink nextLink?: url;
      }
      ${code}
    `,
    )
    .createInstance();
  tester = createLinterRuleTester(
    runner,
    pageableRequires200ResponseRule,
    "@azure-tools/typespec-azure-core",
  );
});

describe("pageable-requires-200-response", () => {
  const diagnostic = {
    code: "@azure-tools/typespec-azure-core/pageable-requires-200-response",
    severity: "warning",
    message: "Next-link pageable operations must define a 200 response.",
  } as const;

  it.each(["get", "post"])("reports a pageable %s with only a 201 response", async (verb) => {
    await tester
      .expect(
        `
        @list @${verb} op list(): {
          @statusCode status: 201;
          @body body: Page;
        };
        `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not treat a default response as an explicit 200", async () => {
    await tester
      .expect(
        `
        @TypeSpec.OpenAPI.defaultResponse
        model DefaultPage extends Page {}
        @list @post op list(): DefaultPage;
        `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not treat a 2XX range as an explicit 200", async () => {
    await tester
      .expect(
        `
        @list @post op list(): {
          @statusCode @minValue(200) @maxValue(299) status: int32;
          @body body: Page;
        };
        `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it.each([
    ["implicit 200", ""],
    ["explicit 200", "@statusCode status: 200;"],
    ["200 and another success", "@statusCode status: 200 | 201;"],
  ])("accepts a pageable response with %s", async (_, status) => {
    await tester
      .expect(
        `
        @list @post op list(): {
          ${status}
          @body body: Page;
        };
        `,
      )
      .toBeValid();
  });

  it("does not impose paging response codes on operations without @list", async () => {
    await tester
      .expect(
        `
        @post op create(): {
          @statusCode status: 201;
          @body body: Page;
        };
        `,
      )
      .toBeValid();
  });

  it("does not require 200 for lists without next-link paging", async () => {
    await tester
      .expect(
        `
        @list @post op list(): {
          @statusCode status: 201;
          @pageItems value: string[];
          @continuationToken token?: string;
        };
        `,
      )
      .toBeValid();
  });

  it("checks a concrete operation instantiated from a paging template", async () => {
    await tester
      .expect(
        `
        @list @post op List<T>(): {
          @statusCode status: 201;
          @pageItems value: T[];
          @nextLink nextLink?: url;
        };
        op list is List<string>;
        `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not report on uninstantiated operation or interface templates", async () => {
    await tester
      .expect(
        `
        @list @post op List<T>(): {
          @statusCode status: 201;
          @pageItems value: T[];
          @nextLink nextLink?: url;
        };
        interface Lists<T> {
          @list @post list(): {
            @statusCode status: 201;
            @pageItems value: T[];
            @nextLink nextLink?: url;
          };
        }
        `,
      )
      .toBeValid();
  });
});
