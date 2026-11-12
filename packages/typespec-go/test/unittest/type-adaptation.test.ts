// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Recursive type adaptation", () => {
  it.each([
    { type: "Pet[]", helper: "Array" },
    { type: "Record<Pet>", helper: "Map" },
    { type: "Record<Pet[]>", helper: "ArrayMap" },
    {
      type: "Pet[]",
      helper: "Array",
      models:
        '@discriminator("kind") model Pet { kind: string; } model Cat extends Pet { kind: "cat"; name: string; }',
    },
  ])(
    "decodes a fake $type request using discriminator helpers",
    async ({ type, helper, models }) => {
      const files = await emitGoFor(
        `
      @service namespace Test;
      ${models ?? "model Cat { name: string; } @discriminated union Pet { cat: Cat }"}
      @route("/pets") @post op put(@body body: ${type}): void;
    `,
        { "generate-fakes": true },
      );
      const server = files.get("fake/zz_test_server.go")!;
      expect(server).toContain("raw, err := readRequestBody(req)");
      expect(server).toContain(`body, err := unmarshalPetClassification${helper}(raw)`);
      const helpers = files.get("fake/zz_polymorphic_helpers.go")!;
      expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
      expect(helpers).toContain("func unmarshalPetClassification(");
    },
  );

  it.each([
    { type: "Pet[]", declaration: "PetArray []PetClassification", helper: "Array" },
    { type: "Record<Pet>", declaration: "Value map[string]PetClassification", helper: "Map" },
  ])(
    "decodes a top-level $type response using discriminator helpers",
    async ({ type, declaration, helper }) => {
      const files = await emitGoFor(`
      @service namespace Test;
      model Cat { name: string; }
      @discriminated union Pet { cat: Cat }
      @route("/pets") @get op list(): ${type};
    `);
      expect(files.get("zz_responses.go")).toContain(declaration);
      const client = [...files].find(([name]) => name.endsWith("_client.go"))?.[1];
      expect(client).toContain("body, err := runtime.Payload(resp)");
      expect(client).toContain(`, err = unmarshalPetClassification${helper}(body)`);
      const helpers = files.get("zz_polymorphic_helpers.go")!;
      expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
      expect(helpers).toContain("func unmarshalPetClassification(");
    },
  );

  it.each([
    { type: "Pet[][]", helper: "ArrayArray", inner: "Array" },
    { type: "Record<Pet[]>", helper: "ArrayMap", inner: "Array" },
    { type: "Record<Pet>[]", helper: "MapArray", inner: "Map" },
    { type: "Record<Record<Pet>>", helper: "MapMap", inner: "Map" },
  ])("decodes a nested $type response", async ({ type, helper, inner }) => {
    const files = await emitGoFor(`
      @service namespace Test;
      model Cat { name: string; }
      @discriminated union Pet { cat: Cat }
      @route("/pets") @get op list(): ${type};
    `);
    const client = files.get("zz_test_client.go")!;
    expect(client).toContain(`, err = unmarshalPetClassification${helper}(body)`);
    const helpers = files.get("zz_polymorphic_helpers.go")!;
    expect(helpers).toContain(`func unmarshalPetClassification${helper}(`);
    expect(helpers).toContain(`f, err := unmarshalPetClassification${inner}(rawMessage)`);
    expect(helpers).toContain(`func unmarshalPetClassification${inner}(`);
    expect(helpers).toContain("func unmarshalPetClassification(");
  });

  it.each([
    { modelName: "PetCat", unionFirst: false, kind: "variant type" },
    { modelName: "PetCat", unionFirst: true, kind: "variant type" },
    { modelName: "PetClassification", unionFirst: false, kind: "interface" },
    { modelName: "PetClassification", unionFirst: true, kind: "interface" },
  ])(
    "rejects a model named $modelName colliding with a discriminated union (union first: $unionFirst)",
    async ({ modelName, unionFirst, kind }) => {
      const modelOperation = `@route("/model") @get op getModel(): ${modelName};`;
      const unionOperation = '@route("/pet") @get op getPet(): Pet;';
      await expect(
        emitGoFor(`
          @service namespace Test;
          model Cat { meow: boolean; }
          model ${modelName} { value: string; }
          @discriminated union Pet { cat: Cat }
          ${unionFirst ? unionOperation + modelOperation : modelOperation + unionOperation}
        `),
      ).rejects.toThrow(`duplicate discriminated union ${kind} name ${modelName}`);
    },
  );

  it("retains fields on mutually recursive models and union variants", async () => {
    const files = await emitGoFor(`
      @service namespace Test;
      model First { second?: Second; }
      model Second { first?: First; value?: Value; }
      union Value { First, string }
      @route("/value") @post op roundTrip(@body body: First): First;
    `);
    const models = files.get("zz_models.go")!;
    expect(models).toContain("Second *Second");
    expect(models).toContain("First *First");
    expect(models).toContain("Value *Value");
    const unions = files.get("zz_unions.go")!;
    expect(unions).toContain("First *First");
    expect(unions).toContain("String *string");
    expect(files.get("zz_models_serde.go")).toContain('populate(objectMap, "value", s.Value)');
    expect(files.get("zz_unions_serde.go")).toContain("json.Unmarshal(data, &v.First)");
  });

  it.each(["Owner", "Pet", "Cat"])(
    "completes mutually recursive discriminator hierarchies reached through %s",
    async (response) => {
      const files = await emitGoFor(`
        @service namespace Test;
        @discriminator("kind")
        model Pet { kind: string; owner?: Owner; related?: Pet; }
        @discriminator("species")
        model Mammal { species: string; pet?: Pet; }
        model Cat extends Pet { kind: "cat"; }
        model Dog extends Mammal { species: "dog"; }
        model Owner { pet?: Pet; favorite?: Mammal; }
        @route("/pets") @get op getPet(): ${response};
      `);
      const interfaces = files.get("zz_interfaces.go")!;
      expect(interfaces).toContain("type PetClassification interface");
      expect(interfaces).toContain("type MammalClassification interface");
      expect(interfaces).toContain("GetPet() *Pet");
      expect(interfaces).toContain("GetMammal() *Mammal");
      const models = files.get("zz_models.go")!;
      expect(models).toContain("Owner *Owner");
      expect(models).toContain("Related PetClassification");
      expect(models).toContain("Favorite MammalClassification");
      const polymorphics = files.get("zz_polymorphic_helpers.go")!;
      expect(polymorphics).toContain('case "dog":');
      expect(polymorphics).toContain('case "cat":');
    },
  );
});
