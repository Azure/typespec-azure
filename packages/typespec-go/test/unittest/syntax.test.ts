// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import type { EmitContext } from "@typespec/compiler";
import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { execFileSync } from "child_process";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import * as syntax from "../../src/codegen/core/syntax.js";
import * as go from "../../src/codemodel/index.js";
import type { GoEmitterOptions } from "../../src/lib.js";
import { Adapter } from "../../src/tcgcadapter/adapter.js";
import { emitGoFor } from "./scenario-runner.js";

function gofmt(source: string): string {
  return execFileSync("gofmt", ["-s"], { input: source, encoding: "utf8" });
}

function assertAllGoFilesFormat(files: Map<string, string>): void {
  expect(files.size).toBeGreaterThan(0);
  for (const [name, content] of files) {
    if (!name.endsWith(".go")) {
      continue;
    }
    expect(() => gofmt(content), `gofmt failed for ${name}`).not.toThrow();
  }
}

describe("Go syntax boundary (syntax.ts)", () => {
  describe("stringLiteral", () => {
    it.each([
      ["", '""'],
      ["hello", '"hello"'],
      ["single'quote", `"single'quote"`],
      ["back`tick", '"back`tick"'],
      ['a"b\\c', '"a\\"b\\\\c"'],
      ["\x07\b\f\n\r\t\v", '"\\a\\b\\f\\n\\r\\t\\v"'],
      ["\x00\x1b\x1f\x7f", '"\\x00\\x1b\\x1f\\x7f"'],
      ["\u0080\u0085\u009f\u2028\u2029", '"\\u0080\\u0085\\u009f\\u2028\\u2029"'],
      ["こんにちは 🚀 𐐷", '"こんにちは 🚀 𐐷"'],
      ['"alreadyQuoted"', '"\\"alreadyQuoted\\""'],
      ['"quoted\nnewline"', '"\\"quoted\\nnewline\\""'],
    ])("formats %j as %s", (input, expected) => {
      const actual = syntax.stringLiteral(input);
      expect(actual).toBe(expected);
      expect(() => gofmt(`package p\nconst c = ${actual}\n`)).not.toThrow();
    });

    it("replaces lone UTF-16 surrogates so Go never sees invalid Unicode code point escapes", () => {
      for (const input of ["\uD800", "\uDFFF", "prefix\uD800suffix", "\uDC00\uD800"]) {
        const lit = syntax.stringLiteral(input);
        expect(lit).toContain("\\ufffd");
        expect(() => gofmt(`package p\nconst c = ${lit}\n`)).not.toThrow();
      }
    });
  });

  describe("rawOrStringLiteral", () => {
    it("emits raw backtick string when safe", () => {
      expect(syntax.rawOrStringLiteral('a"b\\c')).toBe('`a"b\\c`');
      expect(syntax.rawOrStringLiteral("^/items/(?P<id>[^/]+)$")).toBe("`^/items/(?P<id>[^/]+)$`");
    });

    it("falls back to interpreted string literal on backticks, CR/LF/tabs, controls, or lone surrogates", () => {
      expect(syntax.rawOrStringLiteral("has`tick")).toBe('"has`tick"');
      expect(syntax.rawOrStringLiteral("has\rcr")).toBe('"has\\rcr"');
      expect(syntax.rawOrStringLiteral("has\nlf")).toBe('"has\\nlf"');
      expect(syntax.rawOrStringLiteral("has\ttab")).toBe('"has\\ttab"');
      expect(syntax.rawOrStringLiteral("has\x00nul")).toBe('"has\\x00nul"');
      expect(syntax.rawOrStringLiteral("has\x7fdel")).toBe('"has\\x7fdel"');
      expect(syntax.rawOrStringLiteral("has\u0085nel")).toBe('"has\\u0085nel"');
      expect(syntax.rawOrStringLiteral("has\u2028ls")).toBe('"has\\u2028ls"');
      expect(syntax.rawOrStringLiteral("has\uD800surrogate")).toBe('"has\\ufffdsurrogate"');
    });
  });

  describe("structTag and structTagEntries", () => {
    it("renders clean raw struct tags and escapes quotes, backslashes, and controls", () => {
      expect(syntax.structTag("xml", "item,attr")).toBe('`xml:"item,attr"`');
      expect(syntax.structTag("xml", 'my"item\\path,attr')).toBe('`xml:"my\\"item\\\\path,attr"`');
      expect(syntax.structTag("json", "line1\nline2\r\t")).toBe('`json:"line1\\nline2\\r\\t"`');
    });

    it("falls back to interpreted Go string literal when struct tag contains backticks", () => {
      const tag = syntax.structTag("xml", "my`item,attr");
      expect(tag).toBe('"xml:\\"my`item,attr\\""');
      expect(() => gofmt(`package p\ntype T struct { F string ${tag} }\n`)).not.toThrow();
    });

    it("supports multiple struct tag entries", () => {
      expect(
        syntax.structTagEntries([
          ["json", 'a"b'],
          ["xml", 'c"d,attr'],
        ]),
      ).toBe('`json:"a\\"b" xml:"c\\"d,attr"`');
      expect(
        syntax.structTagEntries([
          ["json", "a`b"],
          ["xml", 'c"d'],
        ]),
      ).toBe('"json:\\"a`b\\" xml:\\"c\\\\\\"d\\""');
    });

    it("rejects invalid Go struct tag keys", () => {
      for (const badKey of ["", "bad key", "bad:key", 'bad"key', "bad\tkey", "bad\x7fkey"]) {
        expect(() => syntax.structTag(badKey, "v")).toThrow();
      }
    });

    it("round-trips reflect.StructTag.Lookup, xml.Marshal, and json.Marshal in Go toolchain", () => {
      const xmlRootLit = syntax.stringLiteral('Root"Quote\\Slash`Tick');
      const attrTag = syntax.structTag("xml", 'attr`tick"quote,attr');
      const elemTag = syntax.structTag("xml", 'elem"quote\\slash');
      const jsonKeyLit = syntax.stringLiteral('json"key\\slash\nline`tick');

      const tempDir = mkdtempSync(join(tmpdir(), "tsp-go-syntax-"));
      try {
        writeFileSync(
          join(tempDir, "go.mod"),
          "module example.com/syntaxtest\n\ngo 1.23\n",
          "utf8",
        );
        writeFileSync(
          join(tempDir, "syntax_test.go"),
          `package syntaxtest

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"reflect"
	"testing"
)

type Sample struct {
	Attr string ${attrTag}
	Elem string ${elemTag}
}

func (s Sample) MarshalXML(enc *xml.Encoder, start xml.StartElement) error {
	start.Name.Local = "SafeRoot"
	type alias Sample
	return enc.EncodeElement(alias(s), start)
}

func TestStructTagAndLiterals(t *testing.T) {
	if got := ${xmlRootLit}; got != "Root\\"Quote\\\\Slash\x60Tick" {
		t.Fatalf("unexpected xmlRootLit: %q", got)
	}
	typ := reflect.TypeOf(Sample{})
	attrField, _ := typ.FieldByName("Attr")
	if got, ok := attrField.Tag.Lookup("xml"); !ok || got != "attr\x60tick\\"quote,attr" {
		t.Fatalf("unexpected Attr xml tag: %q (ok=%v)", got, ok)
	}
	elemField, _ := typ.FieldByName("Elem")
	if got, ok := elemField.Tag.Lookup("xml"); !ok || got != "elem\\"quote\\\\slash" {
		t.Fatalf("unexpected Elem xml tag: %q (ok=%v)", got, ok)
	}
	payload, err := json.Marshal(map[string]string{${jsonKeyLit}: "ok"})
	if err != nil {
		t.Fatal(err)
	}
	var decoded map[string]string
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded[${jsonKeyLit}] != "ok" {
		t.Fatalf("json round-trip mismatch: %#v", decoded)
	}
	if !bytes.Contains(payload, []byte("json")) {
		t.Fatalf("unexpected json payload: %s", string(payload))
	}
}
`,
          "utf8",
        );
        execFileSync("go", ["test", "./..."], { cwd: tempDir, encoding: "utf8" });
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe("sanitizeSingleLineComment", () => {
    it("replaces line terminators so single-line comments never inject Go statements", () => {
      expect(syntax.sanitizeSingleLineComment("2024-01-01\r\nfunc injected() {}\rnext\nline")).toBe(
        "2024-01-01 func injected() {} next line",
      );
      expect(syntax.sanitizeSingleLineComment("a\u2028b\u2029c")).toBe("a b c");
    });
  });
});

describe("CodeModel structured serialization (replaces serializedName)", () => {
  const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
    libraries: ["@typespec/http", "@typespec/xml", "@azure-tools/typespec-client-generator-core"],
  })
    .import("@typespec/http", "@typespec/xml", "@azure-tools/typespec-client-generator-core")
    .using("Http", "TypeSpec.Xml", "Azure.ClientGenerator.Core");

  it("models JSON, XML, and Multipart field metadata without flat serializedName", async () => {
    const { program } = await Tester.compile(`
      @service namespace DualService;

      @Xml.name("XmlPayload")
      model DualPayload {
        @encodedName("application/json", "json_prop")
        @Xml.name("xml_attr")
        @Xml.attribute
        prop: string;
      }

      @route("/json") @post op sendJson(@header contentType: "application/json", @body body: DualPayload): DualPayload;
      @route("/xml") @post op sendXml(@header contentType: "application/xml", @body payload: DualPayload): void;
      @route("/spread") @post op sendSpread(@encodedName("application/json", "wire-field") fieldParam: string): void;
    `);

    const context = {
      program,
      emitterOutputDir: resolveVirtualPath("tsp-output"),
      options: { module: "testmodule" },
    } as unknown as EmitContext<GoEmitterOptions>;

    const adapter = await Adapter.create(context);
    const codeModel = adapter.tcgcToGoCodeModel();
    const root = codeModel.root as go.Module;

    const dualModel = root.models.find(
      (m): m is go.Model => m.kind === "model" && m.name === "DualPayload",
    )!;
    expect(dualModel).toBeDefined();
    const propField = dualModel.fields.find((f) => f.name === "Prop")!;
    expect(propField).toBeDefined();
    expect("serializedName" in propField).toBe(false);
    expect("xmlKind" in propField).toBe(false);
    expect(propField.serialization.json).toEqual({ name: "json_prop" });
    expect(propField.serialization.xml).toEqual({ name: "xml_attr", kind: "attribute" });

    const spreadClient = root.clients[0]!;
    const spreadMethod = spreadClient.methods.find((m) => m.name === "SendSpread")!;
    const partialParam = spreadMethod.parameters.find(
      (p): p is go.PartialBodyParameter => p.kind === "partialBodyParam",
    )!;
    expect(partialParam).toBeDefined();
    expect("serializedName" in partialParam).toBe(false);
    expect(partialParam.wireName).toBe("wire-field");
  });

  it("emits distinct JSON and XML wire names from dual-annotated properties", async () => {
    const files = await emitGoFor(`
      using TypeSpec.Xml;
      @service namespace DualEmit;

      model SharedDualProps {
        @encodedName("application/json", "json\\"Key")
        @Xml.name("xml\`Attr")
        @Xml.attribute
        prop: string;
      }

      model JsonDualItem {
        ...SharedDualProps;
      }

      @Xml.name("XmlRoot\\"Quote")
      model XmlDualItem {
        ...SharedDualProps;
      }

      @route("/json") @post op postJson(@header contentType: "application/json", @body body: JsonDualItem): JsonDualItem;
      @route("/xml") @post op postXml(@header contentType: "application/xml", @body body: XmlDualItem): {
        @header contentType: "application/xml";
        @body body: XmlDualItem;
      };
    `);

    assertAllGoFilesFormat(files);
    const models = files.get("zz_models.go")!;
    const serde = files.get("zz_models_serde.go")!;
    expect(models).toContain('"xml:\\"xml`Attr,attr\\""');
    expect(serde).toContain('start.Name.Local = "XmlRoot\\"Quote"');
    expect(serde).toContain('populate(objectMap, "json\\"Key", j.Prop)');
    expect(serde).toContain('case "json\\"Key":');
  });
});

describe("End-to-end Go syntax escaping across annotations and types", () => {
  it("escapes @Xml.name across root models, attributes, elements, wrapped/unwrapped slices, and nested models (#5936)", async () => {
    const files = await emitGoFor(
      `
      using TypeSpec.Xml;
      @service namespace XmlEscaping;

      @Xml.name("Nested\\"Child\\\\Path")
      model NestedItem {
        @Xml.name("nested\`attr\\"q")
        @Xml.attribute
        attr: string;
      }

      @Xml.name("Root\\"Quote\\\\Slash\\nLine\`Tick")
      model XmlContainer {
        @Xml.name("attr\\"quote\`tick")
        @Xml.attribute
        id: string;

        @Xml.name("elem\\"quote\\\\slash")
        title: string;

        @Xml.name("override\\"child\`name")
        child: NestedItem;

        @Xml.name("wrapped\\"items\`tick")
        wrappedItems: string[];

        @Xml.unwrapped
        @Xml.name("unwrapped\\"item")
        unwrappedItems: string[];
      }

      @route("/xml")
      @post
      op send(
        @header contentType: "application/xml",
        @body body: XmlContainer,
      ): {
        @header contentType: "application/xml";
        @body body: XmlContainer;
      };
    `,
      { "generate-fakes": true },
    );

    assertAllGoFilesFormat(files);
    const serde = files.get("zz_models_serde.go")!;
    expect(serde).toContain('start.Name.Local = "Root\\"Quote\\\\Slash\\nLine`Tick"');
    expect(serde).toContain('"xml:\\"override\\\\\\"child`name\\""');
    const models = files.get("zz_models.go")!;
    expect(models).toContain('"xml:\\"attr\\\\\\"quote`tick,attr\\""');
    expect(models).toContain('`xml:"elem\\"quote\\\\slash"`');
    expect(models).toContain('`xml:"unwrapped\\"item"`');
  });

  it("escapes JSON wire names, pre-quoted string literals, enums, unions, and discriminators", async () => {
    const files = await emitGoFor(
      `
      @service namespace JsonEscaping;

      union SpecialEnum {
        string,
        QuoteVal: "val\\"quote\\\\slash\\nline\`tick",
        LeadingQuote: "\\"alreadyQuoted\\"",
      }

      @discriminator("kind\\"quote")
      model BasePolymorphic {
        \`kind"quote\`: string;
      }

      model SubPolymorphic extends BasePolymorphic {
        \`kind"quote\`: "sub\\"type\\n1";
        @encodedName("application/json", "prop\\"quote\\\\slash\\nline\`tick")
        prop: string;
        literalWithLeadingQuote: "\\"hello\\"\\nworld";
      }

      model VariantA {
        @encodedName("application/json", "probe\\"a")
        probeA: string;
      }

      model VariantB {
        @encodedName("application/json", "probe\`b")
        probeB: int32;
      }

      union MixedUnion {
        VariantA,
        VariantB,
      }

      @discriminated(#{ discriminatorPropertyName: "disc\\"prop", envelopePropertyName: "env\\"prop" })
      union DiscUnion {
        "cat\\"1": VariantA,
      }

      @route("/poly") @post op sendPoly(@body body: BasePolymorphic): BasePolymorphic;
      @route("/union") @post op sendUnion(@body body: MixedUnion): DiscUnion;
      @route("/enum") @post op sendEnum(@header contentType: "application/json", @body body: SpecialEnum): {
        @header contentType: "application/json";
        @body body: SpecialEnum;
      };
    `,
      { "generate-fakes": true },
    );

    assertAllGoFilesFormat(files);
    const constants = files.get("zz_constants.go")!;
    expect(constants).toContain('"\\"alreadyQuoted\\""');
    expect(constants).toContain('"val\\"quote\\\\slash\\nline`tick"');

    const serde = files.get("zz_models_serde.go")!;
    expect(serde).toContain('populate(objectMap, "kind\\"quote",');
    expect(serde).toContain('"\\"hello\\"\\nworld"');
  });

  it("escapes HTTP parameters, spread bodies, multipart content types, SSE events, fake routes, and comments", async () => {
    const files = await emitGoFor(
      `
      using TypeSpec.SSE;
      @service namespace HttpEscaping;

      /**
       * Summary with CR\rLF\r\nand guillemet » symbol.
       *
       * Description line 1.\rLine 2 with » symbol.
       */
      model MultipartBody {
        @encodedName("multipart/form-data", "part\\"name\`tick")
        textPart: HttpPart<string>;

        jsonPart: HttpPart<{
          @header contentType: "application/json; profile=\\"v1\\"";
          @body body: { name: string };
        }>;
      }

      model EventPayload {
        @TypeSpec.Events.data
        @TypeSpec.Events.contentType("application/json")
        @encodedName("application/json", "data\\"field")
        data: { ok: boolean };
      }

      @TypeSpec.Events.events
      union SpecialEvents {
        "evt\\"name\\n1": EventPayload,
      }

      @route("/items.{ext}/$literal/{p-1.2}")
      @post
      op upload(
        @path ext: string,
        @path("p-1.2") p: string,
        @query("q\\"param") q?: string,
        @header("x-custom-\\"hdr") hdr?: string,
        @header contentType: "multipart/form-data",
        @multipartBody body: MultipartBody,
      ): {
        @header("x-resp-\\"hdr") respHdr: string;
      };

      @route("/spread-json")
      @post
      op spreadJson(
        @encodedName("application/json", "wire-name\\"quote\`tick")
        fieldA: string,
      ): void;

      @route("/spread-xml")
      @post
      op spreadXml(
        @header contentType: "application/xml",
        @Xml.name("xml-wire\\"quote\`tick")
        fieldA: string,
      ): void;

      @route("/sse")
      @get
      op streamEvents(): SSEStream<SpecialEvents>;
    `,
      { "generate-fakes": true },
    );

    assertAllGoFilesFormat(files);

    const models = files.get("zz_models.go")!;
    expect(models).toContain("»");
    expect(models).not.toContain("\r");

    const client = files.get("zz_httpescaping_client.go")!;
    expect(client).toContain('FieldA string "json:\\"wire-name\\\\\\"quote`tick\\""');
    expect(client).toContain('FieldA string "xml:\\"xml-wire\\\\\\"quote`tick\\""');

    const fakeServer = files.get("fake/zz_httpescaping_server.go")!;
    expect(fakeServer).toContain('FieldA string "json:\\"wire-name\\\\\\"quote`tick\\""');
    expect(fakeServer).toContain('FieldA string "xml:\\"xml-wire\\\\\\"quote`tick\\""');
    expect(fakeServer).toContain("(?P<p_1_2>[a-zA-Z0-9._~%!$&'()*+,;=:@-]+)");
    expect(fakeServer).toContain('regex.SubexpIndex("p_1_2")');
    expect(fakeServer).toContain("\\$literal");
  });

  it("handles XML @error models and isolates serde format across compilations", async () => {
    const xmlFiles = await emitGoFor(
      `
      using TypeSpec.Xml;

      @service(#{ title: "XmlErrorService" })
      namespace XmlErrorService;

      @Xml.name("detail\\"node")
      model SharedItem {
        @Xml.name("detail\\"msg")
        message: string;
      }

      @Xml.name("error\\"root")
      model XmlErrorBody {
        @Xml.name("err\\"code")
        code: string;
        detail: SharedItem;
      }

      @error
      model XmlError {
        @statusCode _: 400;
        @header("content-type") contentType: "application/xml";
        @body body: XmlErrorBody;
      }

      @route("/fail")
      @get
      op fail(): {
        @header contentType: "application/xml";
        @body body: string;
      } | XmlError;
    `,
    );

    assertAllGoFilesFormat(xmlFiles);
    expect(xmlFiles.get("zz_models.go")).toContain('Code *string `xml:"err\\"code"`');
    expect(xmlFiles.get("zz_models.go")).toContain('Message *string `xml:"detail\\"msg"`');
    expect(xmlFiles.get("zz_models_serde.go")).toContain('start.Name.Local = "error\\"root"');
    expect(xmlFiles.get("zz_models_serde.go")).toContain('start.Name.Local = "detail\\"node"');

    // Compile a second service with the same model name ("SharedItem") serialized as JSON
    // to verify serDeFormatCache does not leak XML format across compilations.
    const jsonFiles = await emitGoFor(
      `
      @service(#{ title: "JsonService" })
      namespace JsonService;

      model SharedItem {
        @encodedName("application/json", "json\\"msg")
        message: string;
      }

      @route("/ok")
      @get
      op ok(): SharedItem;
    `,
    );

    assertAllGoFilesFormat(jsonFiles);
    expect(jsonFiles.get("zz_models_serde.go")).toContain(
      'populate(objectMap, "json\\"msg", s.Message)',
    );
  });
});
