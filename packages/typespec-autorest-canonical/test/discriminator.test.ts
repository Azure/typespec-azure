import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { createAutorestCanonicalTestRunner, openApiFor } from "./test-host.js";

it("discriminator can be a simple string literal", async () => {
  const openApi = await openApiFor(`
    @discriminator("kind")
    model Pet { }
    model Cat extends Pet {
      kind: "cat";
      meow: int32;
    }
    model Dog extends Pet {
      kind: "dog";
      bark: string;
    }
    `);
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: { kind: { type: "string", description: "Discriminator property for Pet." } },
    required: ["kind"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Cat.allOf, [{ $ref: "#/definitions/Pet" }]);
  deepStrictEqual(openApi.definitions.Dog.allOf, [{ $ref: "#/definitions/Pet" }]);
});

it("discriminator can be a union", async () => {
  const openApi = await openApiFor(`
    union PetKind {cat: "cat-kind", dog: "dog-kind" }
    @discriminator("kind")
    model Pet { kind: PetKind }
    model Cat extends Pet {
      kind: PetKind.cat;
      meow: int32;
    }
    model Dog extends Pet {
      kind: PetKind.dog;
      bark: string;
    }
    `);
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: {
      kind: {
        $ref: "#/definitions/PetKind",
      },
    },
    required: ["kind"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Cat["x-ms-discriminator-value"], "cat-kind");
  deepStrictEqual(openApi.definitions.Dog["x-ms-discriminator-value"], "dog-kind");
});

it("defines discriminated unions with non-empty base type", async () => {
  const openApi = await openApiFor(`
    @discriminator("kind")
    model Pet {
      name: string;
      weight?: float32;
    }
    model Cat extends Pet {
      kind: "cat";
      meow: int32;
    }
    model Dog extends Pet {
      kind: "dog";
      bark: string;
    }

    op read(): { @body body: Pet };
    `);
  ok(openApi.definitions.Pet, "expected definition named Pet");
  ok(openApi.definitions.Cat, "expected definition named Cat");
  ok(openApi.definitions.Dog, "expected definition named Dog");
  deepStrictEqual(openApi.paths["/"].get.responses["200"].schema, {
    $ref: "#/definitions/Pet",
  });
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: {
      kind: { type: "string", description: "Discriminator property for Pet." },
      name: { type: "string" },
      weight: { type: "number", format: "float" },
    },
    required: ["kind", "name"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Cat.allOf, [{ $ref: "#/definitions/Pet" }]);
  deepStrictEqual(openApi.definitions.Dog.allOf, [{ $ref: "#/definitions/Pet" }]);
});

// https://github.com/Azure/typespec-azure/issues/3802
it("referencing a child model keeps the `x-ms-discriminator-value", async () => {
  const openApi = await openApiFor(`
    @discriminator("kind")
    model Pet { }
    model CatCls extends Pet {
      kind: "cat";
      meow: int32;
    }

    op read(): CatCls;
    `);
  ok(openApi.definitions.Pet, "expected definition named Pet");
  ok(openApi.definitions.CatCls, "expected definition named Cat");
  strictEqual(openApi.definitions.CatCls["x-ms-discriminator-value"], "cat");
  deepStrictEqual(openApi.definitions.CatCls.allOf, [{ $ref: "#/definitions/Pet" }]);
});

it("defines discriminated unions with more than one level of inheritance", async () => {
  const openApi = await openApiFor(`
    @discriminator("kind")
    model Pet {
      name: string;
      weight?: float32;
    }
    model Cat extends Pet {
      kind: "cat";
      meow: int32;
    }
    model Dog extends Pet {
      kind: "dog";
      bark: string;
    }
    model Beagle extends Dog {
      purebred: boolean;
    }

    op read(): { @body body: Pet };
    `);
  ok(openApi.definitions.Pet, "expected definition named Pet");
  ok(openApi.definitions.Cat, "expected definition named Cat");
  ok(openApi.definitions.Dog, "expected definition named Dog");
  ok(openApi.definitions.Beagle, "expected definition named Beagle");
  deepStrictEqual(openApi.paths["/"].get.responses["200"].schema, {
    $ref: "#/definitions/Pet",
  });
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: {
      kind: { type: "string", description: "Discriminator property for Pet." },
      name: { type: "string" },
      weight: { type: "number", format: "float" },
    },
    required: ["kind", "name"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Cat.allOf, [{ $ref: "#/definitions/Pet" }]);
  deepStrictEqual(openApi.definitions.Dog.allOf, [{ $ref: "#/definitions/Pet" }]);
  deepStrictEqual(openApi.definitions.Beagle.allOf, [{ $ref: "#/definitions/Dog" }]);
});

it("defines nested discriminated unions", async () => {
  const openApi = await openApiFor(`
    @discriminator("kind")
    model Pet {
      name: string;
      weight?: float32;
    }
    model Cat extends Pet {
      kind: "cat";
      meow: int32;
    }
    @discriminator("breed")
    model Dog extends Pet {
      kind: "dog";
      bark: string;
    }
    #suppress "@typespec/openapi3/discriminator-value" "kind defined in parent"
    model Beagle extends Dog {
      breed: "beagle";
    }
    #suppress "@typespec/openapi3/discriminator-value" "kind defined in parent"
    model Poodle extends Dog {
      breed: "poodle";
    }

    op read(): { @body body: Pet };
    `);
  ok(openApi.definitions.Pet, "expected definition named Pet");
  ok(openApi.definitions.Cat, "expected definition named Cat");
  ok(openApi.definitions.Dog, "expected definition named Dog");
  ok(openApi.definitions.Beagle, "expected definition named Beagle");
  ok(openApi.definitions.Poodle, "expected definition named Poodle");
  deepStrictEqual(openApi.paths["/"].get.responses["200"].schema, {
    $ref: "#/definitions/Pet",
  });
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: {
      kind: { type: "string", description: "Discriminator property for Pet." },
      name: { type: "string" },
      weight: { type: "number", format: "float" },
    },
    required: ["kind", "name"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Dog, {
    type: "object",
    properties: {
      breed: { type: "string", description: "Discriminator property for Dog." },
      bark: { type: "string" },
    },
    required: ["breed", "bark"],
    allOf: [{ $ref: "#/definitions/Pet" }],
    discriminator: "breed",
    "x-ms-discriminator-value": "dog",
  });
  deepStrictEqual(openApi.definitions.Beagle.allOf, [{ $ref: "#/definitions/Dog" }]);
  deepStrictEqual(openApi.definitions.Poodle.allOf, [{ $ref: "#/definitions/Dog" }]);
});

it("defines discriminated union with enum", async () => {
  const openApi = await openApiFor(`
    enum PetKind {cat, dog}
    @discriminator("kind")
    model Pet {
      kind: PetKind;
    }
    model Cat extends Pet {
      kind: PetKind.cat;
      meow: int32;
    }
    model Dog extends Pet {
      kind: PetKind.dog;
      bark: string;
    }
    

    op read(): Pet;
    `);
  ok(openApi.definitions.Pet, "expected definition named Pet");
  ok(openApi.definitions.Cat, "expected definition named Cat");
  ok(openApi.definitions.Dog, "expected definition named Dog");
  deepStrictEqual(openApi.definitions.Pet, {
    type: "object",
    properties: {
      kind: { $ref: "#/definitions/PetKind" },
    },
    required: ["kind"],
    discriminator: "kind",
  });
  deepStrictEqual(openApi.definitions.Cat["x-ms-discriminator-value"], "cat");
  deepStrictEqual(openApi.definitions.Dog["x-ms-discriminator-value"], "dog");
});

describe("discriminator property MUST be required", () => {
  it("force the property as required even if marked optional", async () => {
    const openApi = await openApiFor(`
      @discriminator("kind") model Pet { kind?: string; }

      op read(): Pet;
    `);

    deepStrictEqual(openApi.definitions.Pet.required, ["kind"]);
  });

  it("force it as required in a patch request", async () => {
    const openApi = await openApiFor(`
      @discriminator("kind")
      model Pet { kind: string; }
      model Cat extends Pet { kind: "cat"; meow: int32; }
      model Dog extends Pet { kind: "dog"; bark: string; }

      @patch(#{implicitOptionality: true}) op read(...Pet): Pet;
    `);

    deepStrictEqual(openApi.definitions.PetUpdate.required, ["kind"]);
  });
});

it("issues diagnostics for errors in a discriminated union", async () => {
  const runner = await createAutorestCanonicalTestRunner();
  const diagnostics = await runner.diagnose(
    `
    @discriminator("kind")
    model Pet {
      name: string;
      weight?: float32;
    }
    model Cat extends Pet {
      kind: "cat";
      meow: int32;
    }
    model Dog extends Pet {
      petType: "dog";
      bark: string;
    }
    model Pig extends Pet {
      kind: int32;
      oink: float32;
    }
    model Tiger extends Pet {
      kind?: "tiger";
      claws: float32;
    }
    model Lizard extends Pet {
      kind: string;
      tail: float64;
    }

    #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
    op read(): { @body body: Pet };
    `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "missing-discriminator-property",
      message:
        /Each derived model of a discriminated model type should have set the discriminator property/,
    },
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value should be a string, union of string or string enum but was Scalar.`,
    },
    {
      code: "invalid-discriminator-value",
      message: `The discriminator property must be a required property.`,
    },
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value should be a string, union of string or string enum but was Scalar.`,
    },
  ]);
});

it("issues diagnostics for duplicate discriminator values", async () => {
  const runner = await createAutorestCanonicalTestRunner();
  const diagnostics = await runner.diagnose(
    `
    @discriminator("kind")
    model Pet {
    }
    model Cat extends Pet {
      kind: "cat" | "feline" | "housepet";
      meow: int32;
    }
    model Dog extends Pet {
      kind: "dog" | "housepet";
      bark: string;
    }
    model Beagle extends Pet {
      kind: "dog";
      bark: string;
    }

    #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
    op read(): { @body body: Pet };
    `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value "housepet" is already used in another variant.`,
    },
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value "housepet" is already used in another variant.`,
    },
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value "dog" is already used in another variant.`,
    },
    {
      code: "invalid-discriminator-value",
      message: `Discriminator value "dog" is already used in another variant.`,
    },
  ]);
});
