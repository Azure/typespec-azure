import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkModelType } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
});

it("three-level inheritance", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("kind")
      model Pet {
        kind: string;
      }

      @discriminatorValue("dog")
      model Dog extends Pet {
        breed: string;
      }

      @usage(Usage.input)
      model Puppy extends Dog {
        kind: "puppy";
        vaccinated: boolean;
      }
    `);

  const models = runner.context.sdkPackage.models;
  const petModel = models.find((m) => m.name === "Pet") as SdkModelType;
  const dogModel = models.find((m) => m.name === "Dog") as SdkModelType;
  const puppyModel = models.find((m) => m.name === "Puppy") as SdkModelType;

  ok(petModel);
  ok(dogModel);
  ok(puppyModel);

  // Verify discriminator property is correctly identified
  strictEqual(petModel.discriminatorProperty?.name, "kind");
  strictEqual(dogModel.discriminatorValue, "dog");
  strictEqual(puppyModel.discriminatorValue, "puppy");
});

it("discriminator value overrides model property value", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }

      @discriminatorValue("overrideCar")
      model Car extends Vehicle {
        type: "car"; // This should be overridden by @discriminatorValue
        doors: int32;
      }

      @route("/vehicles")
      op getVehicle(): Vehicle;
    `);

  const models = runner.context.sdkPackage.models;
  const carModel = models.find((m) => m.name === "Car") as SdkModelType;

  ok(carModel);
  // @discriminatorValue should take precedence over the model property value
  strictEqual(carModel.discriminatorValue, "overrideCar"); // Should use the model name as default
});

it("four-level inheritance", async () => {
  await runner.compileWithBuiltInService(`
      @discriminator("type")
      model Vehicle {
        type: string;
      }

      @discriminatorValue("motor")
      model MotorVehicle extends Vehicle {
        engine: string;
      }

      @discriminatorValue("car")
      model Car extends MotorVehicle {
        doors: int32;
      }

      @usage(Usage.input)
      model SportsCar extends Car {
        topSpeed: int32;
        type: "sports-car";
      }
    `);

  const models = runner.context.sdkPackage.models;
  const vehicleModel = models.find((m) => m.name === "Vehicle") as SdkModelType;
  const motorVehicleModel = models.find((m) => m.name === "MotorVehicle") as SdkModelType;
  const carModel = models.find((m) => m.name === "Car") as SdkModelType;
  const sportsCarModel = models.find((m) => m.name === "SportsCar") as SdkModelType;

  ok(vehicleModel);
  ok(motorVehicleModel);
  ok(carModel);
  ok(sportsCarModel);

  // Verify discriminator property is correctly identified at root level
  strictEqual(vehicleModel.discriminatorProperty?.name, "type");

  // Verify discriminator values across all four levels
  strictEqual(motorVehicleModel.discriminatorValue, "motor");
  strictEqual(carModel.discriminatorValue, "car");
  strictEqual(sportsCarModel.discriminatorValue, "sports-car");

  // Verify inheritance chain
  strictEqual(motorVehicleModel.baseModel?.name, "Vehicle");
  strictEqual(carModel.baseModel?.name, "MotorVehicle");
  strictEqual(sportsCarModel.baseModel?.name, "Car");
});

it("discriminator value with scope", async () => {
  const code = `
      @discriminator("type")
      model Document {
        type: string;
      }

      @discriminatorValue("pdf", "java")
      @discriminatorValue("portable-document", "python")
      model PdfDocument extends Document {
        type: "override-pdf"; // Should be overridden by @discriminatorValue
        pageCount: int32;
      }

      @route("/documents")
      op getDocument(): Document;
    `;
  await runner.compileWithBuiltInService(code);

  const models = runner.context.sdkPackage.models;
  const pdfModel = models.find((m) => m.name === "PdfDocument") as SdkModelType;

  ok(pdfModel);
  // Should use Java-scoped value since test runner is configured for Java
  strictEqual(pdfModel.discriminatorValue, "pdf");

  const pythonRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  await pythonRunner.compileWithBuiltInService(code);
  const pythonModels = pythonRunner.context.sdkPackage.models;
  const pythonPdfModel = pythonModels.find((m) => m.name === "PdfDocument") as SdkModelType;
  ok(pythonPdfModel);
  // Should use Python-scoped value since test runner is configured for Python
  strictEqual(pythonPdfModel.discriminatorValue, "portable-document");
});

it("discriminator value on model without discriminator decorator", async () => {
  await runner.compileWithBuiltInService(`
      model BaseModel {
        id: string;
      }

      @discriminatorValue("type") // Should be ignored - no @discriminator on base
      @usage(Usage.input)
      model DerivedModel extends BaseModel {
        name: string;
      }
    `);

  const models = runner.context.sdkPackage.models;
  const derivedModel = models.find((m) => m.name === "DerivedModel") as SdkModelType;

  ok(derivedModel);
  // Should not have discriminator value since base model doesn't have @discriminator
  strictEqual(derivedModel.discriminatorValue, undefined);
});
