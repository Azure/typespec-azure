import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, requireDocumentation, "@azure-tools/typespec-azure-core");
});

async function checkDocRequired(code: string, message: string) {
  await tester.expect(code).toEmitDiagnostics((x) => ({
    code: "@azure-tools/typespec-azure-core/documentation-required",
    message,
    pos: x.pos.loc.pos,
  }));
}

describe("emit `documentation-required` when documentation is missing", () => {
  it("reports missing and blank documentation together without duplicate diagnostics", async () => {
    await tester
      .expect(
        `
      @doc(" ") model /*widget*/Widget {
        @doc("\\t") /*name*/name: string;
        /*missing*/missing: string;
      }
    `,
      )
      .toEmitDiagnostics(({ widget, name, missing }) => [
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
          pos: getSourceLocation(widget).pos,
          end: getSourceLocation(widget).end,
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The ModelProperty named 'missing' should have a documentation or description, use doc comment /** */ to provide it.",
          pos: getSourceLocation(missing).pos,
          end: getSourceLocation(missing).end,
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
          pos: getSourceLocation(name).pos,
          end: getSourceLocation(name).end,
        },
      ]);
  });

  it("does not newly require namespace, interface, or scalar documentation", async () => {
    await tester
      .expect(
        `
      namespace Widgets {}
      interface Empty {}
      scalar Label extends string;
    `,
      )
      .toBeValid();
  });

  it("on model", async () =>
    await checkDocRequired(
      "/*loc*/model Foo {}",
      "The Model named 'Foo' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on model property", async () =>
    await checkDocRequired(
      `@doc("Abc") model Foo {
          /*loc*/x: string;
        }`,
      "The ModelProperty named 'x' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on operation", async () =>
    await checkDocRequired(
      `/*loc*/op read(): void;`,
      "The Operation named 'read' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on property", async () =>
    await checkDocRequired(
      `@doc("op doc") op read(/*loc*/param1: string): void;`,
      "The ModelProperty named 'param1' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on enum", async () => {
    await checkDocRequired(
      "/*loc*/enum Foo {}",
      "The Enum named 'Foo' should have a documentation or description, use doc comment /** */ to provide it.",
    );
  });

  it("on enum member", async () => {
    await checkDocRequired(
      `@doc(".") enum Foo {
          /*loc*/Bar,
        }`,
      "The EnumMember named 'Bar' should have a documentation or description, use doc comment /** */ to provide it.",
    );
  });

  it("does not require documentation on version enums", async () => {
    await tester
      .expect(
        `
          @versioned(Contoso.WidgetManager.Versions)
          namespace Contoso.WidgetManager;
          
          enum Versions {
                      "2022-08-30",
          }`,
      )
      .toBeValid();
  });

  it("does not require documentation on discriminator enums", async () => {
    await tester
      .expect(
        `
          enum PetKind {
            cat,
            dog,
          }
          
          @discriminator("kind")
          @doc("Base Pet model")
          model Pet {
            kind: PetKind;
          
            @doc("Pet name")
            name: string;
          }
          
          @doc("A Cat")
          model Cat extends Pet {
            kind: PetKind.cat;
          }`,
      )
      .toBeValid();
  });

  it("does not require documentation on discriminator unions", async () => {
    await tester
      .expect(
        `
          union PetKind {
            cat: "cat",
            string,
          }
          
          @discriminator("kind")
          @doc("Base Pet model")
          model Pet {
            kind: PetKind;
          }
          
          @doc("A Merry Ol' Cat")
          model Cat extends Pet {
            kind: PetKind.cat,
          }`,
      )
      .toBeValid();
  });

  it("on union (non-discriminator)", async () => {
    await tester
      .expect(
        `
      union PetKind {      
        Cat: "Cat",
        "Dog",
        string,
      }`,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The Union named 'PetKind' should have a documentation or description, use doc comment /** */ to provide it.",
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The UnionVariant named 'Cat' should have a documentation or description, use doc comment /** */ to provide it.",
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The UnionVariant named 'Dog' should have a documentation or description, use doc comment /** */ to provide it.",
        },
      ]);
  });
});

describe("empty documentation", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    tester = createLinterRuleTester(
      await Tester.createInstance(),
      requireDocumentation,
      "@azure-tools/typespec-azure-core",
    );
  });

  const diagnostic = {
    code: "@azure-tools/typespec-azure-core/documentation-required",
    message: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
  };

  it.each([
    '@doc("Payload data.") model Payload { @doc("The nested data.") data: { @doc(" ") value: string }; }',
    '@doc("Available values.") union Values { @doc(" ") int32, string }',
    '@doc("A generic container.") model Box<T> {} @doc(" ") model Widget is Box<string>;',
    '@versioned(Widgets.Versions) namespace Widgets; @doc(" ") enum Versions { @doc(" ") v1: "2026-01-01" }',
  ])("checks explicit blanks beyond missing-doc requirements: %s", async (code) => {
    await tester
      .expect(code)
      .toEmitDiagnostics(code.includes("enum Versions") ? [diagnostic, diagnostic] : [diagnostic]);
  });

  it("checks explicit blanks on discriminator types, members, and properties", async () => {
    await tester
      .expect(
        `
        @doc(" ") enum PetKind { @doc(" ") cat }
        @doc("A pet resource.") @discriminator("kind") model Pet {
          @doc(" ") kind: PetKind;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
  });

  it.each(["Widget", "description"])(
    "reports nonblank uninformative documentation %j without a blank diagnostic",
    async (doc) => {
      await tester.expect(`@doc("${doc}") model Widget {}`).toEmitDiagnostics([
        {
          code: diagnostic.code,
          message: `Description must not match the name of the node it describes. Node name:'Widget' Description:'${doc}'`,
        },
      ]);
    },
  );

  it("reports blank and uninformative documentation through the unfiltered combined rule", async () => {
    const fullTester = createLinterRuleTester(
      await Tester.createInstance(),
      requireDocumentation,
      "@azure-tools/typespec-azure-core",
    );
    await fullTester
      .expect('@doc(" ") model Empty {} @doc("Widget") model Widget {}')
      .toEmitDiagnostics([
        diagnostic,
        {
          code: diagnostic.code,
          message:
            "Description must not match the name of the node it describes. Node name:'Widget' Description:'Widget'",
        },
      ]);
  });

  it.each([
    '@doc(" ") namespace Widgets {}',
    '@doc(" ") interface Widgets {}',
    '@doc(" ") op read(): string;',
    '@doc(" ") model Widget {}',
    '@doc(" ") scalar Label extends string;',
    '@doc(" ") enum State { @doc("Available for use.") Ready }',
    '@doc(" ") union State { @doc("Available for use.") ready: "ready", string }',
    '@doc("Available states.") union State { @doc(" ") ready: "ready", string }',
  ])("rejects explicit whitespace documentation: %s", async (code) => {
    await tester.expect(code).toEmitDiagnostics([diagnostic]);
  });

  it.each(["", " ", "\\t\\r\\n", "\u00a0"])("rejects blank content %j", async (doc) => {
    await tester.expect(`@doc("${doc}") model Widget {}`).toEmitDiagnostics([diagnostic]);
  });

  it.each([
    "namespace Widgets {} interface Empty {} scalar Label extends string;",
    '@doc("A widget resource") model Widget {}',
    '@doc("  A widget resource  ") model Widget {}',
    '@doc(".") model Widget {}',
    "/** A widget resource */ model Widget {}",
  ])("accepts exempt missing or nonblank documentation: %s", async (code) => {
    await tester.expect(code).toBeValid();
  });

  it("rejects a whitespace-only property description", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource.") model Widget {
          @doc(" ")
          name: string;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("rejects a whitespace-only parameter description", async () => {
    await tester
      .expect('@doc("Read a widget.") op read(@doc(" ") name: string): string;')
      .toEmitDiagnostics([diagnostic]);
  });

  it("accepts nonblank descriptions on models, properties, and operations", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource")
        model Widget {
          @doc("The widget name.")
          name: string;
        }
        @doc("Read a widget.")
        op read(@doc("The widget name.") name: string): Widget;
      `,
      )
      .toBeValid();
  });

  it("targets offending properties rather than their containing model", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource.") model Widget {
          @doc("") /*name*/name: string;
          @doc(" ") /*value*/value: string;
          @doc("A valid label") label: string;
        }
      `,
      )
      .toEmitDiagnostics(({ name, value }) =>
        [name, value].map((target) => {
          const location = getSourceLocation(target);
          return {
            ...diagnostic,
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          };
        }),
      );
  });

  it("targets offending enum members rather than their containing enum", async () => {
    await tester
      .expect(
        `
        @doc("Available states.") enum State {
          @doc(" ") /*ready*/Ready
        }
      `,
      )
      .toEmitDiagnostics(({ ready }) => {
        const location = getSourceLocation(ready);
        return [
          {
            ...diagnostic,
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          },
        ];
      });
  });
});

describe("uninformative documentation", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const runner = await Tester.createInstance();
    tester = createLinterRuleTester(
      runner,
      requireDocumentation,
      "@azure-tools/typespec-azure-core",
    );
  });

  function diagnostic(name: string, description: string) {
    return {
      code: "@azure-tools/typespec-azure-core/documentation-required",
      message: `Description must not match the name of the node it describes. Node name:'${name}' Description:'${description}'`,
    };
  }

  it("distinguishes source-name, missing, blank, punctuation-only, and effective-verb documentation", async () => {
    await tester
      .expect(
        `
        @route("/read") @get @doc(" READ. ") op read(): string;
        @route("/absent") @get op absent(): string;
        @route("/empty") @get @doc("") op empty(): string;
        @route("/punctuation") @get @doc(" ... ") op punctuation(): string;
        @route("/fetch") @get @doc("GET.") op fetch(): string;
      `,
      )
      .toEmitDiagnostics([
        diagnostic("read", " READ. "),
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The Operation named 'absent' should have a documentation or description, use doc comment /** */ to provide it.",
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
        },
        diagnostic("get", "GET."),
      ]);
  });

  it("checks explicit docs on declarations exempt from missing-doc requirements", async () => {
    await tester
      .expect(
        `
      @versioned(Widgets.Versions) namespace Widgets;
      @doc("Versions") enum Versions { @doc("v1") v1: "2026-01-01" }
    `,
      )
      .toEmitDiagnostics([diagnostic("Versions", "Versions"), diagnostic("v1", "v1")]);
  });

  it("checks explicit names on discriminator unions, variants, and properties", async () => {
    await tester
      .expect(
        `
        @doc("PetKind") union PetKind { @doc("cat") cat: "cat" }
        @doc("A pet resource.") @discriminator("kind") model Pet {
          @doc("kind") kind: PetKind;
        }
      `,
      )
      .toEmitDiagnostics([
        diagnostic("kind", "kind"),
        diagnostic("PetKind", "PetKind"),
        diagnostic("cat", "cat"),
      ]);
  });

  it("compares multipart documentation with its authored name over source and JSON names", async () => {
    const operation = (doc: string) => `
        @doc("Upload text for processing.")
        op upload(
          @doc("The request media type.") @header contentType: "multipart/form-data",
          @doc("The submitted parts.") @multipartBody body: {
            @encodedName("application/json", "jsonName")
            @doc("${doc}") /*part*/propName: HttpPart<string, #{name: "part_name"}>;
          }
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
    await tester.expect(operation("jsonName")).toBeValid();
    await tester.expect(operation("The text submitted for processing.")).toBeValid();
    await tester
      .expect(operation("description."))
      .toEmitDiagnostics([diagnostic("part_name", "description.")]);
  });

  it("uses the source property name for an unnamed multipart part", async () => {
    const operation = (doc: string) => `
      @doc("Upload text for processing.") op upload(
        @doc("The request media type.") @header contentType: "multipart/form-data",
        @doc("The submitted parts.") @multipartBody body: {
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

  it("unwraps an outer array of repeated HTTP parts and targets the authored property", async () => {
    await tester
      .expect(
        `
      @doc("Upload text for processing.") op upload(
        @doc("The request media type.") @header contentType: "multipart/form-data",
        @doc("The submitted parts.") @multipartBody body: {
          @encodedName("application/json", "jsonName")
          @doc("part_name") /*part*/propName: HttpPart<string, #{name: "part_name"}>[];
        }
      ): void;
    `,
      )
      .toEmitDiagnostics(({ part }) => {
        const location = getSourceLocation(part);
        return [
          {
            ...diagnostic("part_name", "part_name"),
            file: location.file.path,
            pos: location.pos,
            end: location.end,
          },
        ];
      });
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
      .expect('@doc("State") enum State { @doc("Available for use.") Ready }')
      .toEmitDiagnostics([diagnostic("State", "State")]);
  });

  it("reports union documentation matching its name", async () => {
    await tester
      .expect('@doc("State") union State { @doc("Available for use.") Ready: "ready", string }')
      .toEmitDiagnostics([diagnostic("State", "State")]);
  });

  it("compares enum members with their names rather than literal values", async () => {
    await tester
      .expect('@doc("Available states.") enum State { @doc("Ready.") Ready: "available" }')
      .toEmitDiagnostics([diagnostic("Ready", "Ready.")]);
    await tester
      .expect('@doc("Available states.") enum State { @doc("wire-value") Ready: "wire-value" }')
      .toBeValid();
  });

  it("compares named union variants with their names rather than literal values", async () => {
    await tester
      .expect('@doc("Available states.") union State { @doc("Ready.") Ready: "available", string }')
      .toEmitDiagnostics([diagnostic("Ready", "Ready.")]);
    await tester
      .expect(
        '@doc("Available states.") union State { @doc("available") Ready: "available", string }',
      )
      .toBeValid();
  });

  it("compares unnamed string variants with their values", async () => {
    await tester
      .expect('@doc("Available states.") union State { @doc("ready") "ready", string }')
      .toEmitDiagnostics([diagnostic("ready", "ready")]);
  });

  it("checks unnamed non-string variants only for placeholder text", async () => {
    await tester
      .expect('@doc("Available states.") union State { @doc("description") int32, string }')
      .toEmitDiagnostics([diagnostic("description", "description")]);
    await tester
      .expect('@doc("Available states.") union State { @doc("int32") int32, string }')
      .toBeValid();
  });

  it("checks key property documentation", async () => {
    await tester
      .expect('@doc("A widget resource.") model Widget { @key @doc("id") id: string; }')
      .toEmitDiagnostics([diagnostic("id", "id")]);
  });

  it("reports property documentation matching its name", async () => {
    await tester
      .expect('@doc("A widget resource.") model Widget { @doc("sku") sku: string; }')
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

  it("rejects operation documentation matching its source name", async () => {
    await tester
      .expect('@get @doc("read") op read(): string;')
      .toEmitDiagnostics([diagnostic("read", "read")]);
  });

  it("checks inferred operation verbs for placeholder text", async () => {
    await tester
      .expect('@doc("description") op read(): string;')
      .toEmitDiagnostics([diagnostic("get", "description")]);
    await tester
      .expect('@doc("read") op read(): string;')
      .toEmitDiagnostics([diagnostic("read", "read")]);
  });

  it("compares inferred GET operations with their effective HTTP verb", async () => {
    await tester
      .expect('@route("/widgets") @doc(" GET. ") op read(): string;')
      .toEmitDiagnostics([diagnostic("get", " GET. ")]);
    await tester
      .expect('@route("/widgets") @doc("read") op read(): string;')
      .toEmitDiagnostics([diagnostic("read", "read")]);
  });

  it("compares inferred POST operations with their effective HTTP verb", async () => {
    await tester
      .expect(
        '@route("/widgets") @doc("post") op create(@doc("The request payload.") @body body: string): string;',
      )
      .toEmitDiagnostics([diagnostic("post", "post")]);
    await tester
      .expect(
        '@route("/widgets") @doc("create") op create(@doc("The request payload.") @body body: string): string;',
      )
      .toEmitDiagnostics([diagnostic("create", "create")]);
  });

  it("preserves explicit HTTP verbs over inference", async () => {
    await tester.expect('@route("/widgets") @get @doc("post") op read(): string;').toBeValid();
    await tester.expect('@route("/widgets") @post @doc("get") op create(): string;').toBeValid();
  });

  it("compares ordinary properties with their JSON encoded names", async () => {
    await tester
      .expect(
        '@doc("A widget resource.") model Widget { @encodedName("application/json", "wire-name") @doc(" Wire-Name. ") sourceName: string; }',
      )
      .toEmitDiagnostics([diagnostic("wire-name", " Wire-Name. ")]);
  });

  it("accepts JSON-renamed property documentation matching only its source name", async () => {
    await tester
      .expect(
        '@doc("A widget resource.") model Widget { @encodedName("application/json", "wire-name") @doc("sourceName") sourceName: string; }',
      )
      .toBeValid();
  });

  it("checks JSON-renamed properties for placeholder text", async () => {
    await tester
      .expect(
        '@doc("A widget resource.") model Widget { @encodedName("application/json", "wire-name") @doc("description.") sourceName: string; }',
      )
      .toEmitDiagnostics([diagnostic("wire-name", "description.")]);
  });

  it("ignores non-JSON encoded names for ordinary properties", async () => {
    await tester
      .expect(
        '@doc("A widget resource.") model Widget { @encodedName("application/xml", "wire-name") @doc("wire-name") sourceName: string; }',
      )
      .toBeValid();
  });

  it("preserves HTTP parameter names over JSON encoded names", async () => {
    for (const kind of ["path", "query", "header"]) {
      const route = kind === "path" ? '@route("/widgets/{wireName}")' : "";
      await tester
        .expect(
          `${route} @get @doc("Read a widget.") op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("wireName.") source: string): string;`,
        )
        .toEmitDiagnostics([diagnostic("wireName", "wireName.")]);
      for (const doc of ["jsonName", "source"]) {
        await tester
          .expect(
            `${route} @get @doc("Read a widget.") op read(@${kind}("wireName") @encodedName("application/json", "jsonName") @doc("${doc}") source: string): string;`,
          )
          .toBeValid();
      }
    }
  });

  it("targets inferred operations and JSON-renamed properties", async () => {
    await tester
      .expect(
        `
        @route("/widgets") @doc("get") op /*read*/read(): string;
        @route("/widgets") @doc("post") op /*create*/create(@doc("The request payload.") @body body: string): string;
        @doc("A widget resource.") model Widget {
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

  it("keeps missing documentation separate and rejects explicit empty documentation", async () => {
    await tester.expect("model Widget {}").toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/documentation-required",
        message:
          "The Model named 'Widget' should have a documentation or description, use doc comment /** */ to provide it.",
      },
    ]);
    await tester.expect('@doc("") model Widget {}').toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/documentation-required",
        message:
          "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
      },
    ]);
    await tester.expect('@doc("  ...  ") model Widget {}').toBeValid();
    await tester
      .expect("namespace Widgets {} interface Empty {} scalar Label extends string;")
      .toBeValid();
  });

  it("accepts meaningful documentation", async () => {
    await tester
      .expect(
        `
      @doc("A widget available in the store.") model Widget {}
      @doc("Available states.") enum State { @doc("The widget is ready for use.") Ready }
      @doc("Available modes.") union Mode { @doc("The widget is ready for use.") Ready: "ready", string }
    `,
      )
      .toBeValid();
  });

  it("exempts HTTP status-code properties", async () => {
    await tester
      .expect(
        '@doc("The response metadata.") model Response { @statusCode @doc("status") status: 200; }',
      )
      .toBeValid();
    await tester
      .expect(
        '@doc("The response metadata.") model Response { @statusCode @encodedName("application/json", "wire-status") @doc("wire-status") status: 200; }',
      )
      .toBeValid();
  });

  it("targets each offending declaration without an aggregate diagnostic", async () => {
    await tester
      .expect(
        `
      @doc("Available states.") enum State { @doc("Ready") /*ready*/Ready }
      @doc("A widget resource.") model Widget { @key @doc("id") /*id*/id: string; }
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
