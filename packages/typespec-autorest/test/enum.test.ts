import { deepStrictEqual, ok } from "assert";
import { expect, it } from "vitest";
import { compileOpenAPI, oapiForModel } from "./test-host.js";

const enumBase = Object.freeze({
  type: "string",
  enum: ["foo", "bar"],
});

it("create basic enum without values", async () => {
  const res: any = await oapiForModel("Foo", `enum Foo {foo, bar}`);

  const schema = res.defs.Foo;
  deepStrictEqual(schema, {
    ...enumBase,
    "x-ms-enum": {
      modelAsString: false,
      name: "Foo",
    },
  });
});

it("enums are marked with modelAsString false by default", async () => {
  const res: any = await oapiForModel("Foo", `enum Foo {foo, bar}`);

  const schema = res.defs.Foo;
  deepStrictEqual(schema["x-ms-enum"].modelAsString, false);
});

it("create enum with doc on a member", async () => {
  const res: any = await oapiForModel(
    "Foo",
    `
        enum Foo {
          @doc("Foo doc")
          foo,
          bar
        }
      `,
  );

  const schema = res.defs.Foo;
  deepStrictEqual(schema, {
    ...enumBase,
    "x-ms-enum": {
      modelAsString: false,
      name: "Foo",
      values: [
        {
          description: "Foo doc",
          name: "foo",
          value: "foo",
        },
        {
          name: "bar",
          value: "bar",
        },
      ],
    },
  });
});

it("create enum with custom name/value on a member", async () => {
  const res: any = await oapiForModel(
    "Foo",
    `
        enum Foo {
          FooCustom: "foo",
          bar,
        }
      `,
  );

  const schema = res.defs.Foo;
  deepStrictEqual(schema, {
    ...enumBase,
    "x-ms-enum": {
      modelAsString: false,
      name: "Foo",
      values: [
        {
          name: "FooCustom",
          value: "foo",
        },
        {
          name: "bar",
          value: "bar",
        },
      ],
    },
  });
});

it("create enum with numeric values", async () => {
  const res: any = await oapiForModel(
    "Test",
    `
        enum Test {
          Zero: 0,
          One: 1,
        }
      `,
  );

  const schema = res.defs.Test;
  deepStrictEqual(schema, {
    type: "number",
    enum: [0, 1],
    "x-ms-enum": {
      modelAsString: false,
      name: "Test",
      values: [
        {
          name: "Zero",
          value: 0,
        },
        {
          name: "One",
          value: 1,
        },
      ],
    },
  });
});

it("overrides x-ms-enum.name with @clientName", async () => {
  const res: any = await compileOpenAPI(`@clientName("RenamedFoo") enum Foo {foo, bar}`, {
    preset: "azure",
  });
  const schema = res.definitions.RenamedFoo;
  deepStrictEqual(schema["x-ms-enum"].name, "RenamedFoo");
});

it("reference enum member as parameter type", async () => {
  const res: any = await compileOpenAPI(
    `
      enum Test {a, b}

      op test(@header param: Test.a): void;
      `,
  );

  const headerParam = res.paths["/"].get.parameters.find((p: any) => p.name === "param");
  ok(headerParam, "Expected param header parameter");

  expect(headerParam).toMatchObject({
    name: "param",
    in: "header",
    type: "string",
    enum: ["a"],
  });
});
