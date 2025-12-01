import { deepStrictEqual, ok } from "assert";
import { expect, it } from "vitest";
import { getTestSchema } from "./test-host.js";

async function getPropertySchema(code: string) {
  const schema = await getTestSchema(code);
  const prop = schema.properties?.prop;
  ok(prop, "Property 'prop' not found in Test schema");
  return prop;
}

it("defines nullable properties", async () => {
  const prop = await getPropertySchema(`
    model Test {
      prop: string | null;
    }
  `);

  expect(prop).toEqual({
    type: "string",
    "x-nullable": true,
  });
});

it("defines nullable array", async () => {
  const prop = await getPropertySchema(`
    model Test {
      prop: int32[] | null;
    }
  `);

  expect(prop).toEqual({
    type: "array",
    items: {
      type: "integer",
      format: "int32",
    },
    "x-nullable": true,
  });
});

it("defines nullable enum", async () => {
  const prop = await getPropertySchema(`
    enum PetKind { dog, cat }
    model Test {
      kind: PetKind | null;
    }
  `);

  expect(prop).toEqual({
    $ref: "#/definitions/PetKind",
    "x-nullable": true,
  });
});

it("defines nullable union", async () => {
  const prop = await getPropertySchema(`
    union PetKind { "dog", "cat" }
    model Test {
      kind: PetKind | null;
    }
  `);

  expect(prop).toEqual({
    $ref: "#/definitions/PetKind",
    "x-nullable": true,
  });
});

it("defines nullable model", async () => {
  const prop = await getPropertySchema(`
    model Pet {
      prop: string;
    }

    model Test {
      type: Pet | null;
    }
  `);
  expect(prop).toEqual({
    $ref: "#/definitions/Pet",
    "x-nullable": true,
  });
});

it("defines nullable record", async () => {
  const schema = await getTestSchema(`
    model Pet {
      prop: string;
    }

    model Test {
      record: Record<Pet | null>;
    }
  `);
  deepStrictEqual(schema.properties?.record, {
    additionalProperties: {
      $ref: "#/definitions/Pet",
      "x-nullable": true,
    },
    type: "object",
  });
});

it("specify default value on nullable property", async () => {
  const prop = await getPropertySchema(`
      model Test {
        prop?: string | null = null;
      };
    `);

  expect(prop).toEqual({
    type: "string",
    "x-nullable": true,
    default: null,
  });
});

it("keeps constraints", async () => {
  const prop = await getPropertySchema(`
    model Test {
      @minLength(3)
      prop: string | null;
    }
  `);

  expect(prop).toEqual({
    type: "string",
    "x-nullable": true,
    minLength: 3,
  });
});

it("nullable enum with default include x-ms-enum.name", async () => {
  const prop = await getPropertySchema(`
    enum PetKind { dog, cat }
    model Test {
      prop: PetKind | null = null;
    }
  `);

  expect(prop).toEqual({
    type: "string",
    enum: ["dog", "cat"],
    "x-ms-enum": {
      name: "PetKind",
      modelAsString: false,
      values: [
        { name: "dog", value: "dog" },
        { name: "cat", value: "cat" },
      ],
    },
    "x-nullable": true,
    default: null,
  });
});
