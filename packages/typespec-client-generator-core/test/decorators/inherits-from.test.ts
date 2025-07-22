import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});

it("three-level inheritance chain", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model A {
        kind: string;
      }

      model BContent {
        foo: string;
      }

      model B extends A {
        kind: "B";
        ...BContent;
      }

      @inheritsFrom(B)
      model C extends A {
        kind: "C";
        ...BContent;
        bar: string;
      }

      @route("/test")
      op test(): A;
    `);

  const models = runner.context.sdkPackage.models;
  const modelA = models.find((m) => m.name === "A");
  const modelB = models.find((m) => m.name === "B");
  const modelC = models.find((m) => m.name === "C");

  ok(modelA);
  ok(modelB);
  ok(modelC);

  // C should inherit from B instead of A due to @inheritsFrom
  strictEqual(modelC.baseModel?.name, "B");
  strictEqual(modelB.baseModel?.name, "A");

  // Verify discriminator property is correctly identified
  strictEqual(modelA.discriminatorProperty?.name, "kind");
  strictEqual(modelB.discriminatorValue, "B");
  strictEqual(modelC.discriminatorValue, "C");
  strictEqual(modelA.discriminatorValue, undefined);

  // Verify properties are correctly inherited
  strictEqual(modelC.properties.length, 3);
  strictEqual(modelC.properties[0].name, "kind");
  strictEqual(modelC.properties[1].name, "foo");
  strictEqual(modelC.properties[2].name, "bar");
  strictEqual(modelB.properties.length, 2);
  strictEqual(modelB.properties[0].name, "kind");
  strictEqual(modelB.properties[1].name, "foo");
  strictEqual(modelA.properties.length, 1);
  strictEqual(modelA.properties[0].name, "kind");
});

it("four-level inheritance chain", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }

      model MotorVehicleContent {
        engine: string;}

      model MotorVehicle extends Vehicle {
        type: "motor";
        ...MotorVehicleContent;
      }

      model CarContent {
        doors: int32;
      }

      @inheritsFrom(MotorVehicle)
      model Car extends Vehicle {
        type: "car";
        ...MotorVehicleContent;
        ...CarContent;
      }

      @inheritsFrom(Car)
      model SportsCar extends Vehicle {
        type: "sports";
        ...MotorVehicleContent;
        ...CarContent;
        topSpeed: int32;
      }

      @route("/vehicles")
      op getVehicle(): Vehicle;
    `);

  const models = runner.context.sdkPackage.models;
  const vehicleModel = models.find((m) => m.name === "Vehicle");
  const motorVehicleModel = models.find((m) => m.name === "MotorVehicle");
  const carModel = models.find((m) => m.name === "Car");
  const sportsCarModel = models.find((m) => m.name === "SportsCar");

  ok(vehicleModel);
  ok(motorVehicleModel);
  ok(carModel);
  ok(sportsCarModel);

  // SportsCar should inherit from Car instead of Vehicle due to @inheritsFrom
  strictEqual(sportsCarModel.baseModel?.name, "Car");
  strictEqual(carModel.baseModel?.name, "MotorVehicle");
  strictEqual(motorVehicleModel.baseModel?.name, "Vehicle");
});

it("inheritance with scoped decorator", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Base {
        kind: string;
      }

      model Parent extends Base {
        kind: "parent";
        parentProp: string;
      }

      @inheritsFrom(Parent, "java")
      @inheritsFrom(Base, "python")
      model Child extends Base {
        kind: "child";
        childProp: string;
      }

      @route("/test")
      op test(): Base;
    `);

  const models = runner.context.sdkPackage.models;
  const baseModel = models.find((m) => m.name === "Base");
  const parentModel = models.find((m) => m.name === "Parent");
  const childModel = models.find((m) => m.name === "Child");

  ok(baseModel);
  ok(parentModel);
  ok(childModel);

  // Since test runner is configured for Java, Child should inherit from Parent
  strictEqual(childModel.baseModel?.name, "Parent");
});

it("circular inheritance detection", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnose(`
      @service
      namespace TestService;

      model A extends B {
        propA: string;
      }

      @inheritsFrom(A)
      model B extends C {
        propB: string;
      }

      model C {
        propC: string;
      }

      @route("/test")
      op test(): A;
    `);

  // Should detect circular inheritance and report diagnostic
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/inherits-from-circular",
  });
});

it("conflicting inheritance - warning when @inheritsFrom conflicts with extends", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnose(`
      @service
      namespace TestService;

      model A {
        propA: string;
      }

      model B {
        propB: string;
      }

      @inheritsFrom(B)
      model C extends A {  // Extends A but @inheritsFrom says B
        propC: string;
      }

      @route("/test")
      op test(): C;
    `);

  // Should warn about conflicting inheritance
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/inherits-from-conflict",
  });
});

it("multiple inheritance override with different scopes", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }

      model LandVehicle extends Vehicle {
        type: "land";
        wheels: int32;
      }

      model WaterVehicle extends Vehicle {
        type: "water";
        propeller: boolean;
      }

      @inheritsFrom(LandVehicle, "java")
      @inheritsFrom(WaterVehicle, "csharp")
      model AmphibiousVehicle extends Vehicle {
        type: "amphibious";
        canSwim: boolean;
      }

      @route("/vehicles")
      op getVehicle(): Vehicle;
    `);

  const models = runner.context.sdkPackage.models;
  const amphibiousModel = models.find((m) => m.name === "AmphibiousVehicle");

  ok(amphibiousModel);
  // Should inherit from LandVehicle since test runner is configured for Java
  strictEqual(amphibiousModel.baseModel?.name, "LandVehicle");
});

it("inheritance override preserves discriminator values", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Animal {
        kind: string;
      }

      model Mammal extends Animal {
        kind: "mammal";
        furColor: string;
      }

      @inheritsFrom(Mammal)
      model Dog extends Animal {
        kind: "dog";
        breed: string;
      }

      @route("/animals")
      op getAnimal(): Animal;
    `);

  const models = runner.context.sdkPackage.models;
  const animalModel = models.find((m) => m.name === "Animal");
  const mammalModel = models.find((m) => m.name === "Mammal");
  const dogModel = models.find((m) => m.name === "Dog");

  ok(animalModel);
  ok(mammalModel);
  ok(dogModel);

  // Dog should inherit from Mammal and maintain its discriminator value
  strictEqual(dogModel.baseModel?.name, "Mammal");
  strictEqual(dogModel.discriminatorValue, "dog");
  strictEqual(mammalModel.discriminatorValue, "mammal");
});

it("inheritance override with template models", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Container<T> {
        type: string;
        data: T;
      }

      model StringContainer extends Container<string> {
        type: "string";
      }

      @inheritsFrom(StringContainer)
      model SpecialContainer extends Container<string> {
        type: "special";
        metadata: Record<string>;
      }

      @route("/containers")
      op getContainer(): Container<string>;
    `);

  const models = runner.context.sdkPackage.models;
  const specialContainerModel = models.find((m) => m.name === "SpecialContainer");

  ok(specialContainerModel);
  // Should inherit from StringContainer instead of Container<string>
  strictEqual(specialContainerModel.baseModel?.name, "StringContainer");
});
