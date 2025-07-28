import { AzureCoreTestLibrary, noLegacyUsage } from "@azure-tools/typespec-azure-core/testing";
import {
  createLinterRuleTester,
  expectDiagnostics,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

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

      @Legacy.legacyHierarchyBuilding(B)
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

  // C should inherit from B instead of A due to @Legacy.legacyHierarchyBuilding
  strictEqual(modelC.baseModel?.name, "B");
  strictEqual(modelB.baseModel?.name, "A");

  // Verify discriminator property is correctly identified
  strictEqual(modelA.discriminatorProperty?.name, "kind");
  strictEqual(modelB.discriminatorValue, "B");
  strictEqual(modelC.discriminatorValue, "C");
  strictEqual(modelA.discriminatorValue, undefined);

  // Verify properties are correctly inherited
  strictEqual(modelC.properties.length, 2);
  strictEqual(modelC.properties[0].name, "kind");
  strictEqual(modelC.properties[1].name, "bar");
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

      @Legacy.legacyHierarchyBuilding(MotorVehicle)
      model Car extends Vehicle {
        type: "car";
        ...MotorVehicleContent;
        ...CarContent;
      }

      @Legacy.legacyHierarchyBuilding(Car)
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

  // SportsCar should inherit from Car instead of Vehicle due to @Legacy.legacyHierarchyBuilding
  strictEqual(sportsCarModel.baseModel?.name, "Car");
  strictEqual(carModel.baseModel?.name, "MotorVehicle");
  strictEqual(motorVehicleModel.baseModel?.name, "Vehicle");

  // Verify discriminator property is correctly identified
  strictEqual(vehicleModel.discriminatorProperty?.name, "type");
  strictEqual(motorVehicleModel.discriminatorValue, "motor");
  strictEqual(carModel.discriminatorValue, "car");
  strictEqual(sportsCarModel.discriminatorValue, "sports");

  // Verify properties are correctly inherited
  strictEqual(sportsCarModel.properties.length, 2);
  strictEqual(sportsCarModel.properties[0].name, "type");
  strictEqual(sportsCarModel.properties[1].name, "topSpeed");
  strictEqual(carModel.properties.length, 2);
  strictEqual(carModel.properties[0].name, "type");
  strictEqual(carModel.properties[1].name, "doors");
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

it("nested property inheritance", async () => {
  await runner.compileWithBuiltInService(`
    @discriminator("kind")
    model Salmon {
      properties: {
      }
    }

    model KingSalmon extends Salmon {
      kind: "kingsalmon";
      properties: {
        farmed: false;
        size: int32;
      }
    }

    @Legacy.legacyHierarchyBuilding(KingSalmon)
    model SmartKindSalmon extends Salmon {
      kind: "smartkingsalmon";
      properties: {
        farmed: boolean;
        size: boolean;
      }
    }

    @route("/salmon")
    op getSalmon(): Salmon;
  `);

  const models = runner.context.sdkPackage.models;
  strictEqual(models.length, 6);
  const salmonModel = models.find((m) => m.name === "Salmon");
  const kingSalmonModel = models.find((m) => m.name === "KingSalmon");
  const smartKingSalmonModel = models.find((m) => m.name === "SmartKindSalmon");
  const salmonPropertiesModel = models.find((m) => m.name === "SalmonProperties");
  const kingSalmonPropertiesModel = models.find((m) => m.name === "KingSalmonProperties");
  const smartKingSalmonPropertiesModel = models.find((m) => m.name === "SmartKindSalmonProperties");

  ok(salmonModel);
  ok(kingSalmonModel);
  ok(smartKingSalmonModel);
  ok(salmonPropertiesModel);
  ok(kingSalmonPropertiesModel);
  ok(smartKingSalmonPropertiesModel);

  // SmartKindSalmon should inherit from KingSalmon instead of Salmon due to @Legacy.legacyHierarchyBuilding
  strictEqual(smartKingSalmonModel.baseModel?.name, "KingSalmon");
  strictEqual(kingSalmonModel.baseModel?.name, "Salmon");

  // Verify discriminator property is correctly identified
  strictEqual(salmonModel.discriminatorProperty?.name, "kind");
  strictEqual(kingSalmonModel.discriminatorValue, "kingsalmon");
  strictEqual(smartKingSalmonModel.discriminatorValue, "smartkingsalmon");

  // Verify properties are correctly inherited
  strictEqual(smartKingSalmonModel.properties.length, 1);
  strictEqual(smartKingSalmonModel.properties[0].name, "kind");
  strictEqual(smartKingSalmonPropertiesModel.properties.length, 2);
  strictEqual(smartKingSalmonPropertiesModel.properties[0].name, "farmed");
  strictEqual(smartKingSalmonPropertiesModel.properties[0].type.kind, "boolean");
  strictEqual(smartKingSalmonPropertiesModel.properties[1].name, "size");
  strictEqual(smartKingSalmonPropertiesModel.properties[1].type.kind, "boolean");

  strictEqual(kingSalmonModel.properties.length, 2);
  strictEqual(kingSalmonModel.properties[0].name, "kind");
  strictEqual(kingSalmonModel.properties[1].type, kingSalmonPropertiesModel);
  strictEqual(kingSalmonPropertiesModel.properties.length, 2);
  strictEqual(kingSalmonPropertiesModel.properties[0].name, "farmed");
  strictEqual(kingSalmonPropertiesModel.properties[0].type.kind, "constant");
  strictEqual(kingSalmonPropertiesModel.properties[0].type.value, false);
  strictEqual(kingSalmonPropertiesModel.properties[1].name, "size");
  strictEqual(kingSalmonPropertiesModel.properties[1].type.kind, "int32");
  strictEqual(salmonModel.properties.length, 2);
  strictEqual(salmonModel.properties[0].name, "kind");
  strictEqual(salmonModel.properties[0].type.kind, "string");
  strictEqual(salmonModel.properties[1].type, salmonPropertiesModel);
  // Verify .discriminatedSubtypes is correctly populated
  ok(salmonModel.discriminatedSubtypes);
  strictEqual(salmonModel.discriminatedSubtypes["kingsalmon"], kingSalmonModel);
  strictEqual(salmonModel.discriminatedSubtypes["smartkingsalmon"], smartKingSalmonModel);
  ok(kingSalmonModel.discriminatedSubtypes);
  strictEqual(kingSalmonModel.discriminatedSubtypes["smartkingsalmon"], smartKingSalmonModel);
  ok(!smartKingSalmonModel.discriminatedSubtypes);
});

it("circular inheritance", async () => {
  await runner.compile(`
      @service
      namespace TestService;

      model A extends B {
        propA: string;
      }

      @Legacy.legacyHierarchyBuilding(A)
      model B extends C {
        propB: string;
      }

      @usage(Usage.input)
      model C {
        propC: string;
      }

      @route("/test")
      op test(): A;
    `);

  const modelA = runner.context.sdkPackage.models.find((m) => m.name === "A");
  const modelB = runner.context.sdkPackage.models.find((m) => m.name === "B");
  const modelC = runner.context.sdkPackage.models.find((m) => m.name === "C");

  ok(modelA);
  ok(modelB);
  ok(modelC);

  strictEqual(modelA.baseModel?.name, "B");
  strictEqual(modelB.baseModel?.name, "A");
  strictEqual(modelC.baseModel, undefined);

  strictEqual(modelA.properties.length, 1);
  strictEqual(modelA.properties[0].name, "propA");
  strictEqual(modelB.properties.length, 1);
  strictEqual(modelB.properties[0].name, "propB");
  strictEqual(modelC.properties.length, 1);
  strictEqual(modelC.properties[0].name, "propC");
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

      @Legacy.legacyHierarchyBuilding(B)
      model C extends A {  // Doesn't have propB but @Legacy.legacyHierarchyBuilding says B
        propC: string;
      }

      @route("/test")
      op test(): C;
    `);

  // Should warn about conflicting inheritance
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/legacy-hierarchy-building-conflict",
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

      @Legacy.legacyHierarchyBuilding(StringContainer)
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

      @Legacy.legacyHierarchyBuilding(B)
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

  // C should inherit from B instead of A due to @Legacy.legacyHierarchyBuilding
  strictEqual(cModel.baseModel?.name, "B");
  strictEqual(bModel.baseModel?.name, "A");
});

it("verify respectLegacyHierarchyBuilding: false flag", async () => {
  const runnerWithoutLegacyHierarchyBuilding = await createSdkTestRunner(
    {
      emitterName: "@azure-tools/typespec-java",
    },
    { respectLegacyHierarchyBuilding: false },
  );
  await runnerWithoutLegacyHierarchyBuilding.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }

      model Car extends Vehicle {
        type: "car";
      }

      @Legacy.legacyHierarchyBuilding(Car)
      model SportsCar extends Vehicle {
        type: "sports";
      }

      @route("/vehicles")
      op getVehicle(): Vehicle;
    `);

  // Should not apply legacy hierarchy building
  const models = runnerWithoutLegacyHierarchyBuilding.context.sdkPackage.models;
  const vehicleModel = models.find((m) => m.name === "Vehicle");
  const carModel = models.find((m) => m.name === "Car");
  const sportsCarModel = models.find((m) => m.name === "SportsCar");
  ok(vehicleModel);
  ok(carModel);
  ok(sportsCarModel);
  // SportsCar should inherit from Vehicle instead of Car
  strictEqual(sportsCarModel.baseModel?.name, "Vehicle");
  strictEqual(carModel.baseModel?.name, "Vehicle");
});

it("verify diagnostic gets raised for usage", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });

  const tester: LinterRuleTester = createLinterRuleTester(
    runnerWithCore,
    noLegacyUsage,
    "@azure-tools/typespec-azure-core",
  );

  await tester
    .expect(
      `        
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace MyService {
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

        @Azure.ClientGenerator.Core.Legacy.legacyHierarchyBuilding(B)
        model C extends A {
          kind: "C";
          ...BContent;
          bar: string;
        }
      }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-legacy-usage",
        message:
          'Referencing elements inside Legacy namespace "Azure.ClientGenerator.Core.Legacy" is not allowed.',
      },
    ]);
});

it("verify legacy hierarchy building usage with unordered models", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }
      model MotorVehicleContent {
        engine: string;}

      @Legacy.legacyHierarchyBuilding(Car)
      model SportsCar extends Vehicle {
        type: "sports";
        ...MotorVehicleContent;
        ...CarContent;
        topSpeed: int32;
      }

      model MotorVehicle extends Vehicle {
        type: "motor";
        ...MotorVehicleContent;
      }
      model CarContent {
        doors: int32;
      }
      @Legacy.legacyHierarchyBuilding(MotorVehicle)
      model Car extends Vehicle {
        type: "car";
        ...MotorVehicleContent;
        ...CarContent;
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
  strictEqual(vehicleModel.properties.length, 1);
  strictEqual(vehicleModel.properties[0].name, "type");
  strictEqual(motorVehicleModel.properties.length, 2);
  strictEqual(motorVehicleModel.properties[0].name, "type");
  strictEqual(motorVehicleModel.properties[1].name, "engine");
  strictEqual(carModel.properties.length, 2);
  strictEqual(carModel.properties[0].name, "type");
  strictEqual(carModel.properties[1].name, "doors");
  strictEqual(sportsCarModel.properties.length, 2);
  strictEqual(sportsCarModel.properties[0].name, "type");
  strictEqual(sportsCarModel.properties[1].name, "topSpeed");
});
