import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useModelInheritanceRule } from "../../src/rules/use-model-inheritance.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [],
  features: ["union-extends", "declaration-expressions"],
});
const base = "model Base { id: string; }";
let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    useModelInheritanceRule,
    libraryName,
  );
});

function diagnostic(target: string, baseName = "Base") {
  return {
    code: `${libraryName}/use-model-inheritance`,
    severity: "warning" as const,
    message: `Model variant must be '${baseName}' or explicitly inherit from it. Use 'model extends ${baseName}' instead of relying on structural compatibility.`,
    target,
  };
}

describe("model inheritance", () => {
  it.each([
    ["direct", "model Derived extends Base {}"],
    ["transitive", "model Middle extends Base {} model Derived extends Middle {}"],
    ["aliased base", "alias Parent = Base; model Derived extends Parent {}"],
    ["aliased variant", "model Child extends Base {} alias Derived = Child;"],
    ["base itself", "alias Derived = Base;"],
    ["model is retaining inheritance", "model Child extends Base {} model Derived is Child;"],
    ["template model", "model Child<T> extends Base { value: T; } alias Derived = Child<string>;"],
    ["inline model declaration", "alias Derived = model extends Base { name: string; };"],
  ])("accepts %s", async (_, declaration) => {
    await tester
      .expect(`${base} ${declaration} union Choice extends Base { value: Derived }`)
      .toBeValid();
  });

  it("resolves an alias in the union constraint", async () => {
    await tester
      .expect(
        `
        ${base}
        alias Parent = Base;
        model Derived extends Base {}
        union Choice extends Parent { value: Derived, base: Parent }
      `,
      )
      .toBeValid();
  });

  it.each([
    ["structural match", "model Other { id: string; }"],
    ["spread", "model Other { ...Base; }"],
    ["model is", "model Other is Base;"],
    ["aliased structural match", "model Copy { id: string; } alias Other = Copy;"],
    ["inline model", "alias Other = { id: string };"],
    ["inline spread", "alias Other = { ...Base };"],
    ["inline model is", "alias Other = model is Base;"],
    ["unrelated parent", "model Parent { id: string; } model Other extends Parent {}"],
    [
      "copied parent",
      "model Parent is Base; model Middle extends Parent {} model Other extends Middle {}",
    ],
    ["spread of derived model", "model Derived extends Base {} model Other { ...Derived; }"],
  ])("rejects %s without a base inheritance chain", async (_, declaration) => {
    await tester
      .expect(`${base} ${declaration} union Choice extends Base { invalid: Other }`)
      .toEmitDiagnostics([diagnostic("invalid")]);
  });

  it("checks anonymous variants", async () => {
    await tester
      .expect(`${base} model Other { id: string; } union Choice extends Base { Other }`)
      .toEmitDiagnostics([diagnostic("Other")]);
  });

  it("checks model expressions directly in the union", async () => {
    await tester
      .expect(`${base} union Choice extends Base { invalid: { id: string } }`)
      .toEmitDiagnostics([diagnostic("invalid")]);
  });

  it("reports only offending variants, not their model declarations", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Other { id: string; }
        model Copy is Base;
        union Choice extends Base {
          direct: Derived,
          structural: Other,
          copied: Copy,
          base: Base,
          repeated: Other,
        }
      `,
      )
      .toEmitDiagnostics([diagnostic("structural"), diagnostic("copied"), diagnostic("repeated")]);
  });

  it("does not equate identically named models from different namespaces", async () => {
    await tester
      .expect(
        `
        namespace First { model Base { id: string; } }
        namespace Second { model Base { id: string; } model Derived extends Base {} }
        union Choice extends First.Base { invalid: Second.Derived }
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid", "First.Base")]);
  });

  it("requires the declared base, not just a common ancestor", async () => {
    await tester
      .expect(
        `
        model Root { id: string; }
        model Base extends Root {}
        model Sibling extends Root {}
        union Choice extends Base { invalid: Sibling }
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid")]);
  });
});

describe("templates", () => {
  it("does not diagnose uninstantiated templates", async () => {
    await tester
      .expect(
        `
        ${base}
        union Choice<T> extends Base { value: T }
        union Generic<BaseType, T> extends BaseType { value: T }
      `,
      )
      .toBeValid();
  });

  it("checks a concrete valid union instantiation", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        union Choice<T> extends Base { value: T }
        model Usage { choice: Choice<Derived>; }
      `,
      )
      .toBeValid();
  });

  it("checks invalid instantiations even when a valid instantiation is visited first", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Other { id: string; }
        union Choice<T> extends Base { invalid: T }
        model Usage { good: Choice<Derived>; bad: Choice<Other>; again: Choice<Other>; }
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid")]);
  });

  it("resolves template parameters in the base constraint and variant", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Other { id: string; }
        union Choice<B, T> extends B { invalid: T }
        model Usage { good: Choice<Base, Derived>; bad: Choice<Base, Other>; }
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid")]);
  });

  it("accepts inheritance from the exact model template instantiation", async () => {
    await tester
      .expect(
        `
        model Base<T> { value: T; }
        model Derived<T> extends Base<T> {}
        union Choice extends Base<string> { derived: Derived<string>, base: Base<string> }
      `,
      )
      .toBeValid();
  });

  it("rejects inheritance from a structurally compatible but different instantiation", async () => {
    await tester
      .expect(
        `
        model Base<T> { value: T; }
        model Derived extends Base<"specific"> {}
        union Choice extends Base<string> { invalid: Derived }
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid", "Base<string>")]);
  });

  it("checks an instantiated template reached through an alias", async () => {
    await tester
      .expect(
        `
        ${base}
        model Other { id: string; }
        union Choice<T> extends Base { invalid: T }
        alias Instance = Choice<Other>;
        op read(): Instance;
      `,
      )
      .toEmitDiagnostics([diagnostic("invalid")]);
  });
});

describe("unaffected constructs", () => {
  it("does not require an extends clause", async () => {
    await tester
      .expect(`${base} model Copy is Base; union Choice { Base, Copy, string, null }`)
      .toBeValid();
  });

  it.each([
    ["scalar", 'union Choice extends string { "first", "second" }'],
    ["enum", "enum Values { first, second } union Choice extends Values { Values.first }"],
    [
      "union",
      `${base} model Copy is Base; union Constraint { Base, string }
       union Choice extends Constraint { copied: Copy, text: string }`,
    ],
    ["union expression", "union Choice extends string | int32 { text: string, number: int32 }"],
    ["non-model variant", `${base} union Choice extends Base { impossible: never }`],
  ])("leaves %s constraints and variants to the compiler", async (_, code) => {
    await tester.expect(code).toBeValid();
  });

  it("allows a model to participate in multiple unions", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        union First extends Base { Derived }
        union Second extends Base { Derived }
      `,
      )
      .toBeValid();
  });

  it.each(["Azure.Core", "Azure.ResourceManager"])(
    "does not diagnose imported %s library types",
    async (namespace) => {
      await tester
        .expect({
          "main.tsp": `import "test-library"; op read(): ${namespace}.Choice;`,
          "node_modules/test-library/package.json": JSON.stringify({
            name: "test-library",
            tspMain: "main.tsp",
          }),
          "node_modules/test-library/tspconfig.yaml": "kind: project\nfeatures: [union-extends]",
          "node_modules/test-library/main.tsp": `
            namespace ${namespace};
            ${base}
            model Copy is Base;
            union Choice extends Base { copied: Copy }
          `,
        })
        .toBeValid();
    },
  );
});
