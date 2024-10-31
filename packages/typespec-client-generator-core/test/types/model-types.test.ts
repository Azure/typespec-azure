import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { isErrorModel } from "@typespec/compiler";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkBodyModelPropertyType, UsageFlags } from "../../src/interfaces.js";
import { isAzureCoreTspModel } from "../../src/internal-utils.js";
import { isAzureCoreModel } from "../../src/public-utils.js";
import { getAllModels } from "../../src/types.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: model types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });
  it("basic", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService {
          model InputModel {
            prop: string
          }

          model OutputModel {
            prop: string
          }

          op test(@body input: InputModel): OutputModel;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InputModel", "OutputModel"].sort());
  });

  it("models in Record", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          op test(@body input: Record<InnerModel>): void;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InnerModel"].sort());
  });

  it("models in Array", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          op test(@body input: InnerModel[]): void;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InnerModel"].sort());
  });

  it("embedded models", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService {
          model InnerModel {
            prop: string
          }

          model InputModel {
            prop: InnerModel
          }

          op test(@body input: InputModel): void;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InputModel", "InnerModel"].sort());
  });

  it("base model", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService {
          model BaseModel {
            prop: string
          }

          model InputModel extends BaseModel {
            prop2: string
          }

          op test(@body input: InputModel): void;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InputModel", "BaseModel"].sort());
  });

  it("derived model", async () => {
    await runner.compileWithBuiltInService(`
      model InputModel {
        prop: string
      }

      model DerivedModel extends InputModel {
        prop2: string
      }

      op test(@body input: DerivedModel): void;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["InputModel", "DerivedModel"].sort());
  });

  it("recursive model", async () => {
    await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      model RecursiveModel {
        prop: RecursiveModel
      }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const recursiveModel = models[0];
    strictEqual(recursiveModel.name, "RecursiveModel");
    strictEqual(recursiveModel.kind, "model");
    strictEqual(recursiveModel.crossLanguageDefinitionId, "TestService.RecursiveModel");
    strictEqual(recursiveModel.properties.length, 1);
    const prop = recursiveModel.properties[0];
    strictEqual(prop.kind, "property");
    strictEqual(prop.name, "prop");
    strictEqual(prop.type.kind, "model");
    strictEqual(prop.type.name, "RecursiveModel");
  });

  it("discriminator model", async () => {
    await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      model Shark extends Fish {
        kind: "shark";
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      model SawShark extends Shark {
        sharktype: "saw";
      }

      model GoblinShark extends Shark {
        sharktype: "goblin";
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 5);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    const kindProperty = fish.properties[0];
    ok(kindProperty);
    strictEqual(kindProperty.name, "kind");
    strictEqual(kindProperty.doc, "Discriminator property for Fish.");
    strictEqual(kindProperty.kind, "property");
    strictEqual(kindProperty.discriminator, true);
    strictEqual(kindProperty.type.kind, "string");
    strictEqual(kindProperty.__raw, undefined);
    strictEqual(fish.discriminatorProperty, kindProperty);
    const shark = models.find((x) => x.name === "Shark");
    ok(shark);
    strictEqual(shark.properties.length, 2);
    const sharktypeProperty = shark.properties[0];
    ok(sharktypeProperty);
    strictEqual(sharktypeProperty.name, "sharktype");
    strictEqual(sharktypeProperty.doc, "Discriminator property for Shark.");
    strictEqual(sharktypeProperty.kind, "property");
    strictEqual(sharktypeProperty.discriminator, true);
    strictEqual(sharktypeProperty.type.kind, "string");
    strictEqual(shark.discriminatorProperty, sharktypeProperty);
  });

  it("handle derived model with discriminator first", async () => {
    await runner.compileWithBuiltInService(`
      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @get
      op getSalmon(): Salmon;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    const kindProperty = fish.properties[0];
    ok(kindProperty);
    strictEqual(kindProperty.name, "kind");
    strictEqual(kindProperty.doc, "Discriminator property for Fish.");
    strictEqual(kindProperty.kind, "property");
    strictEqual(kindProperty.discriminator, true);
    strictEqual(kindProperty.type.kind, "string");
    strictEqual(kindProperty.__raw, undefined);
    strictEqual(fish.discriminatorProperty, kindProperty);

    const salmon = models.find((x) => x.name === "Salmon");
    ok(salmon);
    strictEqual(salmon.properties.length, 4);
    strictEqual(salmon.properties[0].name, "kind");
    strictEqual((salmon.properties[0] as SdkBodyModelPropertyType).discriminator, true);
    strictEqual(salmon.discriminatorValue, "salmon");
  });

  it("single discriminated model", async () => {
    await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    const kindProperty = fish.properties[0];
    ok(kindProperty);
    strictEqual(kindProperty.name, "kind");
    strictEqual(kindProperty.doc, "Discriminator property for Fish.");
    strictEqual(kindProperty.kind, "property");
    strictEqual(kindProperty.discriminator, true);
    strictEqual(kindProperty.type.kind, "string");
    strictEqual(kindProperty.__raw, undefined);
    strictEqual(kindProperty.type.__raw?.kind, "Scalar");
    strictEqual(kindProperty.type.__raw?.name, "string");
    strictEqual(fish.discriminatorProperty, kindProperty);
  });

  it("enum discriminator model", async () => {
    await runner.compileWithBuiltInService(`
      enum DogKind {
        Golden: "golden",
      }

      @discriminator("kind")
      model Dog {
        kind: DogKind;
        weight: int32;
      }

      model Golden extends Dog {
        kind: DogKind.Golden;
      }

      @route("/extensible-enum")
      @get
      op getExtensibleModel(): Dog;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);

    const golden = models.find((x) => x.name === "Golden");
    ok(golden);

    const kind = golden.properties.find(
      (x) => x.kind === "property" && x.serializedName === "kind",
    );
    ok(kind);
    strictEqual(kind.type.kind, "enumvalue");
    strictEqual(kind.type.value, "golden");

    const dog = models.find((x) => x.name === "Dog");
    ok(dog);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const dogKind = runner.context.sdkPackage.enums[0];

    const dogKindProperty = dog.properties.find(
      (x) => x.kind === "property" && x.serializedName === "kind",
    );
    ok(dogKindProperty);
    strictEqual(dogKindProperty.kind, "property");
    strictEqual(dogKindProperty.type, dogKind);
    strictEqual(dog.discriminatorProperty, dogKindProperty);
  });

  it("anonymous model contains template", async () => {
    await runner.compileWithBuiltInService(`

      model Name {
        name: string;
      }
      model ModelTemplate<T> {
        prop: T
      }

      op test(): {prop: ModelTemplate<Name>};
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const modelNames = models.map((model) => model.name).sort();
    deepStrictEqual(modelNames, ["TestResponse", "Name", "ModelTemplateName"].sort());
  });

  it("union to extensible enum values", async () => {
    await runner.compileWithBuiltInService(`
      union PetKind {
        @doc("Cat")
        Cat: "cat",
        @doc("Dog")
        Dog: "dog",
        string,
      }

      @route("/extensible-enum")
      @put
      op putPet(@body petKind: PetKind): void;
      `);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const petKind = runner.context.sdkPackage.enums[0];
    strictEqual(petKind.name, "PetKind");
    strictEqual(petKind.isFixed, false);
    strictEqual(petKind.valueType.kind, "string");
    const values = petKind.values;
    deepStrictEqual(
      values.map((x) => x.name),
      ["Cat", "Dog"],
    );

    const catValue = values.find((x) => x.name === "Cat");
    ok(catValue);
    strictEqual(catValue.value, "cat");
    strictEqual(catValue.doc, "Cat");
    strictEqual(catValue.enumType, petKind);
    strictEqual(catValue.valueType, petKind.valueType);
    strictEqual(catValue.kind, "enumvalue");

    const dogValue = values.find((x) => x.name === "Dog");
    ok(dogValue);
    strictEqual(dogValue.value, "dog");
    strictEqual(dogValue.doc, "Dog");
    strictEqual(dogValue.enumType, petKind);
    strictEqual(dogValue.valueType, petKind.valueType);
    strictEqual(dogValue.kind, "enumvalue");
  });

  it("template variable of anonymous union", async () => {
    await runner.compileWithBuiltInService(`
      interface GetAndSend<Type> {
        get(): {
          prop: Type;
        };
      
        send(prop: Type): void;
      }
      
      @route("/string-extensible")
      interface StringExtensible extends GetAndSend<string | "b" | "c"> {}
      `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 2);
    strictEqual(sdkPackage.enums.length, 1);
    const prop = sdkPackage.enums.find((x) => x.name === "GetResponseProp" && x.isGeneratedName);
    ok(prop);
    strictEqual(prop.isFixed, false);
    strictEqual(prop.valueType.kind, "string");
    const resp = sdkPackage.models.find((x) => x.name === "GetResponse" && x.isGeneratedName);
    ok(resp);
    strictEqual(resp.properties[0].type, prop);
    const req = sdkPackage.models.find((x) => x.name === "SendRequest" && x.isGeneratedName);
    ok(req);
    strictEqual(req.usage, UsageFlags.Spread | UsageFlags.Json);
  });

  it("property of anonymous union as enum", async () => {
    await runner.compileWithBuiltInService(`
      model Pet {
        kind: string | "cat" | "dog";
      }

      @route("/extensible-enum")
      @put
      op putPet(@body pet: Pet): void;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    const pet = models.find((x) => x.name === "Pet");

    const enums = runner.context.sdkPackage.enums;
    const kind = enums.find((x) => x.name === "PetKind");
    ok(pet && kind);
    ok(kind.isGeneratedName);
    const kindProperty = pet.properties.find((x) => (x.name = "kind"));
    ok(kindProperty);
    strictEqual(kindProperty.type, kind);
  });

  it("request/response header with enum value", async () => {
    await runner.compileWithBuiltInService(`
      model RepeatableResponse {
        @visibility("read")
        @header("Repeatability-Result")
        repeatabilityResult?: "accepted" | "rejected";
      }
      op foo(@header("Repeatability-Result") repeatabilityResult?: "accepted" | "rejected"): RepeatableResponse;
      `);
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.models.length, 0);
    strictEqual(sdkPackage.enums.length, 2);
    strictEqual(sdkPackage.enums[0].name, "FooRequestRepeatabilityResult");
    strictEqual(sdkPackage.enums[1].name, "FooResponseRepeatabilityResult");
    deepStrictEqual(
      sdkPackage.enums[0].values.map((x) => x.name),
      ["accepted", "rejected"],
    );
    deepStrictEqual(
      sdkPackage.enums[1].values.map((x) => x.name),
      ["accepted", "rejected"],
    );
  });

  it("enum discriminator model without base discriminator property", async () => {
    await runner.compileWithBuiltInService(`
      enum DogKind {
        Golden: "golden",
      }

      @discriminator("kind")
      model Dog {
        weight: int32;
      }

      model Golden extends Dog {
        kind: DogKind.Golden;
      }

      @route("/extensible-enum")
      @get
      op getExtensibleModel(): Dog;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);

    const golden = models.find((x) => x.name === "Golden");
    ok(golden);

    const kind = golden.properties.find(
      (x) => x.kind === "property" && x.serializedName === "kind",
    );
    ok(kind);
    strictEqual(kind.type.kind, "enumvalue");
    strictEqual(kind.type.value, "golden");

    const dog = models.find((x) => x.name === "Dog");
    ok(dog);
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const dogKind = runner.context.sdkPackage.enums[0];

    const dogKindProperty = dog.properties[0];
    ok(dogKindProperty);
    strictEqual(dogKindProperty.type, dogKind);
    strictEqual(dogKindProperty.doc, "Discriminator property for Dog.");
  });

  it("discriminator", async () => {
    await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        age: int32;
      }

      @discriminator("sharktype")
      model Shark extends Fish {
        kind: "shark";
        sharktype: string;
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      model SawShark extends Shark {
        sharktype: "saw";
      }

      model GoblinShark extends Shark {
        sharktype: "goblin";
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 5);
    const shark = models.find((x) => x.name === "Shark");
    ok(shark);
    strictEqual(shark.properties.length, 2);
    const sharktypeProperty = shark.properties.find((x) => x.name === "sharktype");
    ok(sharktypeProperty);
    strictEqual(sharktypeProperty.kind, "property");
    strictEqual(sharktypeProperty.discriminator, true);
    strictEqual(sharktypeProperty.type.kind, "string");
  });

  it("union discriminator", async () => {
    await runner.compileWithBuiltInService(`
      union KindType {
        string,
        shark: "shark",
        salmon: "salmon"
      };

      @discriminator("kind")
      model Fish {
        age: int32;
      }

      model Shark extends Fish {
        kind: KindType.shark;
        hasFin: boolean;
      }

      model Salmon extends Fish {
        kind: KindType.salmon;
        norweigan: boolean;
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    let kindTypeProperty = fish.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enum");
    strictEqual(kindTypeProperty.type.isUnionAsEnum, true);
    strictEqual(fish.discriminatorProperty, kindTypeProperty);
    const shark = models.find((x) => x.name === "Shark");
    ok(shark);
    strictEqual(shark.discriminatorValue, "shark");
    kindTypeProperty = shark.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enumvalue");
    const salmon = models.find((x) => x.name === "Salmon");
    ok(salmon);
    kindTypeProperty = salmon.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enumvalue");
    strictEqual(salmon.discriminatorValue, "salmon");

    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const kindType = runner.context.sdkPackage.enums.find((x) => x.name === "KindType");
    ok(kindType);
    strictEqual(kindType.isFixed, false);
  });

  it("string discriminator map to enum value", async () => {
    await runner.compileWithBuiltInService(`
      union KindType {
        string,
        shark: "shark",
        salmon: "salmon"
      };

      @discriminator("kind")
      model Fish {
        kind: KindType;
        age: int32;
      }

      model Shark extends Fish {
        kind: "shark";
        hasFin: boolean;
      }

      model Salmon extends Fish {
        kind: "salmon";
        norweigan: boolean;
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    let kindTypeProperty = fish.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enum");
    strictEqual(kindTypeProperty.type.isUnionAsEnum, true);
    strictEqual(fish.discriminatorProperty, kindTypeProperty);
    const shark = models.find((x) => x.name === "Shark");
    ok(shark);
    strictEqual(shark.discriminatorValue, "shark");
    kindTypeProperty = shark.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enumvalue");
    const salmon = models.find((x) => x.name === "Salmon");
    ok(salmon);
    kindTypeProperty = salmon.properties.find((x) => x.name === "kind");
    ok(kindTypeProperty);
    strictEqual(kindTypeProperty.type.kind, "enumvalue");
    strictEqual(salmon.discriminatorValue, "salmon");

    strictEqual(runner.context.sdkPackage.enums.length, 1);
    const kindType = runner.context.sdkPackage.enums.find((x) => x.name === "KindType");
    ok(kindType);
    strictEqual(kindType.isFixed, false);
  });

  it("discriminator rename", async () => {
    await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Fish {
        @clientName("type")
        @encodedName("application/json", "@data.kind")
        kind: string;
        age: int32;
      }

      model Salmon extends Fish {
        kind: "salmon";
        friends?: Fish[];
        hate?: Record<Fish>;
        partner?: Fish;
      }

      @get
      op getModel(): Fish;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const fish = models.find((x) => x.name === "Fish");
    ok(fish);
    strictEqual(fish.properties.length, 2);
    const discriminatorProperty = fish.properties.find((x) => x.name === "type");
    ok(discriminatorProperty);
    strictEqual(discriminatorProperty.kind, "property");
    strictEqual(discriminatorProperty.discriminator, true);
    strictEqual(discriminatorProperty.type.kind, "string");
    strictEqual(discriminatorProperty.serializedName, "@data.kind");
  });

  it("filterOutCoreModels true", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @resource("users")
      @doc("Details about a user.")
      model User {
        @key
        @doc("The user's id.")
        @visibility("read")
        id: int32;

        @doc("The user's name.")
        name: string;
      }

      @doc("Creates or updates a User")
      op createOrUpdate is StandardResourceOperations.ResourceCreateOrUpdate<User>;
      `);
    const models = runner.context.sdkPackage.models.filter((x) => !isAzureCoreModel(x));
    strictEqual(models.length, 1);
    strictEqual(models[0].name, "User");
    strictEqual(models[0].crossLanguageDefinitionId, "My.Service.User");

    for (const [type, sdkType] of runner.context.referencedTypeMap?.entries() ?? []) {
      if (isAzureCoreTspModel(type)) {
        ok(sdkType.usage !== UsageFlags.None);
      }
    }
  });

  it("filterOutCoreModels false", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      "filter-out-core-models": false,
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
        @resource("users")
        @doc("Details about a user.")
        model User {
          @key
          @doc("The user's id.")
          @visibility("read")
          id: int32;

          @doc("The user's name.")
          name: string;
        }

        @doc("Creates or updates a User")
        op createOrUpdate is StandardResourceOperations.ResourceCreateOrUpdate<User>;
      `);
    const models = runner.context.sdkPackage.models.sort((a, b) => a.name.localeCompare(b.name));
    strictEqual(models.length, 4);
    strictEqual(models[0].name, "Error");
    strictEqual(models[0].crossLanguageDefinitionId, "Azure.Core.Foundations.Error");
    strictEqual(models[1].name, "ErrorResponse");
    strictEqual(models[1].crossLanguageDefinitionId, "Azure.Core.Foundations.ErrorResponse");
    strictEqual(models[2].name, "InnerError");
    strictEqual(models[2].crossLanguageDefinitionId, "Azure.Core.Foundations.InnerError");
    strictEqual(models[3].name, "User");
    strictEqual(models[3].crossLanguageDefinitionId, "My.Service.User");
  });

  it("lro core filterOutCoreModels true", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @resource("users")
      @doc("Details about a user.")
      model User {
        @key
        @doc("The user's name.")
        @visibility("read")
        name: string;
      }

      @doc("Gets status.")
      op getStatus is StandardResourceOperations.GetResourceOperationStatus<User>;

      @doc("Polls status.")
      @pollingOperation(My.Service.getStatus)
      op createOrUpdateUser is StandardResourceOperations.LongRunningResourceCreateOrUpdate<User>;
      `);
    const models = runner.context.sdkPackage.models.filter((x) => !isAzureCoreModel(x));
    strictEqual(models.length, 1);
    strictEqual(models[0].name, "User");
    strictEqual(models[0].crossLanguageDefinitionId, "My.Service.User");
  });

  it("lro core filterOutCoreModels false", async () => {
    runner = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      "filter-out-core-models": false,
      emitterName: "@azure-tools/typespec-java",
    });
    await runner.compileWithBuiltInAzureCoreService(`
      @resource("users")
      @doc("Details about a user.")
      model User {
        @key
        @doc("The user's name.")
        @visibility("read")
        name: string;
      }

      @doc("Gets status.")
      op getStatus is StandardResourceOperations.GetResourceOperationStatus<User>;

      @doc("Polls status.")
      @pollingOperation(My.Service.getStatus)
      op createOrUpdateUser is StandardResourceOperations.LongRunningResourceCreateOrUpdate<User>;
      `);
    const models = runner.context.sdkPackage.models.sort((a, b) => a.name.localeCompare(b.name));
    strictEqual(models.length, 5);
    strictEqual(models[0].name, "Error");
    strictEqual(models[0].crossLanguageDefinitionId, "Azure.Core.Foundations.Error");
    strictEqual(models[1].name, "ErrorResponse");
    strictEqual(models[1].crossLanguageDefinitionId, "Azure.Core.Foundations.ErrorResponse");
    strictEqual(models[2].name, "InnerError");
    strictEqual(models[2].crossLanguageDefinitionId, "Azure.Core.Foundations.InnerError");
    strictEqual(models[3].name, "ResourceOperationStatusUserUserError");
    strictEqual(models[3].crossLanguageDefinitionId, "Azure.Core.ResourceOperationStatus");
    strictEqual(models[4].name, "User");
    strictEqual(models[4].crossLanguageDefinitionId, "My.Service.User");
    strictEqual(runner.context.sdkPackage.enums.length, 1);
    strictEqual(runner.context.sdkPackage.enums[0].name, "OperationState");
  });

  it("model with core property", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compileWithBuiltInAzureCoreService(`
      @usage(Usage.input)
      model MyError {
        innerError: Azure.Core.Foundations.Error;
      }
      `);
    const models = runnerWithCore.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const myError = models.find((x) => x.name === "MyError");
    ok(myError);

    const azureError = models.find((x) => x.name === "Error");
    ok(azureError);
    strictEqual(isAzureCoreModel(azureError), true);

    const azureInnerError = models.find((x) => x.name === "InnerError");
    ok(azureInnerError);
    strictEqual(isAzureCoreModel(azureInnerError), true);

    strictEqual(myError.properties.length, 1);
    strictEqual(myError.properties[0].type, azureError);
  });
  it("no models filter core", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 0);
  });
  it("no models don't filter core", async () => {
    await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 0);
  });
  it("input usage", async () => {
    await runner.compileWithBuiltInService(`
        model InputModel {
          prop: string
        }
        op operation(@body input: InputModel): void;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(models.filter((x) => (x.usage & UsageFlags.Input) > 0).length, 1);
    strictEqual(models.filter((x) => (x.usage & UsageFlags.Output) > 0).length, 0);
  });

  it("output usage", async () => {
    await runner.compileWithBuiltInService(`
        model OutputModel {
          prop: string
        }
        op operation(): OutputModel;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage, UsageFlags.Output | UsageFlags.Json);

    strictEqual(models.filter((x) => (x.usage & UsageFlags.Output) > 0).length, 1);
    strictEqual(models.filter((x) => (x.usage & UsageFlags.Input) > 0).length, 0);
  });

  it("roundtrip usage", async () => {
    await runner.compileWithBuiltInService(`
        model RoundtripModel {
          prop: string
        }
        op operation(@body input: RoundtripModel): RoundtripModel;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);

    strictEqual(models.filter((x) => (x.usage & UsageFlags.Output) > 0).length, 1);
    strictEqual(models.filter((x) => (x.usage & UsageFlags.Input) > 0).length, 1);
    strictEqual(models.filter((x) => x.usage === UsageFlags.None).length, 0);
  });

  it("readonly usage", async () => {
    await runner.compileWithBuiltInService(`
        model ResultModel {
          name: string;
        }
      
        model RoundTripModel {
          @visibility("read")
          result: ResultModel;
        }
      
        @route("/modelInReadOnlyProperty")
        @put
        op modelInReadOnlyProperty(@body body: RoundTripModel): {
          @body body: RoundTripModel;
        };
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(
      models.find((x) => x.name === "RoundTripModel")?.usage,
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(
      models.find((x) => x.name === "ResultModel")?.usage,
      UsageFlags.Output | UsageFlags.Json,
    );
  });

  it("usage propagation", async () => {
    await runner.compileWithBuiltInService(`
        @discriminator("kind")
        model Fish {
          age: int32;
        }

        @discriminator("sharktype")
        model Shark extends Fish {
          kind: "shark";
        }

        model Salmon extends Fish {
          kind: "salmon";
          friends?: Fish[];
          hate?: Record<Fish>;
          partner?: Fish;
        }

        model SawShark extends Shark {
          sharktype: "saw";
        }

        model GoblinShark extends Shark {
          sharktype: "goblin";
        }
        op operation(@body input: Shark): Shark;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 4);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
    ok(!(models[0].usage & UsageFlags.Error));
  });

  it("usage propagation from subtype", async () => {
    await runner.compileWithBuiltInService(`
        @discriminator("kind")
        model Fish {
          age: int32;
        }

        @discriminator("sharktype")
        model Shark extends Fish {
          kind: "shark";
        }

        model Salmon extends Fish {
          kind: "salmon";
          friends?: Fish[];
          hate?: Record<Fish>;
          partner?: Fish;
        }

        model SawShark extends Shark {
          sharktype: "saw";
        }

        model GoblinShark extends Shark {
          sharktype: "goblin";
        }
        op operation(@body input: Salmon): Salmon;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  });

  it("usage propagation from subtype of type with another discriminated property", async () => {
    await runner.compileWithBuiltInService(`
        @discriminator("kind")
        model Fish {
          age: int32;
          food: Food;
        }

        @discriminator("sharktype")
        model Shark extends Fish {
          kind: "shark";
        }

        @discriminator("kind")
        model Food {
          kind: string;
        }

        model Salmon extends Fish {
          kind: "salmon";
          friends?: Fish[];
        }

        model Fruit extends Food {
          kind: "fruit";
        }

        model Meet extends Food {
          kind: "meet";
        }
        op operation(@body input: Salmon): Salmon;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 5);
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  });

  it("unnamed model", async () => {
    await runner.compileWithBuiltInService(`
        model Test {
          prop1: {innerProp1: string};
          prop2: {innerProp2: string};
        }
        op func(
          @body body: Test
        ): void;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 3);
    const propreties: string[] = [];
    models.forEach((model) => {
      model.properties.forEach((prop) => {
        propreties.push(prop.name);
      });
    });
    propreties.sort();
    deepStrictEqual(propreties, ["innerProp1", "innerProp2", "prop1", "prop2"]);
  });
  it("model access transitive closure", async () => {
    await runner.compileWithBuiltInService(`
        model Test {
          prop: string;
        }
        @access(Access.internal)
        op func(
          @body body: Test
        ): void;
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].access, "internal");
  });

  it("complicated access transitive closure", async () => {
    await runner.compileWithBuiltInService(`
        model Test1 {
          prop: Test2;
        }
        model Test2 {
          prop: string;
        }
        @access(Access.internal)
        @route("/func1")
        op func1(
          @body body: Test1
        ): void;

        model Test3 {
          prop: string;
        }

        @access(Access.internal)
        @route("/func2")
        op func2(
          @body body: Test3
        ): void;

        @route("/func3")
        op func3(
          @body body: Test3
        ): void;

        model Test4 {
          prop: Test5;
        }

        model Test5 {
          prop: Test6;
        }

        model Test6 {
          prop: string;
        }

        @access(Access.internal)
        @route("/func4")
        op func4(
          @body body: Test4
        ): void;

        @route("/func5")
        op func5(
          @body body: Test6
        ): void;
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 6);

    const Test1 = models.find((x) => x.name === "Test1");
    ok(Test1);
    strictEqual(Test1.access, "internal");

    const Test2 = models.find((x) => x.name === "Test2");
    ok(Test2);
    strictEqual(Test2.access, "internal");

    const Test3 = models.find((x) => x.name === "Test3");
    ok(Test3);
    strictEqual(Test3.access, "public");

    const Test4 = models.find((x) => x.name === "Test4");
    ok(Test4);
    strictEqual(Test4.access, "internal");

    const Test5 = models.find((x) => x.name === "Test5");
    ok(Test5);
    strictEqual(Test5.access, "internal");

    const Test6 = models.find((x) => x.name === "Test6");
    ok(Test6);
    strictEqual(Test6.access, "public");
  });
  it("additionalProperties of same type", async () => {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model AdditionalPropertiesModel extends Record<string> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        model AdditionalPropertiesModel2 is Record<unknown> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        model AdditionalPropertiesModel3 {
          prop: string;
          ...Record<string>;
        }
        @usage(Usage.input | Usage.output)
        model NoAdditionalPropertiesModel {
          prop: string;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 4);
    const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
    const AdditionalPropertiesModel2 = models.find((x) => x.name === "AdditionalPropertiesModel2");
    const AdditionalPropertiesModel3 = models.find((x) => x.name === "AdditionalPropertiesModel3");
    const NonAdditionalPropertiesModel = models.find(
      (x) => x.name === "NoAdditionalPropertiesModel",
    );
    ok(
      AdditionalPropertiesModel &&
        AdditionalPropertiesModel2 &&
        AdditionalPropertiesModel3 &&
        NonAdditionalPropertiesModel,
    );
    strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "string");
    strictEqual(AdditionalPropertiesModel.baseModel, undefined);
    strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "unknown");
    strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
    strictEqual(AdditionalPropertiesModel3.additionalProperties?.kind, "string");
    strictEqual(AdditionalPropertiesModel3.baseModel, undefined);
    strictEqual(NonAdditionalPropertiesModel.additionalProperties, undefined);
  });

  it("additionalProperties usage", async () => {
    await runner.compileWithBuiltInService(`
        @service({})
        namespace MyService {
          model AdditionalPropertiesModel extends Record<Test> {
          }
  
          model AdditionalPropertiesModel2 is Record<Test> {
          }

          model AdditionalPropertiesModel3 {
            ...Record<Test2>;
          }

          model Test {
          }

          model Test2 {
          }

          @route("test")
          op test(@body input: AdditionalPropertiesModel): AdditionalPropertiesModel2;
          @route("test2")
          op test2(@body input: AdditionalPropertiesModel3): AdditionalPropertiesModel3;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 5);
    const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
    const AdditionalPropertiesModel2 = models.find((x) => x.name === "AdditionalPropertiesModel2");
    const AdditionalPropertiesModel3 = models.find((x) => x.name === "AdditionalPropertiesModel3");
    const Test = models.find((x) => x.name === "Test");
    const Test2 = models.find((x) => x.name === "Test2");
    ok(
      AdditionalPropertiesModel &&
        AdditionalPropertiesModel2 &&
        AdditionalPropertiesModel3 &&
        Test &&
        Test2,
    );

    strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "model");
    strictEqual(AdditionalPropertiesModel.baseModel, undefined);
    strictEqual(AdditionalPropertiesModel.usage, UsageFlags.Input | UsageFlags.Json);
    strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "model");
    strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
    strictEqual(AdditionalPropertiesModel2.usage, UsageFlags.Output | UsageFlags.Json);
    strictEqual(AdditionalPropertiesModel3.additionalProperties?.kind, "model");
    strictEqual(AdditionalPropertiesModel3.baseModel, undefined);
    strictEqual(
      AdditionalPropertiesModel3.usage,
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json,
    );
    strictEqual(Test.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
    strictEqual(Test2.usage, UsageFlags.Input | UsageFlags.Output | UsageFlags.Json);
  });

  it("additionalProperties of different types", async () => {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model AdditionalPropertiesModel {
          prop: string;
          ...Record<float32>;
        }

        @usage(Usage.input | Usage.output)
        model AdditionalPropertiesModel2 {
          prop: string;
          ...Record<boolean | float32>;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
    const AdditionalPropertiesModel2 = models.find((x) => x.name === "AdditionalPropertiesModel2");
    ok(AdditionalPropertiesModel && AdditionalPropertiesModel2);
    strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "float32");
    strictEqual(AdditionalPropertiesModel.baseModel, undefined);
    strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "union");
    strictEqual(AdditionalPropertiesModel2.additionalProperties?.variantTypes[0].kind, "boolean");
    strictEqual(AdditionalPropertiesModel2.additionalProperties?.variantTypes[1].kind, "float32");
    strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
  });

  it("crossLanguageDefinitionId", async () => {
    await runner.compile(`
        @service({})
        namespace MyService {
          @usage(Usage.input)
          model InputModel {}

          @usage(Usage.output)
          model OutputModel {}
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const inputModel = models.find((x) => x.name === "InputModel");
    ok(inputModel);
    strictEqual(inputModel.crossLanguageDefinitionId, "MyService.InputModel");
    const outputModel = models.find((x) => x.name === "OutputModel");
    ok(outputModel);
    strictEqual(outputModel.crossLanguageDefinitionId, "MyService.OutputModel");
  });

  it("template model", async () => {
    await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        model Catalog is TrackedResource<CatalogProperties> {
          @pattern("^[A-Za-z0-9_-]{1,50}$")
          @key("catalogName")
          @segment("catalogs")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        model CatalogProperties {
          test?: string;
        }

        model TrackedResource<TProperties extends {}> {
          properties?: TProperties;
        }

        @usage(Usage.input | Usage.output)
        model Deployment is TrackedResource<DeploymentProperties> {
          @key("deploymentName")
          @segment("deployments")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        model DeploymentProperties {
          deploymentId?: string;
          deploymentDateUtc?: utcDateTime;
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 4);
    const catalog = models.find((x) => x.name === "Catalog");
    const deployment = models.find((x) => x.name === "Deployment");
    ok(catalog && deployment);
    strictEqual(catalog.properties.length, 2);
    strictEqual(deployment.properties.length, 2);
  });
  it("model with deprecated annotation", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        #deprecated "no longer support"
        model Test {
        }
        op func(
          @body body: Test
        ): void;
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].deprecation, "no longer support");
  });

  it("orphan model", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          model Model1{}

          model Model2{}
        }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].name, "Model1");
    strictEqual(models[0].crossLanguageDefinitionId, "MyService.Model1");
    strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
  });

  it("model with client hierarchy", async () => {
    await runner.compile(`
        @service({})
        namespace Test1Client {
          model T1 {
            prop: string;
          }
          model T2 {
            prop: string;
          }
          @route("/b")
          namespace B {
            op x(): void;

            @route("/c")
            interface C {
              op y(): T1;
            }

            @route("/d")
            namespace D {
              op z(@body body: T2): void;
            }
          }
        }
      `);
    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
  });
  it("error model", async () => {
    await runner.compileWithBuiltInService(`
        @error
        model ApiError {
          code: string;
        }

        op test(): ApiError;
      `);
    const models = getAllModels(runner.context);
    strictEqual(models.length, 1);
    strictEqual(models[0].kind, "model");
    ok(models[0].usage & UsageFlags.Error);

    const model = models[0];
    const rawModel = model.__raw;
    ok(rawModel);
    strictEqual(rawModel.kind, "Model");
    strictEqual(isErrorModel(runner.context.program, rawModel), true);
    ok(model.usage & UsageFlags.Output);
    ok(model.usage & UsageFlags.Error);
  });

  it("error model inheritance", async () => {
    await runner.compileWithBuiltInService(`
        model ValidResponse {
          prop: string;
        };

        @error
        model ApiError {
          code: string
        };

        model FourHundredError extends ApiError {
          @statusCode
          @minValue(400)
          @maxValue(499)
          statusCode: int32;
        };
        model FourZeroFourError extends FourHundredError {
          @statusCode
          statusCode: 404;
        };
        model FiveHundredError extends ApiError {
          @statusCode
          @minValue(500)
          @maxValue(599)
          statusCode: int32;
        };

        op test(): ValidResponse | FourZeroFourError | FiveHundredError;
      `);
    const models = getAllModels(runner.context);
    strictEqual(models.length, 5);
    const errorModels = models.filter(
      (x) => x.kind === "model" && (x.usage & UsageFlags.Error) > 0,
    );
    deepStrictEqual(errorModels.map((x) => x.name).sort(), [
      "ApiError",
      "FiveHundredError",
      "FourHundredError",
      "FourZeroFourError",
    ]);
    const validModel = models.filter(
      (x) => x.kind === "model" && (x.usage & UsageFlags.Error) === 0,
    );
    deepStrictEqual(
      validModel.map((x) => x.name),
      ["ValidResponse"],
    );
  });

  it("never or void property", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          model Test{
            prop1: never;
            prop2: void;
          }
        }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 1);
    strictEqual(models[0].name, "Test");
    strictEqual(models[0].properties.length, 0);
  });

  it("xml usage", async () => {
    await runner.compileAndDiagnose(`
        @service({})
        namespace MyService {
          model RoundTrip {
            prop: string;
          }

          model Input {
            prop: string;
          }

          @route("/test1")
          op test1(@header("content-type") contentType: "application/xml", @body body: RoundTrip): RoundTrip;
          
          @route("/test2")
          op test2(@header("content-type") contentType: "application/xml", @body body: Input): void;
        }
      `);

    const models = runner.context.sdkPackage.models;
    strictEqual(models.length, 2);
    const roundTripModel = models.find((x) => x.name === "RoundTrip");
    const inputModel = models.find((x) => x.name === "Input");
    ok(roundTripModel);
    strictEqual(
      roundTripModel.usage,
      UsageFlags.Input | UsageFlags.Output | UsageFlags.Json | UsageFlags.Xml,
    );

    ok(inputModel);
    strictEqual(inputModel.usage, UsageFlags.Input | UsageFlags.Xml);
  });

  it("check bodyParam for @multipartBody", async function () {
    await runner.compileWithBuiltInService(`
        model Address {
          city: string;
        }
        model MultiPartRequest{
          id?: HttpPart<string>;
          profileImage: HttpPart<bytes>;
          address: HttpPart<Address>;
          picture: HttpPart<File>;
        }
        @post
        op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
        `);
    const formDataMethod = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(formDataMethod.kind, "basic");
    strictEqual(formDataMethod.name, "upload");
    strictEqual(formDataMethod.parameters.length, 2);

    strictEqual(formDataMethod.parameters[0].name, "contentType");
    strictEqual(formDataMethod.parameters[0].type.kind, "constant");
    strictEqual(formDataMethod.parameters[0].type.value, "multipart/form-data");

    strictEqual(formDataMethod.parameters[1].name, "body");
    strictEqual(formDataMethod.parameters[1].type.kind, "model");
    strictEqual(formDataMethod.parameters[1].type.name, "MultiPartRequest");

    const formDataOp = formDataMethod.operation;
    strictEqual(formDataOp.parameters.length, 1);
    ok(formDataOp.parameters.find((x) => x.name === "contentType" && x.kind === "header"));

    const formDataBodyParam = formDataOp.bodyParam;
    ok(formDataBodyParam);
    strictEqual(formDataBodyParam.type.kind, "model");
    strictEqual(formDataBodyParam.type.name, "MultiPartRequest");
    strictEqual(formDataBodyParam.correspondingMethodParams.length, 1);
    strictEqual(formDataBodyParam.type.properties.length, 4);
    strictEqual(formDataBodyParam.type.properties[0].name, "id");
    strictEqual(formDataBodyParam.type.properties[0].type.kind, "string");
    strictEqual(formDataBodyParam.type.properties[1].name, "profileImage");
    strictEqual(formDataBodyParam.type.properties[1].type.kind, "bytes");
    strictEqual(formDataBodyParam.type.properties[2].name, "address");
    strictEqual(formDataBodyParam.type.properties[2].type.kind, "model");
    strictEqual(formDataBodyParam.type.properties[2].type.name, "Address");
    strictEqual(formDataBodyParam.type.properties[3].name, "picture");
    strictEqual(formDataBodyParam.type.properties[3].type.kind, "model");
    strictEqual(formDataBodyParam.type.properties[3].type.name, "File");
  });

  it("check multipartOptions for property of base model", async function () {
    await runner.compileWithBuiltInService(`
      model MultiPartRequest{
          fileProperty: HttpPart<File>;
      }
      @post
      op upload(@header contentType: "multipart/form-data", @multipartBody body: MultiPartRequest): void;
      `);
    const models = runner.context.sdkPackage.models;
    const fileModel = models.find((x) => x.name === "File");
    ok(fileModel);
    for (const p of fileModel.properties) {
      strictEqual(p.kind, "property");
      strictEqual(p.isMultipartFileInput, false);
      strictEqual(p.multipartOptions, undefined);
    }
  });
});
