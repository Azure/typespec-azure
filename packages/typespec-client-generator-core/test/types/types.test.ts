/* eslint-disable deprecation/deprecation */
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Enum, Model, Union } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepEqual, deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkArrayType,
  SdkBodyModelPropertyType,
  SdkEnumType,
  SdkModelType,
  SdkUnionType,
  UsageFlags,
} from "../../src/interfaces.js";
import { isErrorOrChildOfError } from "../../src/public-utils.js";
import {
  getAllModels,
  getAllModelsWithDiagnostics,
  getClientType,
  getSdkEnum,
  isReadOnly,
} from "../../src/types.js";
import {
  SdkTestRunner,
  createSdkTestRunner,
  createTcgcTestRunnerForEmitter,
} from "../test-host.js";
import { getSdkBodyModelPropertyTypeHelper, getSdkTypeHelper } from "./utils.js";

describe("typespec-client-generator-core: types", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
  });

  describe("SdkBodyModelPropertyType", () => {
    it("required", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: string | int32;
        }
      `);
      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(prop.optional, false);
      strictEqual(isReadOnly(prop), false);
    });
    it("optional", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name?: string;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(prop.optional, true);
    });
    it("readonly", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @visibility("read")
          name?: string;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(isReadOnly(prop), true);
    });
    it("not readonly", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @visibility("read", "create", "update")
          name?: string;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(isReadOnly(prop), false);
    });
    it("names", async function () {
      await runner.compileWithBuiltInService(`
        #suppress "deprecated" "for testing"
        @test
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        @projectedName("java", "JavaTest")
        model Test {
          @projectedName("java", "javaProjectedName")
          javaWireName: string;
          @projectedName("client", "clientName")
          clientProjectedName: string;
          #suppress "deprecated" "for testing"
          @projectedName("json", "projectedWireName")
          @encodedName("application/json", "encodedWireName")
          jsonEncodedAndProjectedName: string;
          #suppress "deprecated" "for testing"
          @projectedName("json", "realWireName")
          jsonProjectedName: string; // deprecated
          regular: string;
        }
      `);

      const sdkModel = runner.context.experimental_sdkPackage.models[0];
      strictEqual(sdkModel.name, "JavaTest");

      // Java projected name test
      const javaProjectedProp = sdkModel.properties.find((x) => x.name === "javaProjectedName");
      ok(javaProjectedProp);
      strictEqual(javaProjectedProp.kind, "property");
      strictEqual(javaProjectedProp.serializedName, "javaWireName");

      // client projected name test

      const clientProjectedProp = sdkModel.properties.find((x) => x.name === "clientName");
      ok(clientProjectedProp);
      strictEqual(clientProjectedProp.kind, "property");
      strictEqual(clientProjectedProp.serializedName, "clientProjectedName");

      // wire name test with encoded and projected
      const jsonEncodedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "encodedWireName"
      );
      ok(jsonEncodedProp);
      strictEqual(jsonEncodedProp.nameInClient, "jsonEncodedAndProjectedName");
      strictEqual(jsonEncodedProp.name, "jsonEncodedAndProjectedName");

      // wire name test with deprecated projected
      const jsonProjectedProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "realWireName"
      );
      ok(jsonProjectedProp);
      strictEqual(jsonProjectedProp.nameInClient, "jsonProjectedName");
      strictEqual(jsonProjectedProp.name, "jsonProjectedName");

      // regular
      const regularProp = sdkModel.properties.find(
        (x) => x.kind === "property" && x.serializedName === "regular"
      );
      ok(regularProp);
      strictEqual(regularProp.nameInClient, "regular");
      strictEqual(regularProp.name, "regular");
    });
    it("union type", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          name: string | int32;
        }
      `);

      const prop = getSdkBodyModelPropertyTypeHelper(runner);
      strictEqual(prop.kind, "property");
      const sdkType = prop.type;
      strictEqual(sdkType.kind, "union");
      const values = sdkType.values;
      strictEqual(values.length, 2);
      strictEqual(values[0].kind, "string");
      strictEqual(values[1].kind, "int32");
    });
    it("versioning", async function () {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "all",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
        @versioned(Versions)
        @service({title: "Widget Service"})
        namespace DemoService;

        enum Versions {
          v1,
          v2,
          v3,
          v4,
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @added(Versions.v1)
          @removed(Versions.v2)
          @added(Versions.v3)
          versionedProp: string;

          nonVersionedProp: string;

          @removed(Versions.v3)
          removedProp: string;
        }
      `);
      const sdkModel = runnerWithVersion.context.experimental_sdkPackage.models.find(
        (x) => x.kind === "model"
      );
      ok(sdkModel);
      strictEqual(sdkModel.kind, "model");

      const versionedProp = sdkModel.properties[0];
      deepStrictEqual(versionedProp.apiVersions, ["v1", "v3", "v4"]);

      const nonVersionedProp = sdkModel.properties[1];
      deepStrictEqual(nonVersionedProp.apiVersions, ["v1", "v2", "v3", "v4"]);

      const removedProp = sdkModel.properties[2];
      deepStrictEqual(removedProp.apiVersions, ["v1", "v2"]);
    });
  });
  describe("SdkConstantType", () => {
    it("string", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          prop: "json";
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "constant");
      strictEqual(sdkType.valueType.kind, "string");
      strictEqual(sdkType.value, "json");
      strictEqual(sdkType.name, "TestProp");
      strictEqual(sdkType.isGeneratedName, true);
    });
    it("boolean", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @test prop: true;
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "constant");
      strictEqual(sdkType.valueType.kind, "boolean");
      strictEqual(sdkType.value, true);
      strictEqual(sdkType.name, "TestProp");
      strictEqual(sdkType.isGeneratedName, true);
    });
    it("number", async function () {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Test {
          @test prop: 4;
        }
      `);

      const sdkType = getSdkTypeHelper(runner);
      strictEqual(sdkType.kind, "constant");
      strictEqual(sdkType.valueType.kind, "int32");
      strictEqual(sdkType.value, 4);
      strictEqual(sdkType.name, "TestProp");
      strictEqual(sdkType.isGeneratedName, true);
    });
  });
  describe("SdkModelType", () => {
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["InputModel", "DerivedModel"].sort());
    });

    it("recursive model", async () => {
      await runner.compileWithBuiltInService(`
      @usage(Usage.input | Usage.output)
      @access(Access.public)
      model RecursiveModel {
        prop: RecursiveModel
      }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const recursiveModel = models[0];
      strictEqual(recursiveModel.name, "RecursiveModel");
      strictEqual(recursiveModel.kind, "model");
      strictEqual(recursiveModel.properties.length, 1);
      const prop = recursiveModel.properties[0];
      strictEqual(prop.kind, "property");
      strictEqual(prop.nameInClient, "prop");
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      const kindProperty = fish.properties[0];
      ok(kindProperty);
      strictEqual(kindProperty.name, "kind");
      strictEqual(kindProperty.description, "Discriminator property for Fish.");
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
      strictEqual(sharktypeProperty.description, "Discriminator property for Shark.");
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      const kindProperty = fish.properties[0];
      ok(kindProperty);
      strictEqual(kindProperty.name, "kind");
      strictEqual(kindProperty.description, "Discriminator property for Fish.");
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const fish = models.find((x) => x.name === "Fish");
      ok(fish);
      const kindProperty = fish.properties[0];
      ok(kindProperty);
      strictEqual(kindProperty.name, "kind");
      strictEqual(kindProperty.description, "Discriminator property for Fish.");
      strictEqual(kindProperty.kind, "property");
      strictEqual(kindProperty.discriminator, true);
      strictEqual(kindProperty.type.kind, "string");
      strictEqual(kindProperty.__raw, undefined);
      strictEqual(kindProperty.type.__raw, undefined);
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const golden = models.find((x) => x.name === "Golden");
      ok(golden);

      const kind = golden.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(kind);
      strictEqual(kind.type.kind, "enumvalue");
      strictEqual(kind.type.value, "golden");

      const dog = models.find((x) => x.name === "Dog");
      ok(dog);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const dogKind = runner.context.experimental_sdkPackage.enums[0];

      const dogKindProperty = dog.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(dogKindProperty);
      strictEqual(dogKindProperty.kind, "property");
      strictEqual(dogKindProperty.type, dogKind);
      strictEqual(dog.discriminatorProperty, dogKindProperty);
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
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const petKind = runner.context.experimental_sdkPackage.enums[0];
      strictEqual(petKind.name, "PetKind");
      strictEqual(petKind.isFixed, false);
      strictEqual(petKind.valueType.kind, "string");
      const values = petKind.values;
      deepStrictEqual(
        values.map((x) => x.name),
        ["Cat", "Dog"]
      );

      const catValue = values.find((x) => x.name === "Cat");
      ok(catValue);
      strictEqual(catValue.value, "cat");
      strictEqual(catValue.description, "Cat");
      strictEqual(catValue.enumType, petKind);
      strictEqual(catValue.valueType, petKind.valueType);
      strictEqual(catValue.kind, "enumvalue");

      const dogValue = values.find((x) => x.name === "Dog");
      ok(dogValue);
      strictEqual(dogValue.value, "dog");
      strictEqual(dogValue.description, "Dog");
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.models.length, 1);
      strictEqual(sdkPackage.enums.length, 1);
      const prop = sdkPackage.enums.find((x) => x.name === "GetResponseProp" && x.isGeneratedName);
      ok(prop);
      strictEqual(prop.isFixed, false);
      strictEqual(prop.valueType.kind, "string");
      const resp = sdkPackage.models.find((x) => x.name === "GetResponse" && x.isGeneratedName);
      ok(resp);
      strictEqual(resp.properties[0].type, prop);
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const pet = models.find((x) => x.name === "Pet");

      const enums = runner.context.experimental_sdkPackage.enums;
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
      const sdkPackage = runner.context.experimental_sdkPackage;
      strictEqual(sdkPackage.models.length, 0);
      strictEqual(sdkPackage.enums.length, 2);
      strictEqual(sdkPackage.enums[0].name, "FooRequestRepeatabilityResult");
      strictEqual(sdkPackage.enums[1].name, "FooResponseRepeatabilityResult");
      deepStrictEqual(
        sdkPackage.enums[0].values.map((x) => x.name),
        ["accepted", "rejected"]
      );
      deepStrictEqual(
        sdkPackage.enums[1].values.map((x) => x.name),
        ["accepted", "rejected"]
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const golden = models.find((x) => x.name === "Golden");
      ok(golden);

      const kind = golden.properties.find(
        (x) => x.kind === "property" && x.serializedName === "kind"
      );
      ok(kind);
      strictEqual(kind.type.kind, "enumvalue");
      strictEqual(kind.type.value, "golden");

      const dog = models.find((x) => x.name === "Dog");
      ok(dog);
      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const dogKind = runner.context.experimental_sdkPackage.enums[0];

      const dogKindProperty = dog.properties[0];
      ok(dogKindProperty);
      strictEqual(dogKindProperty.type, dogKind);
      strictEqual(dogKindProperty.description, "Discriminator property for Dog.");
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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

      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const kindType = runner.context.experimental_sdkPackage.enums.find(
        (x) => x.name === "KindType"
      );
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
      const models = runner.context.experimental_sdkPackage.models;
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

      strictEqual(runner.context.experimental_sdkPackage.enums.length, 1);
      const kindType = runner.context.experimental_sdkPackage.enums.find(
        (x) => x.name === "KindType"
      );
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
      const models = runner.context.experimental_sdkPackage.models;
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
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
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
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "User");
    });

    it("filterOutCoreModels false", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        "filter-out-core-models": false,
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
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
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(modelNames, ["Error", "ErrorResponse", "InnerError", "User"].sort());
    });

    it("lro core filterOutCoreModels true", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
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
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "User");
    });

    it("lro core filterOutCoreModels false", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        "filter-out-core-models": false,
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
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
      const models = runnerWithCore.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const modelNames = models.map((model) => model.name).sort();
      deepStrictEqual(
        modelNames,
        [
          "Error",
          "ErrorResponse",
          "InnerError",
          "User",
          "ResourceOperationStatusUserUserError",
        ].sort()
      );
      strictEqual(runnerWithCore.context.experimental_sdkPackage.enums.length, 1);
      strictEqual(runnerWithCore.context.experimental_sdkPackage.enums[0].name, "OperationState");
    });
    it("no models filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 0);
    });
    it("no models don't filter core", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService { }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 0);
    });
    it("input usage", async () => {
      await runner.compileWithBuiltInService(`
        model InputModel {
          prop: string
        }
        op operation(@body input: InputModel): void;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Input).length, 1);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Output).length, 0);
    });

    it("output usage", async () => {
      await runner.compileWithBuiltInService(`
        model OutputModel {
          prop: string
        }
        op operation(): OutputModel;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Output);

      strictEqual(models.filter((x) => x.usage === UsageFlags.Output).length, 1);
      strictEqual(models.filter((x) => x.usage === UsageFlags.Input).length, 0);
    });

    it("roundtrip usage", async () => {
      await runner.compileWithBuiltInService(`
        model RoundtripModel {
          prop: string
        }
        op operation(@body input: RoundtripModel): RoundtripModel;
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);

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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      strictEqual(
        models.find((x) => x.name === "RoundTripModel")?.usage,
        UsageFlags.Input | UsageFlags.Output
      );
      strictEqual(models.find((x) => x.name === "ResultModel")?.usage, UsageFlags.Output);
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      strictEqual(models[0].usage, UsageFlags.Input | UsageFlags.Output);
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
      const models = runner.context.experimental_sdkPackage.models;
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

      const models = runner.context.experimental_sdkPackage.models;
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
      const models = runner.context.experimental_sdkPackage.models;
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
        @access(Access.public)
        model AdditionalPropertiesModel extends Record<string> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel2 is Record<unknown> {
          prop: string;
        }
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel3 {
          prop: string;
          ...Record<string>;
        }
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model NoAdditionalPropertiesModel {
          prop: string;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 4);
      const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      );
      const AdditionalPropertiesModel3 = models.find(
        (x) => x.name === "AdditionalPropertiesModel3"
      );
      const NonAdditionalPropertiesModel = models.find(
        (x) => x.name === "NoAdditionalPropertiesModel"
      );
      ok(
        AdditionalPropertiesModel &&
          AdditionalPropertiesModel2 &&
          AdditionalPropertiesModel3 &&
          NonAdditionalPropertiesModel
      );
      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "string");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "any");
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
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 5);
      const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      );
      const AdditionalPropertiesModel3 = models.find(
        (x) => x.name === "AdditionalPropertiesModel3"
      );
      const Test = models.find((x) => x.name === "Test");
      const Test2 = models.find((x) => x.name === "Test2");
      ok(
        AdditionalPropertiesModel &&
          AdditionalPropertiesModel2 &&
          AdditionalPropertiesModel3 &&
          Test &&
          Test2
      );

      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "model");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel.usage, UsageFlags.Input);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "model");
      strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.usage, UsageFlags.Output);
      strictEqual(AdditionalPropertiesModel3.additionalProperties?.kind, "model");
      strictEqual(AdditionalPropertiesModel3.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel3.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(Test.usage, UsageFlags.Input | UsageFlags.Output);
      strictEqual(Test2.usage, UsageFlags.Input | UsageFlags.Output);
    });

    it("additionalProperties of different types", async () => {
      await runner.compileWithBuiltInService(`
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel {
          prop: string;
          ...Record<float32>;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AdditionalPropertiesModel2 {
          prop: string;
          ...Record<boolean | float32>;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const AdditionalPropertiesModel = models.find((x) => x.name === "AdditionalPropertiesModel");
      const AdditionalPropertiesModel2 = models.find(
        (x) => x.name === "AdditionalPropertiesModel2"
      );
      ok(AdditionalPropertiesModel && AdditionalPropertiesModel2);
      strictEqual(AdditionalPropertiesModel.additionalProperties?.kind, "float32");
      strictEqual(AdditionalPropertiesModel.baseModel, undefined);
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.kind, "union");
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.values[0].kind, "boolean");
      strictEqual(AdditionalPropertiesModel2.additionalProperties?.values[1].kind, "float32");
      strictEqual(AdditionalPropertiesModel2.baseModel, undefined);
    });

    it("crossLanguageDefinitionId", async () => {
      await runner.compile(`
        @service({})
        namespace MyService {
          @usage(Usage.input)
          @access(Access.public)
          model InputModel {}

          @usage(Usage.output)
          @access(Access.public)
          model OutputModel {}
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
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
        @access(Access.public)
        model Catalog is TrackedResource<CatalogProperties> {
          @pattern("^[A-Za-z0-9_-]{1,50}$")
          @key("catalogName")
          @segment("catalogs")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model CatalogProperties {
          test?: string;
        }

        model TrackedResource<TProperties extends {}> {
          properties?: TProperties;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model Deployment is TrackedResource<DeploymentProperties> {
          @key("deploymentName")
          @segment("deployments")
          name: string;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model DeploymentProperties {
          deploymentId?: string;
          deploymentDateUtc?: utcDateTime;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
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

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].deprecation, "no longer support");
    });

    it("orphan model", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model Model1{}

          model Model2{}
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "Model1");
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
      const models = runner.context.experimental_sdkPackage.models;
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
      strictEqual(models[0].isError, true);
      const rawModel = models[0].__raw;
      ok(rawModel);
      strictEqual(rawModel.kind, "Model");
      strictEqual(isErrorOrChildOfError(runner.context, rawModel), true);
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
      const errorModels = models.filter((x) => x.kind === "model" && x.isError);
      deepStrictEqual(errorModels.map((x) => x.name).sort(), [
        "ApiError",
        "FiveHundredError",
        "FourHundredError",
        "FourZeroFourError",
      ]);
      const validModel = models.filter((x) => x.kind === "model" && !x.isError);
      deepStrictEqual(
        validModel.map((x) => x.name),
        ["ValidResponse"]
      );
    });

    it("never or void property", async () => {
      await runner.compileAndDiagnose(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model Test{
            prop1: never;
            prop2: void;
          }
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      strictEqual(models[0].name, "Test");
      strictEqual(models[0].properties.length, 0);
    });
  });

  describe("SdkArrayType", () => {
    it("use model is to represent array", async () => {
      await runner.compile(`
        @service({})
        namespace TestClient {
          model TestModel {
            prop: string;
          }
          model TestArray is TestModel[];

          op get(): TestArray;
        }
      `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      strictEqual(model.name, "TestModel");
      const client = runner.context.experimental_sdkPackage.clients[0];
      ok(client);
      const method = client.methods[0];
      ok(method);
      strictEqual(method.response.kind, "method");
      strictEqual(method.response.type?.kind, "array");
      strictEqual(method.response.type?.valueType.kind, "model");
      strictEqual(method.response.type?.valueType.name, "TestModel");
    });
  });

  describe("SdkMultipartFormType", () => {
    it("multipart form basic", async function () {
      await runner.compileWithBuiltInService(`
      model MultiPartRequest {
        id: string;
        profileImage: bytes;
      }

      op basic(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.kind, "model");
      strictEqual(model.isFormDataType, true);
      ok((model.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(model.name, "MultiPartRequest");
      strictEqual(model.properties.length, 2);
      const id = model.properties.find((x) => x.name === "id");
      ok(id);
      strictEqual(id.kind, "property");
      strictEqual(id.type.kind, "string");
      const profileImage = model.properties.find((x) => x.name === "profileImage");
      ok(profileImage);
      strictEqual(profileImage.kind, "property");
      strictEqual(profileImage.isMultipartFileInput, true);
    });
    it("multipart conflicting model usage", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
        }
  
        @post op multipartUse(@header contentType: "multipart/form-data", @body body: MultiPartRequest): NoContentResponse;
        @put op jsonUse(@body body: MultiPartRequest): NoContentResponse;
      `
      );
      const [_, diagnostics] = getAllModelsWithDiagnostics(runner.context);
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/conflicting-multipart-model-usage",
      });
    });
    it("multipart resolving conflicting model usage with spread", async function () {
      await runner.compileWithBuiltInService(
        `
        model B {
          doc: bytes
        }
        
        model A {
          ...B
        }
        
        @put op multipartOperation(@header contentType: "multipart/form-data", ...A): void;
        @post op normalOperation(...B): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const modelA = models.find((x) => x.name === "A");
      ok(modelA);
      strictEqual(modelA.kind, "model");
      strictEqual(modelA.isFormDataType, true);
      ok((modelA.usage & UsageFlags.MultipartFormData) > 0);
      strictEqual(modelA.properties.length, 1);
      const modelAProp = modelA.properties[0];
      strictEqual(modelAProp.kind, "property");
      strictEqual(modelAProp.isMultipartFileInput, true);

      const modelB = models.find((x) => x.name === "B");
      ok(modelB);
      strictEqual(modelB.kind, "model");
      strictEqual(modelB.isFormDataType, false);
      ok((modelB.usage & UsageFlags.MultipartFormData) === 0);
      strictEqual(modelB.properties.length, 1);
      strictEqual(modelB.properties[0].type.kind, "bytes");
    });

    it("multipart with non-formdata model property", async function () {
      await runner.compileWithBuiltInService(
        `
        model Address {
          city: string;
        }

        model AddressFirstAppearance {
          address: Address;
        }

        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model AddressSecondAppearance {
          address: Address;
        }
        
        @put op multipartOne(@header contentType: "multipart/form-data", @body body: AddressFirstAppearance): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 3);
    });

    it("multipart with list of bytes", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const model = models[0];
      strictEqual(model.properties.length, 1);
      const pictures = model.properties[0];
      strictEqual(pictures.kind, "property");
      strictEqual(pictures.isMultipartFileInput, true);
    });

    it("multipart with encoding bytes raises error", async function () {
      await runner.compile(
        `
        @service({title: "Test Service"}) namespace TestService;
        model EncodedBytesMFD {
          @encode("base64")
          pictures: bytes;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: EncodedBytesMFD): void;
        `
      );
      ok(runner.context.diagnostics?.length);
      expectDiagnostics(runner.context.diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/encoding-multipart-bytes",
      });
    });

    it("multipart with reused error model", async function () {
      await runner.compileWithBuiltInService(
        `
        model PictureWrapper {
          pictures: bytes[];
        }

        model ErrorResponse {
          errorCode: string;
        }
        
        @put op multipartOp(@header contentType: "multipart/form-data", @body body: PictureWrapper): void | ErrorResponse;
        @post op normalOp(): void | ErrorResponse;
        `
      );
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);

      const pictureWrapper = models.find((x) => x.name === "PictureWrapper");
      ok(pictureWrapper);
      strictEqual(pictureWrapper.isFormDataType, true);
      ok((pictureWrapper.usage & UsageFlags.MultipartFormData) > 0);

      const errorResponse = models.find((x) => x.name === "ErrorResponse");
      ok(errorResponse);
      strictEqual(errorResponse.kind, "model");
      strictEqual(errorResponse.isFormDataType, false);
      ok((errorResponse.usage & UsageFlags.MultipartFormData) === 0);
    });

    it("expands model into formData parameters", async function () {
      await runner.compileWithBuiltInService(`
        @doc("A widget.")
        model Widget {
          @key("widgetName")
          name: string;
          displayName: string;
          description: string;
          color: string;
        }

        model WidgetForm is Widget {
          @header("content-type")
          contentType: "multipart/form-data";
        }

        @route("/widgets")
        interface Widgets {
          @route(":upload")
          @post
          upload(...WidgetForm): Widget;
        }
        `);
      const formDataMethod = runner.context.experimental_sdkPackage.clients[0].methods[0];
      strictEqual(formDataMethod.kind, "basic");
      strictEqual(formDataMethod.name, "upload");
      strictEqual(formDataMethod.parameters.length, 3);

      const widgetParam = formDataMethod.parameters.find((x) => x.name === "widget");
      ok(widgetParam);
      ok(formDataMethod.parameters.find((x) => x.name === "accept"));
      strictEqual(formDataMethod.parameters[0].name, "contentType");
      strictEqual(formDataMethod.parameters[0].type.kind, "constant");
      strictEqual(formDataMethod.parameters[0].type.value, "multipart/form-data");
      strictEqual(formDataMethod.parameters[1].name, "widget");
      strictEqual(formDataMethod.parameters[1].type.kind, "model");
      strictEqual(formDataMethod.parameters[1].type.name, "Widget");

      const formDataOp = formDataMethod.operation;
      strictEqual(formDataOp.parameters.length, 2);
      ok(formDataOp.parameters.find((x) => x.name === "accept" && x.kind === "header"));
      ok(formDataOp.parameters.find((x) => x.name === "contentType" && x.kind === "header"));

      const formDataBodyParam = formDataOp.bodyParam;
      ok(formDataBodyParam);
      strictEqual(formDataBodyParam.type.kind, "model");
      strictEqual(formDataBodyParam.type.name, "Widget");
      strictEqual(formDataBodyParam.correspondingMethodParams[0], formDataMethod.parameters[1]);
    });

    it("usage doesn't apply to properties of a form data", async function () {
      await runner.compileWithBuiltInService(`
        model MultiPartRequest {
          id: string;
          profileImage: bytes;
          address: Address;
        }

        model Address {
          city: string;
        }

        @post
        op upload(@header contentType: "multipart/form-data", @body body: MultiPartRequest): void;
        `);
      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 2);
      const multiPartRequest = models.find((x) => x.name === "MultiPartRequest");
      ok(multiPartRequest);
      ok(multiPartRequest.usage & UsageFlags.MultipartFormData);

      const address = models.find((x) => x.name === "Address");
      ok(address);
      strictEqual(address.usage & UsageFlags.MultipartFormData, 0);
    });
  });
  describe("SdkTupleType", () => {
    it("model with tupled properties", async function () {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        @usage(Usage.input | Usage.output)
        @access(Access.public)
        model MyFlow {
          scopes: ["https://security.microsoft.com/.default"];
          test: [int32, string]
        }
      `);

      const models = runner.context.experimental_sdkPackage.models;
      strictEqual(models.length, 1);
      const scopes = models[0].properties.find((x) => x.name === "scopes");
      ok(scopes);
      strictEqual(scopes.type.kind, "tuple");
      strictEqual(scopes.type.values[0].kind, "constant");
      strictEqual(scopes.type.values[0].valueType.kind, "string");
      strictEqual(scopes.type.values[0].value, "https://security.microsoft.com/.default");
      const test = models[0].properties.find((x) => x.name === "test");
      ok(test);
      strictEqual(test.type.kind, "tuple");
      strictEqual(test.type.values[0].kind, "int32");
      strictEqual(test.type.values[1].kind, "string");
    });
  });
});
