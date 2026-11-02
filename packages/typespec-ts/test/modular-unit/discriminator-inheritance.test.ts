import {
  type SdkModelPropertyType,
  type SdkModelType,
  UsageFlags,
} from "@azure-tools/typespec-client-generator-core";
import { describe, expect, it } from "vitest";
import { getDirectSubtypes } from "../../src/modular/helpers/type-helpers.js";
import { getAllDiscriminatedValues } from "../../src/modular/serialization/serialize-utils.js";

function model(name: string, options: Partial<SdkModelType> = {}): SdkModelType {
  return {
    kind: "model",
    name,
    isGeneratedName: false,
    isExactName: false,
    namespace: "Test",
    access: "public",
    usage: UsageFlags.Input | UsageFlags.Output,
    properties: [],
    decorators: [],
    apiVersions: [],
    serializationOptions: {},
    crossLanguageDefinitionId: `Test.${name}`,
    ...options,
  };
}

function discriminator(name: string): SdkModelPropertyType {
  return {
    kind: "property",
    name,
    isGeneratedName: false,
    isExactName: false,
    type: {
      kind: "string",
      name: "string",
      decorators: [],
      crossLanguageDefinitionId: "TypeSpec.string",
    },
    discriminator: true,
    optional: false,
    onClient: false,
    isApiVersionParam: false,
    access: "public",
    flatten: false,
    isMultipartFileInput: false,
    serializedName: name,
    serializationOptions: { json: { name } },
    decorators: [],
    apiVersions: [],
    crossLanguageDefinitionId: `Test.${name}`,
  };
}

describe("discriminator inheritance", () => {
  it.each([1, 2])("finds a variant across %i ordinary intermediate models", (depth) => {
    const kind = discriminator("kind");
    const base = model("PetBase", { discriminatorProperty: kind });
    let parent = base;
    for (let i = 0; i < depth; i++) {
      parent = model(`Intermediate${i}`, { baseModel: parent });
    }
    const cat = model("Cat", { baseModel: parent, discriminatorValue: "cat" });
    const dog = model("Dog", { baseModel: base, discriminatorValue: "dog" });
    base.discriminatedSubtypes = { cat, dog };

    expect(getDirectSubtypes(base)).toEqual([cat, dog]);
    expect(getAllDiscriminatedValues(cat, kind)).toEqual(["cat"]);
    expect(getAllDiscriminatedValues(dog, kind)).toEqual(["dog"]);
  });

  it("preserves nested dispatch across ordinary intermediate models", () => {
    const kind = discriminator("kind");
    const breed = discriminator("breed");
    const base = model("PetBase", { discriminatorProperty: kind });
    const mammal = model("Mammal", { baseModel: base });
    const dog = model("Dog", {
      baseModel: mammal,
      discriminatorValue: "dog",
      discriminatorProperty: breed,
    });
    const retriever = model("Retriever", { baseModel: dog });
    const golden = model("Golden", { baseModel: retriever, discriminatorValue: "golden" });
    base.discriminatedSubtypes = { dog, golden };
    dog.discriminatedSubtypes = { golden };

    expect(getDirectSubtypes(base)).toEqual([dog]);
    expect(getDirectSubtypes(dog)).toEqual([golden]);
    expect(getAllDiscriminatedValues(dog, kind)).toEqual(["dog"]);
    expect(getAllDiscriminatedValues(golden, breed)).toEqual(["golden"]);
    expect(getAllDiscriminatedValues(golden, kind)).toEqual([]);
  });

  it("collects descendant values when nested dispatch uses the same property", () => {
    const kind = discriminator("kind");
    const base = model("PetBase", { discriminatorProperty: kind });
    const cat = model("Cat", {
      baseModel: base,
      discriminatorValue: "cat",
      discriminatorProperty: kind,
    });
    const intermediate = model("Intermediate", { baseModel: cat });
    const kitten = model("Kitten", { baseModel: intermediate, discriminatorValue: "kitten" });
    base.discriminatedSubtypes = { cat, kitten };
    cat.discriminatedSubtypes = { kitten };

    expect(getDirectSubtypes(base)).toEqual([cat]);
    expect(getAllDiscriminatedValues(cat, kind)).toEqual(["cat", "kitten"]);
  });

  it("does not select variants outside the requested base hierarchy", () => {
    const base = model("PetBase");
    const unrelated = model("Unrelated", {
      baseModel: model("OtherBase"),
      discriminatorValue: "other",
    });
    base.discriminatedSubtypes = { other: unrelated };

    expect(getDirectSubtypes(base)).toEqual([]);
    expect(getDirectSubtypes(unrelated)).toEqual([]);
    expect(getAllDiscriminatedValues(unrelated, discriminator("kind"))).toEqual([]);
    expect(getAllDiscriminatedValues(base, discriminator("kind"))).toEqual([]);
  });
});
