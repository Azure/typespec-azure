import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { ok } from "node:assert";
import { beforeEach, describe, it } from "vitest";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    requireDocumentation,
    "@azure-tools/typespec-azure-core",
  );
});

const code = "@azure-tools/typespec-azure-core/documentation-required";
const empty = {
  code,
  message: "Descriptions cannot be empty or whitespace-only. Provide a meaningful doc string.",
};

function missing(kind: string, name: string) {
  return {
    code,
    message: `The ${kind} named '${name}' should have a documentation or description, use doc comment /** */ to provide it.`,
  };
}

function uninformative(name: string, description = name) {
  return {
    code,
    message: `Description must not match the name of the node it describes. Node name:'${name}' Description:'${description}'`,
  };
}

function location(target: Parameters<typeof getSourceLocation>[0] | undefined) {
  ok(target);
  const source = getSourceLocation(target);
  ok(source);
  const { file, pos, end } = source;
  return { file: file.path, pos, end };
}

describe("missing documentation", () => {
  it.each([
    ["model /*target*/Foo {}", "Model", "Foo"],
    ['@doc("A resource.") model Foo { /*target*/x: string; }', "ModelProperty", "x"],
    ["op /*target*/read(): void;", "Operation", "read"],
    ['@doc("Reads a resource.") op read(/*target*/param: string): void;', "ModelProperty", "param"],
    ["enum /*target*/Foo {}", "Enum", "Foo"],
    ['@doc("Available values.") enum Foo { /*target*/Bar }', "EnumMember", "Bar"],
  ])("requires documentation in %s", async (source, kind, name) => {
    await tester
      .expect(source)
      .toEmitDiagnostics(({ target }) => [{ ...missing(kind, name), ...location(target) }]);
  });

  it("requires documentation on unions and named or string variants", async () => {
    await tester
      .expect('union PetKind { Cat: "Cat", "Dog", string }')
      .toEmitDiagnostics([
        missing("Union", "PetKind"),
        missing("UnionVariant", "Cat"),
        missing("UnionVariant", "Dog"),
      ]);
  });

  it("does not newly require namespace, interface, or scalar documentation", async () => {
    await tester
      .expect("namespace Widgets {} interface Empty {} scalar Label extends string;")
      .toBeValid();
  });

  it("exempts version enums and their members", async () => {
    await tester
      .expect('@versioned(Widgets.Versions) namespace Widgets; enum Versions { v1: "2026-01-01" }')
      .toBeValid();
  });

  it.each(["enum PetKind { cat }", 'union PetKind { cat: "cat", string }'])(
    "exempts discriminator types and properties: %s",
    async (type) => {
      await tester
        .expect(
          `
        ${type}
        @discriminator("kind") @doc("A pet resource.") model Pet { kind: PetKind; }
        @doc("A cat resource.") model Cat extends Pet { kind: PetKind.cat; }
      `,
        )
        .toBeValid();
    },
  );
});

describe("blank and meaningful documentation", () => {
  it("distinguishes missing, blank, punctuation, source names, and HTTP verbs without duplicates", async () => {
    await tester
      .expect(
        `
        @route("/absent") @get op absent(): string;
        @route("/blank") @get @doc(" ") op blank(): string;
        @route("/punctuation") @get @doc(" ... ") op punctuation(): string;
        @route("/read") @get @doc(" READ. ") op read(): string;
        @route("/fetch") @get @doc("GET.") op fetch(): string;
      `,
      )
      .toEmitDiagnostics([
        missing("Operation", "absent"),
        empty,
        uninformative("read", " READ. "),
        uninformative("get", "GET."),
      ]);
  });

  it("rejects blank docs on namespaces, interfaces, and scalars without requiring absent docs", async () => {
    await tester
      .expect(
        '@doc(" ") namespace Widgets {} @doc("") interface Empty {} @doc("\\t\\r\\n") scalar Label extends string;',
      )
      .toEmitDiagnostics([empty, empty, empty]);
  });

  it("checks inline properties, unnamed variants, and instantiated models", async () => {
    await tester
      .expect(
        `
        @doc("A generic container.") model Box<T> {}
        @doc(" ") model Widget is Box<string>;
        @doc("Payload data.") model Payload {
          @doc("The nested data.") data: { @doc("\u00a0") value: string };
        }
        @doc("Available values.") union Values { @doc(" ") int32, string }
      `,
      )
      .toEmitDiagnostics([empty, empty, empty]);
  });

  it("checks explicit blanks on version and discriminator declarations despite missing-doc exemptions", async () => {
    await tester
      .expect(
        `
        @versioned(Widgets.Versions) namespace Widgets;
        @doc(" ") enum Versions { @doc(" ") v1: "2026-01-01" }
        @doc(" ") enum PetKind { @doc(" ") cat }
        @doc("A pet resource.") @discriminator("kind") model Pet { @doc(" ") kind: PetKind; }
      `,
      )
      .toEmitDiagnostics([empty, empty, empty, empty, empty]);
  });

  it("targets each blank property and enum member rather than its container", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource.") model Widget {
          @doc("") /*name*/name: string;
          @doc(" ") /*value*/value: string;
          @doc("A valid label.") label: string;
        }
        @doc("Available states.") enum State { @doc(" ") /*ready*/Ready }
      `,
      )
      .toEmitDiagnostics(({ name, value, ready }) =>
        [name, value, ready].map((target) => ({ ...empty, ...location(target) })),
      );
  });

  it("accepts meaningful doc comments, surrounding whitespace, and punctuation-only content", async () => {
    await tester
      .expect(
        `
        /** A configurable device available in the store. */
        model Widget {
          /** The display name shown to users. */
          name: string;
        }
        @doc("  A display label.  ") scalar Label extends string;
        @doc(".") model Empty {}
      `,
      )
      .toBeValid();
  });
});

describe("uninformative documentation", () => {
  it.each([
    ["/** wIdGeT. */ model Widget {}", "Widget", "wIdGeT."],
    ['@doc("Label.") scalar Label extends string;', "Label", "Label."],
    ['@doc("State") enum State { @doc("Available for use.") Ready }', "State", "State"],
    [
      '@doc("State") union State { @doc("Available for use.") Ready: "ready", string }',
      "State",
      "State",
    ],
    ['@doc("description.") model Widget {}', "Widget", "description."],
  ])("rejects repeated names or placeholder text: %s", async (source, name, doc) => {
    await tester.expect(source).toEmitDiagnostics([uninformative(name, doc)]);
  });

  it("compares enum members with their authored names rather than serialized values", async () => {
    await tester
      .expect('@doc("Available states.") enum State { @doc("Ready.") Ready: "available" }')
      .toEmitDiagnostics([uninformative("Ready", "Ready.")]);
    await tester
      .expect('@doc("Available states.") enum State { @doc("available") Ready: "available" }')
      .toBeValid();
  });

  it("checks named and unnamed string variants, with placeholder-only checks on other unnamed variants", async () => {
    await tester
      .expect(
        `
        @doc("Available states.") union State {
          @doc("Ready") Ready: "available",
          @doc("ready") "ready",
          @doc("description") int32,
          @doc("string") string
        }
      `,
      )
      .toEmitDiagnostics([
        uninformative("Ready"),
        uninformative("ready"),
        uninformative("description"),
      ]);
    await tester
      .expect('@doc("Available states.") union State { @doc("available") Ready: "available" }')
      .toBeValid();
  });

  it("checks authored property names even when serialization renames them", async () => {
    await tester
      .expect(
        `
        @doc("A widget resource.") model Widget {
          @encodedName("application/json", "wire-name")
          @doc("sourceName") /*source*/sourceName: string;
        }
      `,
      )
      .toEmitDiagnostics(({ source }) => [{ ...uninformative("sourceName"), ...location(source) }]);
  });

  it("checks explicit names on version enums and discriminator unions and properties", async () => {
    await tester
      .expect(
        `
        @versioned(Widgets.Versions) namespace Widgets;
        @doc("Versions") enum Versions { @doc("v1") v1: "2026-01-01" }
        @doc("PetKind") union PetKind { @doc("cat") cat: "cat" }
        @doc("A pet resource.") @discriminator("kind") model Pet { @doc("kind") kind: PetKind; }
      `,
      )
      .toEmitDiagnostics([
        uninformative("kind"),
        uninformative("PetKind"),
        uninformative("cat"),
        uninformative("Versions"),
        uninformative("v1"),
      ]);
  });

  it("targets both an offending model and its key property", async () => {
    await tester
      .expect("/** Widget */ model /*widget*/Widget { @key /** Name */ /*name*/name: string; }")
      .toEmitDiagnostics(({ widget, name }) => [
        { ...uninformative("Widget"), ...location(widget) },
        { ...uninformative("name", "Name"), ...location(name) },
      ]);
  });
});

describe("HTTP documentation names", () => {
  it("checks inferred GET and POST verbs while preserving explicitly declared verbs", async () => {
    await tester
      .expect(
        `
        @route("/read") @doc("get") op /*read*/read(): string;
        @route("/create") @doc("post") op /*create*/create(@doc("The payload.") @body body: string): string;
        @route("/explicit") @get @doc("post") op fetch(): string;
      `,
      )
      .toEmitDiagnostics(({ read, create }) => [
        { ...uninformative("get"), ...location(read) },
        { ...uninformative("post"), ...location(create) },
      ]);
  });

  it("compares path, query, and header parameters with their HTTP names", async () => {
    for (const kind of ["path", "query", "header"]) {
      const route = kind === "path" ? '@route("/widgets/{wireName}")' : "";
      const operation = (doc: string) =>
        `${route} @get @doc("Reads a widget.") op read(@${kind}("wireName") @doc("${doc}") source: string): string;`;
      await tester
        .expect(operation("wireName."))
        .toEmitDiagnostics([uninformative("wireName", "wireName.")]);
      await tester.expect(operation("source")).toBeValid();
    }
  });

  it("checks authored multipart names and placeholder text at the property", async () => {
    const operation = (doc: string) => `
      @doc("Uploads text for processing.") op upload(
        @doc("The request media type.") @header contentType: "multipart/form-data",
        @doc("The submitted parts.") @multipartBody body: {
          @doc("${doc}") /*part*/propName: HttpPart<string, #{name: "part_name"}>;
        }
      ): void;
    `;
    await tester
      .expect(operation(" Part_Name. "))
      .toEmitDiagnostics(({ part }) => [
        { ...uninformative("part_name", " Part_Name. "), ...location(part) },
      ]);
    await tester.expect(operation("propName")).toBeValid();
    await tester
      .expect(operation("description."))
      .toEmitDiagnostics([uninformative("part_name", "description.")]);
  });

  it("uses source names for unnamed parts and authored names for repeated parts", async () => {
    await tester
      .expect(
        `
        @doc("Uploads text for processing.") op upload(
          @doc("The request media type.") @header contentType: "multipart/form-data",
          @doc("The submitted parts.") @multipartBody body: {
            @doc("text") /*text*/text: HttpPart<string>;
            @doc("part_name") /*repeated*/repeated: HttpPart<string, #{name: "part_name"}>[];
          }
        ): void;
      `,
      )
      .toEmitDiagnostics(({ text, repeated }) => [
        { ...uninformative("text"), ...location(text) },
        { ...uninformative("part_name"), ...location(repeated) },
      ]);
  });

  it("exempts status-code names but still rejects explicitly blank documentation", async () => {
    await tester
      .expect(
        `
        @doc("Response metadata.") model Response {
          @statusCode @doc("status") status: 200;
        }
      `,
      )
      .toBeValid();
    await tester
      .expect('@doc("Response metadata.") model Response { @statusCode @doc(" ") status: 200; }')
      .toEmitDiagnostics([empty]);
  });
});
