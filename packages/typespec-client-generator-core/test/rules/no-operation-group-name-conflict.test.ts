import { getSourceLocation } from "@typespec/compiler";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { beforeEach, describe, it } from "vitest";
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
const diagnostic = (group = "Widget", type = group) => ({
  code: "@azure-tools/typespec-client-generator-core/no-operation-group-name-conflict",
  message: `Operation group '${group}' conflicts with type '${type}'. Rename the group, for example by using a plural name.`,
});

async function check(code: string, names: string[] = []) {
  if (names.length) await tester.expect(code).toEmitDiagnostics(names.map((x) => diagnostic(x)));
  else await tester.expect(code).toBeValid();
}

describe("no-operation-group-name-conflict", () => {
  it("targets the authored interface, namespace, or virtual group's operation", async () => {
    for (const code of [
      t.code`${header} model Widget { id: string; }
        namespace Operations { interface ${t.interface("Widget")} { @get op read(): Example.Widget; } }`,
      t.code`${header} model Widget { id: string; }
        namespace Operations.${t.namespace("Widget")} { @get op read(): Example.Widget; }`,
      t.code`${header} model Widget { id: string; }
        @clientLocation("Widget") @get op ${t.op("read")}(): Widget;`,
    ]) {
      await tester.expect(code).toEmitDiagnostics((result) => ({
        ...diagnostic(),
        pos: getSourceLocation("Widget" in result ? result.Widget : result.read).pos,
        end: getSourceLocation("Widget" in result ? result.Widget : result.read).end,
      }));
    }
  });
  it("validates the published generic HTTP examples", async () => {
    const documentation = await readFile(
      new URL("../../src/rules/no-operation-group-name-conflict.md", import.meta.url),
      "utf8",
    );
    const snippets = [...documentation.matchAll(/```tsp\r?\n([\s\S]*?)```/g)];
    if (snippets.length !== 2) throw new Error("Expected incorrect and correct examples.");
    await check(snippets[0][1], ["Widget"]);
    await check(snippets[1][1]);
  });
  it("reports a real group once rather than each method", async () => {
    await check(
      `${header}
      model Widget { id: string; }
      namespace Operations {
        interface Widget {
          @get @route("/one") op one(): Example.Widget;
          @get @route("/two") op two(): Example.Widget;
        }
      }`,
      ["Widget"],
    );
  });
  it("accepts a plural group", async () => {
    await check(`${header} model Widget { id: string; }
      interface Widgets { @get op read(): Widget; }`);
  });
  it("does not invent groups from root operation names", async () => {
    await check(`${header} model Widget { id: string; }
      @get op Widget_Read(): Widget;`);
  });
  it.each(["Widget_Extended", "widget"])(
    "keeps the full case-sensitive group name %s",
    async (name) => {
      await check(`${header} model Widget { id: string; }
      interface ${name} { @get op read(): Widget; }`);
      await check(
        `${header} model ${name} { id: string; }
      namespace Operations { interface ${name} { @get op read(): Example.${name}; } }`,
        [name],
      );
    },
  );
  it.each(["autorest", "csharp", "javascript", "client-generator-core"])(
    "ignores %s naming and relocation overrides",
    async (scope) => {
      await check(
        `${header}
        @clientName("Other", "${scope}") model Widget { id: string; }
        namespace Operations {
          @clientName("Other", "${scope}")
          interface Widget {
            @clientLocation("Other", "${scope}") @get op read(): Example.Widget;
          }
        }`,
        ["Widget"],
      );
    },
  );
  it("honors common names in both directions", async () => {
    await check(
      `${header}
      @clientName("Widget") model Item { id: string; }
      @clientName("Widget") interface Items { @get op read(): Item; }`,
      ["Widget"],
    );
    await check(`${header}
      @clientName("Renamed") model Widget { id: string; }
      namespace Operations { interface Widget { @get op read(): Example.Widget; } }`);
  });
  it("uses common string relocation and ignores relocation to the root", async () => {
    await check(
      `${header} model Widget { id: string; }
      @clientLocation("Widget") @get op read(): Widget;`,
      ["Widget"],
    );
    await check(`${header} model Widget { id: string; }
      namespace Operations { interface Widget {
        @clientLocation(Example) @get op Widget_Read(): Example.Widget;
      } }`);
  });
  it("uses a typed relocated group", async () => {
    await check(
      `${header} model Widget { id: string; }
      namespace Operations { interface Widget {} }
      @clientLocation(Operations.Widget) @get op read(): Widget;`,
      ["Widget"],
    );
  });
  it("includes shared types but not unused names or another client's types", async () => {
    await check(
      `using TypeSpec.Http; using Azure.ClientGenerator.Core;
      namespace Shared { model Widget { id: string; } }
      @service namespace Example { interface Widget { @get op read(): Shared.Widget; } }`,
      ["Widget"],
    );
    await check(`${header} model Widget { id: string; }
      namespace Operations { interface Widget { @get op read(): { id: string }; } }`);
    await check(`using TypeSpec.Http; using Azure.ClientGenerator.Core;
      @service namespace One { interface Widget { @get op read(): string; } }
      @service namespace Two { model Widget { id: string; } @get op read(): Widget; }`);
  });
  it("checks named types in parameters, nested namespaces and recursive shared models", async () => {
    await check(
      `${header}
      namespace Types { scalar Widget extends string; }
      interface Widget { @get op read(@query value: Types.Widget): string; }`,
      ["Widget"],
    );
    await check(
      `${header}
      model Widget { child?: Widget; }
      model Container { first: Widget; second: Widget; }
      namespace Operations { interface Widget { @get op read(): Container; } }`,
      ["Widget"],
    );
  });
  it("uses supported concrete template names, with or without friendly names", async () => {
    await check(
      `${header} model Widget<T> { value: T; }
      namespace Operations { interface Widget { @get op read(): Example.Widget<string>; } }`,
      ["Widget"],
    );
    await check(
      `${header} @friendlyName("Widget") model Box<T> { value: T; }
      interface Widget { @get op read(): Box<string>; }`,
      ["Widget"],
    );
  });
  it("honors explicit subclient names and common overrides", async () => {
    for (const decorators of [
      '@client({name: "Widget"})',
      '@client({name: "Other"}) @clientName("Widget")',
    ]) {
      await check(
        `using TypeSpec.Http; using Azure.ClientGenerator.Core;
        @service namespace Example { model Widget { id: string; } @get op read(): Widget; }
        @client({service: Example}) namespace Custom {
          ${decorators} interface Items { op read is Example.read; }
        }`,
        ["Widget"],
      );
    }
  });
  it("checks a parent group even when only its subgroup has methods", async () => {
    await check(
      `${header} model Widget { id: string; }
      namespace Operations.Widget { interface Reads { @get op read(): Example.Widget; } }`,
      ["Widget"],
    );
  });
  it("does not collapse distinct groups with the same name", async () => {
    await check(
      `${header} model Widget { id: string; }
      namespace One { interface Widget { @get @route("/one") op read(): Example.Widget; } }
      namespace Two { interface Widget { @get @route("/two") op read(): Example.Widget; } }`,
      ["Widget", "Widget"],
    );
  });
  it.each(["enum Widget { one }", "union Widget { one: string, two: int32 }"])(
    "checks a reachable %s",
    async (declaration) => {
      await check(
        `${header} ${declaration}
        namespace Operations { interface Widget { @get op read(): Example.Widget; } }`,
        ["Widget"],
      );
    },
  );
  it("includes inherited and discriminated types without HTTP body exclusions", async () => {
    await check(
      `${header} model Widget { id: string; } model Child extends Widget { value: string; }
      namespace Operations { interface Widget { @get op read(): Child; } }`,
      ["Widget"],
    );
    await check(
      `${header} @discriminator("kind") model Base { kind: string; }
      model Widget extends Base { kind: "widget"; value: string; }
      namespace Operations { interface Widget { @get op read(): Base; } }`,
      ["Widget"],
    );
    await check(
      `${header} scalar Widget extends string;
      namespace Operations { interface Widget { @get op read(): { @header value: Example.Widget }; } }`,
      ["Widget"],
    );
  });
  it("does not include unused siblings through a shared base", async () => {
    await check(`${header}
      model Base { id: string; }
      model Used extends Base {}
      model Unused extends Base {}
      namespace Groups { interface Unused { @get op read(): Example.Used; } }`);
  });
  it("includes a sibling when an operation directly references it", async () => {
    await check(
      `${header}
      model Base { id: string; }
      model Used extends Base {}
      model Unused extends Base {}
      namespace Groups { interface Unused {
        @get @route("/used") op read(): Example.Used;
        @get @route("/other") op readOther(): Example.Unused;
      } }`,
      ["Unused"],
    );
  });
  it("keeps types sharing a base isolated between root clients", async () => {
    await check(`using TypeSpec.Http; using Azure.ClientGenerator.Core;
      namespace Shared { model Base { id: string; } }
      @service namespace One {
        model Used extends Shared.Base {}
        interface Widget { @get op read(): Used; }
      }
      @service namespace Two {
        model Widget extends Shared.Base {}
        @get op read(): Widget;
      }`);
  });
  it("expands discriminated alternatives only for an actual API reference", async () => {
    const models = `${header}
      @discriminator("kind") model Base { kind: string; }
      model Used extends Base { kind: "used"; }
      model Widget extends Base { kind: "widget"; }`;
    await check(`${models}
      namespace Groups { interface Widget { @get op read(): Used; } }`);
    await check(
      `${models}
      namespace Groups { interface Widget {
        @get @route("/used") op read(): Used;
        @get @route("/base") op readBase(): Base;
      } }`,
      ["Widget"],
    );
  });
  it("includes recursive polymorphic members and intermediate discriminator bases", async () => {
    await check(
      `${header}
      @discriminator("kind") model Base { kind: string; }
      model Intermediate extends Base { value: string; }
      model Widget extends Intermediate { kind: "widget"; }
      model Used extends Base { kind: "used"; child?: Base; }
      namespace Groups { interface Widget { @get op read(): Used; } }`,
      ["Widget"],
    );
  });
  it("retains named children of anonymous models but not names of unused template arguments", async () => {
    await check(
      `${header} model Widget { id: string; }
      namespace Operations { interface Widget { @get op read(): { value: Example.Widget }; } }`,
      ["Widget"],
    );
    await check(`${header} model Widget { id: string; } model Unused<T> { id: string; }
      namespace Operations { interface Widget { @get op read(): Unused<Example.Widget>; } }`);
  });
  it.each(["Example.Widget[]", "Record<Example.Widget>"])(
    "retains the named element of a standard container %s",
    async (response) => {
      await check(
        `${header} model Widget { id: string; }
        namespace Operations { interface Widget { @get op read(): ${response}; } }`,
        ["Widget"],
      );
    },
  );
  it("checks instantiated interface templates and excludes language-only methods", async () => {
    await check(
      `${header} model Widget { id: string; }
      interface Read<T> { @get op read(): T; }
      namespace Operations { interface Widget extends Read<Example.Widget> {} }`,
      ["Widget"],
    );
    await check(`${header} model Widget { id: string; }
      namespace Operations { interface Widget { @scope("csharp") @get op read(): Example.Widget; } }`);
  });
  describe.each(["enum Widget { one, two }", 'union Widget { one: "one", two: "two" }'])(
    "member ownership for %s",
    (declaration) => {
      it.each([
        "@get op read(): Example.Widget.one;",
        "@get op read(@query value: Example.Widget.one): string;",
        "@get op read(): { nested: { values: Record<Example.Widget.one> }; };",
      ])("includes the owner through %s", async (operation) => {
        await check(
          `${header} ${declaration}
        namespace Groups { interface Widget { ${operation} } }`,
          ["Widget"],
        );
      });
      it("uses the owner's common name rather than the member's name", async () => {
        await check(
          `${header} @clientName("Items", "csharp") @clientName("Item") ${declaration}
        interface Item { @get op read(): Widget.one; }`,
          ["Item"],
        );
      });
    },
  );
  it("visits only the selected non-enum union alternative until the union is referenced", async () => {
    const models = `${header}
      model Widget { id: string; } model Used { id: string; }
      union Choice { selected: Used, other: Widget }`;
    await check(`${models}
      namespace Groups { interface Widget { @get op read(): Choice.selected; } }`);
    await check(
      `${models}
      namespace Groups { interface Widget {
        @get @route("/selected") op read(): Choice.selected;
        @get @route("/all") op readAll(): Choice;
      } }`,
      ["Widget"],
    );
  });
  describe.each([
    ["direct", "Box<string>", "Box<int32>", ""],
    ["nested", "{ value: Box<string> }", "{ value: Box<int32> }", ""],
    ["unrelated nested", "Box<string>", "{ value: Box<int32> }", ""],
    [
      "later operation",
      "string",
      "Box<int32>",
      '@get @route("/box") op readBox(): Example.Box<string>;',
    ],
  ])("isolates classification names for a %s reference", (_, selected, unused, later) => {
    it.each([false, true])("is independent of selected-first=%s", async (selectedFirst) => {
      const alternatives = [`selected: ${selected}`, `unused: ${unused}`];
      if (!selectedFirst) alternatives.reverse();
      await tester
        .expect(
          t.code`${header}
          model Box<T> { value: T; }
          union Choice { ${alternatives.join(",")} }
          namespace Groups { interface ${t.interface("Box")} {
            @get @route("/selected") op read(): Choice.selected;
            ${later}
          } }`,
        )
        .toEmitDiagnostics((result) => ({
          ...diagnostic("Box"),
          pos: getSourceLocation(result.Box).pos,
          end: getSourceLocation(result.Box).end,
        }));
    });
  });
  it.each([false, true])(
    "does not leak classification names into another root client, selected-first=%s",
    async (selectedFirst) => {
      const alternatives = ["selected: string", "unused: Box<int32>"];
      if (!selectedFirst) alternatives.reverse();
      await tester
        .expect(
          t.code`using TypeSpec.Http;
          namespace Shared {
            model Box<T> { value: T; }
            union Choice { ${alternatives.join(",")} }
          }
          @service namespace One { @get op read(): Shared.Choice.selected; }
          @service namespace Two {
            interface ${t.interface("Box")} { @get op read(): Shared.Box<string>; }
          }`,
        )
        .toEmitDiagnostics((result) => ({
          ...diagnostic("Box"),
          pos: getSourceLocation(result.Box).pos,
          end: getSourceLocation(result.Box).end,
        }));
    },
  );
  it("does not invent an enum owner for non-enum or nullable union variants", async () => {
    for (const declaration of [
      'model Other { id: string; } union Widget { one: "one", other: Other }',
      'union Widget { one: "one", two: "two", null }',
    ]) {
      await check(`${header} ${declaration}
        namespace Groups { interface Widget { @get op read(): Example.Widget.one; } }`);
    }
  });
  it("retains an enum member reached through a non-enum union variant", async () => {
    await check(
      `${header} enum Widget { one, two } model Other { id: string; }
      union Choice { selected: Widget.one, other: Other }
      namespace Groups { interface Widget { @get op read(): Choice.selected; } }`,
      ["Widget"],
    );
  });
  describe.each(["csharp", "autorest"])("common API property scope versus %s", (scope) => {
    it("excludes language-only nested and inherited properties", async () => {
      await check(`${header}
        model Widget { id: string; } model Nested { value: Widget; }
        model Base { @scope("${scope}") nested: Nested; id: string; }
        model Response extends Base { @scope("${scope}") direct: Widget; }
        namespace Groups { interface Widget { @get op read(): Response; } }`);
    });
    it("excludes language-only operation parameters before following their member types", async () => {
      await check(`${header} scalar Widget extends string;
        namespace Groups { interface Widget {
          @get op read(@scope("${scope}") @query value: Example.Widget): string;
        } }`);
      await check(`${header} enum Widget { one, two }
        namespace Groups { interface Widget {
          @get op read(@scope("${scope}") @query value: Example.Widget.one): string;
        } }`);
    });
    it("retains common fallback properties and parameters", async () => {
      await check(
        `${header}
        model Widget { id: string; }
        model Base { @scope("!${scope}") value: Widget; }
        model Response extends Base {}
        namespace Groups { interface Widget { @get op read(): Response; } }`,
        ["Widget"],
      );
      await check(
        `${header} enum Widget { one, two }
        namespace Groups { interface Widget {
          @get op read(@scope("!${scope}") @query value: Example.Widget.one): string;
        } }`,
        ["Widget"],
      );
    });
  });
  it("checks the common name of a friendly-named union template", async () => {
    await check(
      `${header} @friendlyName("Gizmo", T)
      union Choice<T> { item: T, empty: "empty", other: string }
      interface Gizmo { @get op read(): Choice<"one">; }`,
      ["Gizmo"],
    );
  });
  it("checks the common name of an undecorated union template", async () => {
    await check(
      `${header} union Gizmo<T> { item: T, empty: "empty", other: string }
      namespace Groups { interface Gizmo { @get op read(): Example.Gizmo<"one">; } }`,
      ["Gizmo"],
    );
  });
  it("checks named parent and child types used by the API", async () => {
    await check(
      `${header} model Child { id: string; } model Widget { child: Child; }
      namespace Groups {
        interface Widget { @get @route("/widgets") op read(): Example.Widget; }
        interface Child { @get @route("/children") op read(): Example.Widget; }
      }`,
      ["Widget", "Child"],
    );
  });
});
