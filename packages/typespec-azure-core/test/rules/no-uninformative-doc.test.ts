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
  for (const partType of [
    'HttpPart<string, #{name: "part_name"}>',
    'HttpPart<UploadText, #{name: "part_name"}>',
    'HttpPart<string[], #{name: "part_name"}>',
    'HttpPart<string, #{name: "part_name"}>[]',
  ]) {
    it(`compares multipart documentation with its authored name for ${partType}`, async () => {
      const operation = (doc: string) => `
        scalar UploadText extends string;
        op upload(
          @header contentType: "multipart/form-data",
          @multipartBody body: { @doc("${doc}") /*part*/propName: ${partType}; }
        ): void;
      `;
      await tester.expect(operation(" Part_Name. ")).toEmitDiagnostics(({ part }) => {
        const location = getSourceLocation(part);
        return [
          {
            ...diagnostic("part_name", " Part_Name. "),
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          },
        ];
      });
      await tester.expect(operation("propName")).toBeValid();
      await tester.expect(operation("The text submitted for processing.")).toBeValid();
      await tester
        .expect(operation("description."))
        .toEmitDiagnostics([diagnostic("part_name", "description.")]);
    });
  }

  it("uses the source property name for an unnamed multipart part", async () => {
    const operation = (doc: string) => `
      op upload(
        @header contentType: "multipart/form-data",
        @multipartBody body: {
          @encodedName("application/json", "jsonName")
          @doc("${doc}") propName: HttpPart<string>;
        }
      ): void;
    `;
    await tester
      .expect(operation("propName"))
      .toEmitDiagnostics([diagnostic("propName", "propName")]);
    await tester.expect(operation("jsonName")).toBeValid();
  });

  it("preserves authored multipart names over JSON encoded names", async () => {
    const operation = (doc: string) => `
      op upload(
        @header contentType: "multipart/form-data",
        @multipartBody body: {
          @encodedName("application/json", "jsonName")
          @doc("${doc}") propName: HttpPart<string, #{name: "part_name"}>;
        }
      ): void;
    `;
    await tester
      .expect(operation("part_name"))
      .toEmitDiagnostics([diagnostic("part_name", "part_name")]);
    await tester.expect(operation("jsonName")).toBeValid();
  });

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

  it("checks inferred operation verbs for placeholder text", async () => {
    await tester
      .expect('@doc("description") op read(): string;')
      .toEmitDiagnostics([diagnostic("get", "description")]);
    await tester.expect('@doc("read") op read(): string;').toBeValid();
  });

  it("compares inferred GET operations with their effective HTTP verb", async () => {
    await tester
      .expect('@route("/widgets") @doc(" GET. ") op read(): string;')
      .toEmitDiagnostics([diagnostic("get", " GET. ")]);
    await tester.expect('@route("/widgets") @doc("read") op read(): string;').toBeValid();
  });

  it("compares inferred POST operations with their effective HTTP verb", async () => {
    await tester
      .expect('@route("/widgets") @doc("post") op create(@body body: string): string;')
      .toEmitDiagnostics([diagnostic("post", "post")]);
    await tester
      .expect('@route("/widgets") @doc("create") op create(@body body: string): string;')
      .toBeValid();
  });

  it("preserves explicit HTTP verbs over inference", async () => {
    await tester.expect('@route("/widgets") @get @doc("post") op read(): string;').toBeValid();
    await tester.expect('@route("/widgets") @post @doc("get") op create(): string;').toBeValid();
  });

  it("compares ordinary properties with their JSON encoded names", async () => {
    await tester
      .expect(
        'model Widget { @encodedName("application/json", "wire-name") @doc(" Wire-Name. ") sourceName: string; }',
      )
      .toEmitDiagnostics([diagnostic("wire-name", " Wire-Name. ")]);
  });

  it("accepts JSON-renamed property documentation matching only its source name", async () => {
    await tester
      .expect(
        'model Widget { @encodedName("application/json", "wire-name") @doc("sourceName") sourceName: string; }',
      )
      .toBeValid();
  });

  it("checks JSON-renamed properties for placeholder text", async () => {
    await tester
      .expect(
        'model Widget { @encodedName("application/json", "wire-name") @doc("description.") sourceName: string; }',
      )
      .toEmitDiagnostics([diagnostic("wire-name", "description.")]);
  });

  it("ignores non-JSON encoded names for ordinary properties", async () => {
    await tester
      .expect(
        'model Widget { @encodedName("application/xml", "wire-name") @doc("wire-name") sourceName: string; }',
      )
      .toBeValid();
  });

  it("preserves HTTP parameter names over JSON encoded names", async () => {
    for (const kind of ["path", "query", "header"]) {
      const route = kind === "path" ? '@route("/widgets/{wireName}")' : "";
      await tester
        .expect(
          `${route} @get op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("wireName.") source: string): string;`,
        )
        .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
      await tester
        .expect(
          `${route} @get op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("jsonName") source: string): string;`,
        )
        .toBeValid();
    }
  });

  it("targets inferred operations and JSON-renamed properties", async () => {
    await tester
      .expect(
        `
        @route("/widgets") @doc("get") op /*read*/read(): string;
        @route("/widgets") @doc("post") op /*create*/create(@body body: string): string;
        model Widget {
          @encodedName("application/json", "wire-name")
          @doc("wire-name")
          /*source*/sourceName: string;
        }
      `,
      )
      .toEmitDiagnostics(({ read, create, source }) =>
        [
          [source, "wire-name"],
          [read, "get"],
          [create, "post"],
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
    await tester
      .expect(
        'model Response { @statusCode @encodedName("application/json", "wire-status") @doc("wire-status") status: 200; }',
      )
      .toBeValid();
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
