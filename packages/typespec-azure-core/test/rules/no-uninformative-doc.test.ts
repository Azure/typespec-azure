import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUninformativeDocRule } from "../../src/rules/no-uninformative-doc.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUninformativeDocRule,
    "@azure-tools/typespec-azure-core",
  );
});

function diagnostic(name: string, description: string) {
  return {
    code: "@azure-tools/typespec-azure-core/no-uninformative-doc",
    message: `Description must not match the name of the node it describes. Node name:'${name}' Description:'${description}'`,
  };
}

describe("no-uninformative-doc", () => {
  it("reports model documentation matching its name", async () => {
    await tester
      .expect('@doc("Widget") model Widget {}')
      .toEmitDiagnostics([diagnostic("Widget", "Widget")]);
  });

  it("normalizes whitespace, periods, and case", async () => {
    await tester
      .expect('@doc(" wIdGeT. ") model Widget {}')
      .toEmitDiagnostics([diagnostic("Widget", " wIdGeT. ")]);
  });

  it("checks doc comments", async () => {
    await tester
      .expect("/** widget */ model Widget {}")
      .toEmitDiagnostics([diagnostic("Widget", "widget")]);
  });

  it("reports scalar documentation matching its name", async () => {
    await tester
      .expect('@doc("Label.") scalar Label extends string;')
      .toEmitDiagnostics([diagnostic("Label", "Label.")]);
  });

  it("reports enum documentation matching its name", async () => {
    await tester
      .expect('@doc("State") enum State { Ready }')
      .toEmitDiagnostics([diagnostic("State", "State")]);
  });

  it("reports union documentation matching its name", async () => {
    await tester
      .expect('@doc("State") union State { Ready: "ready", string }')
      .toEmitDiagnostics([diagnostic("State", "State")]);
  });

  it("compares enum members with their names rather than literal values", async () => {
    await tester
      .expect('enum State { @doc("Ready.") Ready: "available" }')
      .toEmitDiagnostics([diagnostic("Ready", "Ready.")]);
    await tester.expect('enum State { @doc("wire-value") Ready: "wire-value" }').toBeValid();
  });

  it("compares named union variants with their names rather than literal values", async () => {
    await tester
      .expect('union State { @doc("Ready.") Ready: "available", string }')
      .toEmitDiagnostics([diagnostic("Ready", "Ready.")]);
    await tester.expect('union State { @doc("available") Ready: "available", string }').toBeValid();
  });

  it("compares unnamed string variants with their values", async () => {
    await tester
      .expect('union State { @doc("ready") "ready", string }')
      .toEmitDiagnostics([diagnostic("ready", "ready")]);
  });

  it("checks unnamed non-string variants only for placeholder text", async () => {
    await tester
      .expect('union State { @doc("description") int32, string }')
      .toEmitDiagnostics([diagnostic("description", "description")]);
    await tester.expect('union State { @doc("int32") int32, string }').toBeValid();
  });

  it("checks key property documentation", async () => {
    await tester
      .expect('model Widget { @key @doc("id") id: string; }')
      .toEmitDiagnostics([diagnostic("id", "id")]);
  });

  it("reports property documentation matching its name", async () => {
    await tester
      .expect('model Widget { @doc("sku") sku: string; }')
      .toEmitDiagnostics([diagnostic("sku", "sku")]);
  });

  it("reports placeholder documentation", async () => {
    await tester
      .expect('@doc("description.") model Widget {}')
      .toEmitDiagnostics([diagnostic("Widget", "description.")]);
  });

  it("compares operations with their explicitly declared HTTP verb", async () => {
    await tester
      .expect('@get @doc("get.") op read(): string;')
      .toEmitDiagnostics([diagnostic("get", "get.")]);
  });

  it("accepts operation documentation matching only its source name", async () => {
    await tester.expect('@get @doc("read") op read(): string;').toBeValid();
  });

  it("checks operations without an explicit HTTP verb only for placeholder text", async () => {
    await tester
      .expect('@doc("description") op read(): string;')
      .toEmitDiagnostics([diagnostic("description", "description")]);
    await tester.expect('@doc("read") op read(): string;').toBeValid();
  });

  it("compares path parameters with their wire names", async () => {
    await tester
      .expect(
        '@route("/widgets/{wireName}") @get op read(@path("wireName") @doc("wireName.") source: string): string;',
      )
      .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
    await tester
      .expect(
        '@route("/widgets/{wireName}") @get op read(@path("wireName") @doc("source") source: string): string;',
      )
      .toBeValid();
  });

  it("compares query parameters with their wire names", async () => {
    await tester
      .expect('@get op read(@query("wireName") @doc("wireName.") source: string): string;')
      .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
    await tester
      .expect('@get op read(@query("wireName") @doc("source") source: string): string;')
      .toBeValid();
  });

  it("compares header parameters with their wire names", async () => {
    await tester
      .expect('@get op read(@header("wireName") @doc("wireName.") source: string): string;')
      .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
    await tester
      .expect('@get op read(@header("wireName") @doc("source") source: string): string;')
      .toBeValid();
  });

  it("ignores missing or normalized-empty documentation", async () => {
    await tester.expect("model Widget {}").toBeValid();
    await tester.expect('@doc("") model Widget {}').toBeValid();
    await tester.expect('@doc("  ...  ") model Widget {}').toBeValid();
    await tester.expect('enum State { Ready } union Mode { Active: "active", string }').toBeValid();
  });

  it("accepts meaningful documentation", async () => {
    await tester
      .expect(
        `
      @doc("A widget available in the store.") model Widget {}
      enum State { @doc("The widget is ready for use.") Ready }
      union Mode { @doc("The widget is ready for use.") Ready: "ready", string }
    `,
      )
      .toBeValid();
  });

  it("exempts HTTP status-code properties", async () => {
    await tester.expect('model Response { @statusCode @doc("status") status: 200; }').toBeValid();
  });

  it("targets each offending declaration without an aggregate diagnostic", async () => {
    await tester
      .expect(
        `
      enum State { @doc("Ready") /*ready*/Ready }
      model Widget { @key @doc("id") /*id*/id: string; }
    `,
      )
      .toEmitDiagnostics(({ ready, id }) =>
        [
          [id, "id"],
          [ready, "Ready"],
        ].map(([target, name]) => {
          const location = getSourceLocation(target as Parameters<typeof getSourceLocation>[0]);
          return {
            ...diagnostic(name as string, name as string),
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          };
        }),
      );
  });

  it("reports both targets in the incorrect documentation example", async () => {
    await tester
      .expect(
        `
      /** Widget */
      model /*widget*/Widget {
        /** Name */
        /*name*/name: string;
      }
    `,
      )
      .toEmitDiagnostics(({ widget, name }) =>
        [
          [widget, "Widget"],
          [name, "Name"],
        ].map(([target, text]) => {
          const location = getSourceLocation(target as Parameters<typeof getSourceLocation>[0]);
          return {
            ...diagnostic(text === "Widget" ? "Widget" : "name", text as string),
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          };
        }),
      );
  });

  it("accepts the corrected documentation example", async () => {
    await tester
      .expect(
        `
      /** A configurable device available in the store. */
      model Widget {
        /** The display name shown to users. */
        name: string;
      }
    `,
      )
      .toBeValid();
  });
});
