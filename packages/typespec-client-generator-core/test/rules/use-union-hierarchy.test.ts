import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { useUnionHierarchyRule } from "../../src/rules/use-union-hierarchy.js";
import { SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const base = "model Base { id: string; }";
let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await SimpleTester.createInstance(),
    useUnionHierarchyRule,
    libraryName,
  );
});

function diagnostic(target: string, baseName = "Base") {
  return {
    code: `${libraryName}/use-union-hierarchy`,
    severity: "warning" as const,
    message: `Model variant must be '${baseName}' or explicitly inherit from it. Use 'model extends ${baseName}' instead of relying on structural compatibility.`,
    target,
  };
}

function missingExtends(target: string) {
  return {
    code: `${libraryName}/use-union-hierarchy`,
    severity: "warning" as const,
    message: "Named unions must declare an 'extends' constraint. Use 'union Name extends Base'.",
    target,
  };
}

function reusedModel(target: string, modelName = "Derived", unionName = "First") {
  return {
    code: `${libraryName}/use-union-hierarchy`,
    severity: "warning" as const,
    message: `Model '${modelName}' is already a variant of union '${unionName}'. A model can be a variant of only one union with a model extends constraint.`,
    target,
  };
}

describe("named union constraints", () => {
  it.each([
    ["models", `${base} union Choice { Base }`],
    ["scalars", "union Choice { string, int32 }"],
    ["literals", 'union Choice { "first", "second" }'],
    ["nullable models", `${base} union Choice { Base, null }`],
    ["empty union", "union Choice {}"],
    ["named declaration expression", "op read(): union Choice { string, int32 };"],
  ])("requires extends for %s", async (_, code) => {
    await tester.expect(code).toEmitDiagnostics([missingExtends("Choice")]);
  });

  it.each([
    ["property expression", `${base} model Usage { choice: Base | null; }`],
    ["return expression", `${base} op read(): Base | string;`],
    ["alias expression", `${base} alias Choice = Base | string; op read(): Choice;`],
    ["unnamed declaration expression", "op read(): union { string, int32 };"],
  ])("does not require extends for an unnamed %s", async (_, code) => {
    await tester.expect(code).toBeValid();
  });

  it("checks nested named unions independently", async () => {
    await tester
      .expect('union Inner { "first", "second" } union Outer extends string { Inner }')
      .toEmitDiagnostics([missingExtends("Inner")]);
  });

  it("checks reachable concrete templates without diagnosing unused templates", async () => {
    await tester
      .expect("union Unused<T> { T } union Choice<T> { T } model Usage { value: Choice<string>; }")
      .toEmitDiagnostics([missingExtends("Choice")]);
  });
});

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

describe("model ownership", () => {
  it.each([
    ["direct", "Derived", "Derived"],
    ["aliased", "Derived", "Alias"],
    ["base itself", "Base", "Base"],
  ])("rejects %s model variants in multiple unions", async (_, first, second) => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        alias Alias = Derived;
        union First extends Base { first: ${first} }
        union Second extends Base { invalid: ${second} }
      `,
      )
      .toEmitDiagnostics([reusedModel("invalid", first)]);
  });

  it("checks anonymous variants", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        union First extends Base { Derived }
        union Second extends Base { Derived }
      `,
      )
      .toEmitDiagnostics([reusedModel("Derived")]);
  });

  it("allows repeated variants within one union and repeated references to that union", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        alias Alias = Derived;
        union First extends Base { first: Derived, second: Alias }
        model Usage { first: First; second: First; }
      `,
      )
      .toBeValid();
  });

  it("allows separate variants in unions sharing the same base", async () => {
    await tester
      .expect(
        `
        ${base}
        model Cat extends Base {}
        model Dog extends Base {}
        union First extends Base { Cat }
        union Second extends Base { Dog }
      `,
      )
      .toBeValid();
  });

  it("compares model identity rather than names or structural shapes", async () => {
    await tester
      .expect(
        `
        ${base}
        namespace One { model Derived extends Base {} }
        namespace Two { model Derived extends Base {} }
        union First extends Base { One.Derived }
        union Second extends Base { Two.Derived }
      `,
      )
      .toBeValid();
  });

  it("reports each subsequent union but not unaffected variants", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Other extends Base {}
        union First extends Base { Derived }
        union Second extends Base { second: Derived, other: Other }
        union Third extends Base { third: Derived }
      `,
      )
      .toEmitDiagnostics([reusedModel("second"), reusedModel("third")]);
  });

  it("checks reuse across different base constraints", async () => {
    await tester
      .expect(
        `
        ${base}
        model Middle extends Base {}
        model Derived extends Middle {}
        union First extends Base { Derived }
        union Second extends Middle { invalid: Derived }
      `,
      )
      .toEmitDiagnostics([reusedModel("invalid")]);
  });

  it("allows models in anonymous union expressions outside their hierarchy", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Usage { value: Derived | null; }
        union First extends Base { Derived }
        op read(): Derived | string;
      `,
      )
      .toBeValid();
  });

  it("does not share ownership between compilations", async () => {
    const code = `${base} model Derived extends Base {} union First extends Base { Derived }`;
    await tester.expect(code).toBeValid();
    await tester.expect(code).toBeValid();
  });

  it("uses the owning union's qualified name in diagnostics", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        namespace Owner { union First extends Base { Derived } }
        union Second extends Base { invalid: Derived }
      `,
      )
      .toEmitDiagnostics([reusedModel("invalid", "Derived", "Owner.First")]);
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
  it("does not treat repeated references to one instantiation as different unions", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        union Choice<T> extends Base { value: T }
        model Usage { first: Choice<Derived>; second: Choice<Derived>; }
      `,
      )
      .toBeValid();
  });

  it("tracks ownership across distinct template instantiations", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        model Other extends Base {}
        union First<T> extends Base { shared: Derived, value: T }
        model Usage { first: First<Derived>; second: First<Other>; }
      `,
      )
      .toEmitDiagnostics([reusedModel("shared")]);
  });

  it("allows distinct model template instantiations in different unions", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived<T> extends Base { value: T; }
        union First extends Base { Derived<string> }
        union Second extends Base { Derived<int32> }
      `,
      )
      .toBeValid();
  });
});

describe("unaffected constructs", () => {
  it.each([
    ["scalar", 'union Choice extends string { "first", "second" }'],
    ["enum", "enum Values { first, second } union Choice extends Values { Values.first }"],
    [
      "union",
      `${base} model Copy is Base; union Constraint extends Base | string { Base, string }
       union Choice extends Constraint { copied: Copy, text: string }`,
    ],
    ["union expression", "union Choice extends string | int32 { text: string, number: int32 }"],
    ["non-model variant", `${base} union Choice extends Base { impossible: never }`],
  ])("leaves %s constraints and variants to the compiler", async (_, code) => {
    await tester.expect(code).toBeValid();
  });

  it("does not track model ownership for non-model constraints", async () => {
    await tester
      .expect(
        `
        ${base}
        model Derived extends Base {}
        union First extends Base | string { Derived }
        union Second extends Base | string { Derived }
        union Third extends Base { Derived }
      `,
      )
      .toBeValid();
  });
});
