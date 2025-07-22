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

  // Verify .discriminatedSubtypes is correctly populated
  ok(modelA.discriminatedSubtypes);
  strictEqual(modelA.discriminatedSubtypes["B"], modelB);
  strictEqual(modelA.discriminatedSubtypes["C"], modelC);

  ok(modelB.discriminatedSubtypes);
  strictEqual(modelB.discriminatedSubtypes["C"], modelC);
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

  // Verify discriminator property is correctly identified
  strictEqual(vehicleModel.discriminatorProperty?.name, "type");
  strictEqual(motorVehicleModel.discriminatorValue, "motor");
  strictEqual(carModel.discriminatorValue, "car");
  strictEqual(sportsCarModel.discriminatorValue, "sports");

  // Verify properties are correctly inherited
  strictEqual(sportsCarModel.properties.length, 4);
  strictEqual(sportsCarModel.properties[0].name, "type");
  strictEqual(sportsCarModel.properties[1].name, "engine");
  strictEqual(sportsCarModel.properties[2].name, "doors");
  strictEqual(sportsCarModel.properties[3].name, "topSpeed");
  strictEqual(carModel.properties.length, 3);
  strictEqual(carModel.properties[0].name, "type");
  strictEqual(carModel.properties[1].name, "engine");
  strictEqual(carModel.properties[2].name, "doors");
  strictEqual(motorVehicleModel.properties.length, 2);
  strictEqual(motorVehicleModel.properties[0].name, "type");
  strictEqual(motorVehicleModel.properties[1].name, "engine");
  strictEqual(vehicleModel.properties.length, 1);
  strictEqual(vehicleModel.properties[0].name, "type");

  // Verify .discriminatedSubtypes is correctly populated
  ok(vehicleModel.discriminatedSubtypes);
  strictEqual(vehicleModel.discriminatedSubtypes["motor"], motorVehicleModel);
  strictEqual(vehicleModel.discriminatedSubtypes["car"], carModel);
  strictEqual(vehicleModel.discriminatedSubtypes["sports"], sportsCarModel);
  ok(motorVehicleModel.discriminatedSubtypes);
  strictEqual(motorVehicleModel.discriminatedSubtypes["car"], carModel);
  // strictEqual(motorVehicleModel.discriminatedSubtypes["sports"], sportsCarModel);
  ok(carModel.discriminatedSubtypes);
  strictEqual(carModel.discriminatedSubtypes["sports"], sportsCarModel);
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

it("conflicting inheritance", async () => {
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
      model C extends A {  // Doesn't have propB but @inheritsFrom says B
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

it("without polymorphism", async () => {
  await runner.compileWithBuiltInService(`
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
      @usage(Usage.input)
      model C extends A {
        kind: "C";
        ...BContent;
        bar: string;
      }
    `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 3);
  const aModel = models.find((m) => m.name === "A");
  const bModel = models.find((m) => m.name === "B");
  const cModel = models.find((m) => m.name === "C");

  ok(aModel);
  ok(bModel);
  ok(cModel);

  // C should inherit from B instead of A due to @inheritsFrom
  strictEqual(cModel.baseModel?.name, "B");
  strictEqual(bModel.baseModel?.name, "A");
});
