import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noOperationGroupNameConflictRule as rule } from "../../src/rules/no-operation-group-name-conflict.rule.js";
import { SimpleBaseTester } from "../tester.js";

const Tester = SimpleBaseTester.import(
  "@typespec/http",
  "@typespec/rest",
  "@typespec/versioning",
  "@azure-tools/typespec-client-generator-core",
);
let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    rule,
    "@azure-tools/typespec-client-generator-core",
  );
});

const header = `using TypeSpec.Http; using Azure.ClientGenerator.Core; @service namespace Example;`;
const diagnostic = (name = "Widget") => ({
  code: "@azure-tools/typespec-client-generator-core/no-operation-group-name-conflict",
  message: `Operation group '${name}' conflicts with type '${name}'. Rename the group, for example by using a plural name.`,
});

it.each(["interface", "namespace"] as const)(
  "targets the authored %s declaration",
  async (kind) => {
    const group = kind === "interface" ? t.interface("Group") : t.namespace("Group");
    await tester
      .expect(
        t.code`${header}
          model Widget { id: string; }
          @clientName("Widget") ${kind} ${group} {
            @get op read(): Widget;
          }`,
      )
      .toEmitDiagnostics(({ Group }) => ({
        ...diagnostic(),
        pos: getSourceLocation(Group).pos,
        end: getSourceLocation(Group).end,
      }));
  },
);

it.each([
  "model Widget { id: string; }",
  "scalar Widget extends string;",
  "enum Widget { one, two }",
  'union Widget { one: "one", two: "two" }',
])("compares groups with the declared type %s", async (declaration) => {
  await tester
    .expect(
      `${header}
        ${declaration}
        @clientName("Widget") interface Group { @get op read(): string; }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("accepts distinct group and type names", async () => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      interface Widgets { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it.each(["Widget_Admin", "widget"])("preserves the full case-sensitive name %s", async (name) => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      @clientName("${name}") interface Group { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it("uses common type names as well as group names", async () => {
  await tester
    .expect(
      `${header}
        @clientName("Item") model Widget { id: string; }
        @clientName("Item") interface Group { @get op read(): Widget; }`,
    )
    .toEmitDiagnostics(diagnostic("Item"));
  await tester
    .expect(
      `${header}
      @clientName("Item") model Widget { id: string; }
      @clientName("Widget") interface Group { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it.each(["csharp", "java", "python", "javascript"])(
  "checks names in the explicitly configured %s scope",
  async (scope) => {
    await tester
      .expect(
        `${header}
          @clientName("Item", "${scope}") model Widget { id: string; }
          @clientName("Item", "${scope}") interface Group { @get op read(): Widget; }`,
      )
      .toEmitDiagnostics(diagnostic("Item"));
  },
);

it("does not combine overrides from different languages", async () => {
  await tester
    .expect(
      `${header}
      @clientName("Item", "csharp") model Widget { id: string; }
      @clientName("Item", "java") interface Group { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it("retains common fallback names in language scopes", async () => {
  await tester
    .expect(
      `${header}
        @clientName("Item") model Widget { id: string; }
        @clientName("Item", "csharp") interface Group { @get op read(): Widget; }`,
    )
    .toEmitDiagnostics(diagnostic("Item"));
});

it("honors negated name scopes", async () => {
  await tester
    .expect(
      `${header}
        @clientName("Item", "!csharp") model Widget { id: string; }
        @clientName("Item", "java") interface Group { @get op read(): Widget; }`,
    )
    .toEmitDiagnostics(diagnostic("Item"));
  await tester
    .expect(
      `${header}
      @clientName("Item", "!csharp") model Widget { id: string; }
      @clientName("Item", "csharp") interface Group { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it("reports a group once across types, operations and naming scopes", async () => {
  await tester
    .expect(
      `${header}
        model Widget { id: string; }
        @clientName("Item", "csharp") model Other { id: string; }
        @clientName("Widget") @clientName("Item", "csharp")
        interface Group {
          @get @route("/one") op one(): Widget;
          @get @route("/two") op two(): Other;
        }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("reports each conflicting group separately", async () => {
  await tester
    .expect(
      `${header}
        model Widget { id: string; }
        model Gadget { id: string; }
        @clientName("Widget") interface First { @get @route("/one") op read(): Widget; }
        @clientName("Gadget") interface Second { @get @route("/two") op read(): Gadget; }`,
    )
    .toEmitDiagnostics([diagnostic(), diagnostic("Gadget")]);
});

it("uses friendly names without classifying SDK types", async () => {
  await tester
    .expect(
      `${header}
        @friendlyName("Item") model Widget { id: string; }
        @clientName("Item") interface Group { @get op read(): Widget; }`,
    )
    .toEmitDiagnostics(diagnostic("Item"));
});

it("includes unused type declarations without inspecting operation reachability", async () => {
  await tester
    .expect(
      `${header}
        model Widget { child?: Widget; }
        @clientName("Widget") interface Group { @get op read(): string; }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("checks nested namespaces independently", async () => {
  await tester
    .expect(
      `${header}
        namespace Nested {
          model Widget { id: string; }
          @clientName("Widget") interface Group { @get op read(): Widget; }
        }`,
    )
    .toEmitDiagnostics(diagnostic());
});

it("does not flatten types or groups across namespaces", async () => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      namespace Operations {
        @clientName("Widget") interface Group { @get op read(): Example.Widget; }
      }`,
    )
    .toBeValid();
  await tester
    .expect(
      `${header}
      namespace Types { model Widget { id: string; } }
      @clientName("Widget") interface Group { @get op read(): Types.Widget; }`,
    )
    .toBeValid();
});

it("does not follow model properties, bases or polymorphic alternatives", async () => {
  await tester
    .expect(
      `${header}
      namespace Types {
        @discriminator("kind") model Base { kind: string; }
        model Widget extends Base { kind: "widget"; child?: Widget; }
        model Container { child: Widget; }
      }
      @clientName("Widget") interface Group {
        @get @route("/base") op read(): Types.Base;
        @get @route("/container") op readContainer(): Types.Container;
      }`,
    )
    .toBeValid();
});

it("does not construct groups from root operation names or relocation metadata", async () => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      @get @route("/root") op Widget_Read(): Widget;
      @clientLocation("Widget") @get @route("/moved") op read(): Widget;`,
    )
    .toBeValid();
});

it("does not interpret explicit client names as declaration names", async () => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      @client({name: "Widget"}) interface Group { @get op read(): Widget; }`,
    )
    .toBeValid();
});

it("ignores empty interfaces and namespace-only grouping containers", async () => {
  await tester
    .expect(
      `${header}
      model Widget { id: string; }
      @clientName("Widget") interface Empty {}
      @clientName("Widget") namespace Outer {
        interface Inner { @get op read(): Example.Widget; }
      }`,
    )
    .toBeValid();
});
