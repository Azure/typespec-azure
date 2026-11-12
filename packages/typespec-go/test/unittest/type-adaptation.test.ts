// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License. See License.txt in the project root for license information.

import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

describe("Recursive type adaptation", () => {
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
