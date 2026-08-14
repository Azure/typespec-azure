import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { pathParameterNamesRule } from "../../src/rules/path-parameter-names.js";
import { Tester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, pathParameterNamesRule, "tsp-lintdiff-local-linter");
});

it("reports inconsistent data-plane parameter names", async () => {
  await tester
    .expect(
      `
      @service namespace TestService;

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}/details")
      @get op getWidgetDetails(@path widgetId: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/path-parameter-names",
      message: 'Inconsistent path parameter names "widgetId" and "name".',
    });
});

it("reports a shared path only once", async () => {
  await tester
    .expect(
      `
      @service namespace TestService;

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}/details")
      @get op getWidgetDetails(@path widgetId: string): void;

      @route("/widgets/{widgetId}/details")
      @delete op deleteWidgetDetails(@path widgetId: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/path-parameter-names",
      message: 'Inconsistent path parameter names "widgetId" and "name".',
    });
});

it("does not compare routes that never coexist in one service version", async () => {
  await tester
    .expect(
      `
      @service
      @versioned(Versions)
      namespace TestService;

      enum Versions {
        v1,
        v2,
      }

      @removed(Versions.v2)
      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @added(Versions.v2)
      @route("/widgets/{widgetId}")
      @get op getWidgetV2(@path widgetId: string): void;
      `,
    )
    .toBeValid();
});

it("reports a persistent inconsistency only once across service versions", async () => {
  await tester
    .expect(
      `
      @service
      @versioned(Versions)
      namespace TestService;

      enum Versions {
        v1,
        v2,
      }

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}/details")
      @get op getWidgetDetails(@path widgetId: string): void;
      `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/path-parameter-names",
      message: 'Inconsistent path parameter names "widgetId" and "name".',
    });
});

it("reports distinct paths that reuse the same parameter property", async () => {
  const diagnostic = {
    code: "tsp-lintdiff-local-linter/path-parameter-names",
    message: 'Inconsistent path parameter names "widgetId" and "name".',
  };

  await tester
    .expect(
      `
      @service namespace TestService;

      model WidgetIdParameter {
        @path widgetId: string;
      }

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}/details")
      @get op getWidgetDetails(...WidgetIdParameter): void;

      @route("/widgets/{widgetId}/other")
      @get op getOtherWidgetDetails(...WidgetIdParameter): void;
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("reports reused parameter properties independently per service", async () => {
  await tester
    .expect(
      `
      model WidgetIdParameter {
        @path widgetId: string;
      }

      @service
      namespace FirstService {
        @route("/widgets/{name}")
        @get op getWidget(@path name: string): void;

        @route("/widgets/{widgetId}/details")
        @get op getWidgetDetails(...WidgetIdParameter): void;
      }

      @service
      namespace SecondService {
        @route("/widgets/{id}")
        @get op getWidget(@path id: string): void;

        @route("/widgets/{widgetId}/details")
        @get op getWidgetDetails(...WidgetIdParameter): void;
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "tsp-lintdiff-local-linter/path-parameter-names",
        message: 'Inconsistent path parameter names "widgetId" and "name".',
      },
      {
        code: "tsp-lintdiff-local-linter/path-parameter-names",
        message: 'Inconsistent path parameter names "widgetId" and "id".',
      },
    ]);
});

it("ignores literal-query routes emitted under x-ms-paths", async () => {
  await tester
    .expect(
      `
      @service namespace TestService;

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}?mode=details")
      @get op getWidgetDetails(@path widgetId: string): void;
      `,
    )
    .toBeValid();
});

it("uses AutoRest URL ordering to establish the expected parameter name", async () => {
  await tester
    .expect(
      `
      @service namespace TestService;

      @route("/libraries/{libraryId}/books/{bookName}")
      @get op getLibraryBook(
        @path libraryId: string,
        @path bookName: string,
      ): void;

      @route("/authors/{authorId}/books/{bookId}")
      @get op getAuthorBook(
        @path authorId: string,
        @path bookId: string,
      ): void;

      @route("/publishers/{publisherId}/books/{bookId}")
      @get op getPublisherBook(
        @path publisherId: string,
        @path bookId: string,
      ): void;
      `,
    )
    .toEmitDiagnostics({
      code: "tsp-lintdiff-local-linter/path-parameter-names",
      message: 'Inconsistent path parameter names "bookName" and "bookId".',
    });
});

it("ignores ARM provider namespaces", async () => {
  await tester
    .expect(
      `
      @service
      @armProviderNamespace
      namespace TestService;

      @route("/widgets/{name}")
      @get op getWidget(@path name: string): void;

      @route("/widgets/{widgetId}/details")
      @get op getWidgetDetails(@path widgetId: string): void;
      `,
    )
    .toBeValid();
});
