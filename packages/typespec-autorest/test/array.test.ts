import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { oapiForModel } from "./test-host.js";

describe("typespec-autorest: Array", () => {
  it("defines array inline", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      model Pet { names: string[] };
      `
    );

    ok(res.isRef);
    ok(res.defs.Pet, "expected definition named Pet");
    deepStrictEqual(res.defs.Pet.properties.names, {
      type: "array",
      items: { type: "string" },
    });
  });

  it("define a named array using model is", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      model PetNames is string[] {}
      model Pet { names: PetNames };
      `
    );

    ok(res.isRef);
    ok(res.defs.PetNames, "expected definition named myArray");
    ok(res.defs.Pet, "expected definition named Pet");
    deepStrictEqual(res.defs.PetNames, {
      type: "array",
      items: { type: "string" },
    });
  });

  it("named array applies doc", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      @doc("This is a doc for PetNames")
      model PetNames is string[] {}
      model Pet { names: PetNames };
      `
    );
    deepStrictEqual(res.defs.PetNames.description, "This is a doc for PetNames");
  });

  it("can specify minItems using @minItems decorator", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      model Pet {
        @minItems(1)
        names: string[]
      };
      `
    );

    ok(res.defs.Pet, "expected definition named Pet");
    deepStrictEqual(res.defs.Pet.properties.names, {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    });
  });

  it("can specify maxItems using @maxItems decorator", async () => {
    const res = await oapiForModel(
      "Pet",
      `
      model Pet {
        @maxItems(3)
        names: string[]
      };
      `
    );

    ok(res.defs.Pet, "expected definition named Pet");
    deepStrictEqual(res.defs.Pet.properties.names, {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    });
  });

  it("can specify minItems using @minItems decorator (on array model)", async () => {
    const res = await oapiForModel(
      "Names",
      `
      @minItems(1)
      model Names is string[];
      `
    );

    deepStrictEqual(res.defs.Names, {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    });
  });

  it("can specify maxItems using @maxItems decorator  (on array model)", async () => {
    const res = await oapiForModel(
      "Names",
      `
      @maxItems(3)
      model Names is string[];
      `
    );

    deepStrictEqual(res.defs.Names, {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    });
  });
});
