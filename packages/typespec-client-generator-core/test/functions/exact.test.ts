import { strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
} from "../tester.js";

describe("exact", () => {
  describe("exact naming on models", () => {
    it("marks model name as exact when using exact()", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model TestModel {
            prop: string;
          }

          op get(@body body: TestModel): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.TestModel, exact("hello_world"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const model = sdkPackage.models[0];
      strictEqual(model.name, "hello_world");
      strictEqual(model.isExactName, true);
      strictEqual(model.isGeneratedName, false);
    });

    it("marks model name as not exact when using regular @clientName", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model TestModel {
            prop: string;
          }

          op get(@body body: TestModel): void;
          `,
          `
          @@clientName(MyService.TestModel, "RenamedModel");
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const model = sdkPackage.models[0];
      strictEqual(model.name, "RenamedModel");
      strictEqual(model.isExactName, false);
    });

    it("defaults isExactName to false when no @clientName is applied", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model TestModel {
            prop: string;
          }

          op get(@body body: TestModel): void;
          `,
          ``,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const model = sdkPackage.models[0];
      strictEqual(model.name, "TestModel");
      strictEqual(model.isExactName, false);
    });
  });

  describe("exact naming with language scope", () => {
    it("applies exact name only to the targeted language", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model TestModel {
            prop: string;
          }

          op get(@body body: TestModel): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.TestModel, exact("hello_world"), "python");
          `,
        ),
      );

      // Python should see exact name
      {
        const context = await createSdkContextForTester(program, {
          emitterName: "@azure-tools/typespec-python",
        });
        const model = context.sdkPackage.models[0];
        strictEqual(model.name, "hello_world");
        strictEqual(model.isExactName, true);
      }

      // Java should NOT see exact name
      {
        const context = await createSdkContextForTester(program, {
          emitterName: "@azure-tools/typespec-java",
        });
        const model = context.sdkPackage.models[0];
        strictEqual(model.name, "TestModel");
        strictEqual(model.isExactName, false);
      }
    });
  });

  describe("exact naming on properties", () => {
    it("marks property name as exact", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model TestModel {
            myProp: string;
          }

          op get(@body body: TestModel): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.TestModel.myProp, exact("my_exact_prop"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const model = sdkPackage.models[0];
      const prop = model.properties.find((p) => p.name === "my_exact_prop");
      strictEqual(prop !== undefined, true);
      strictEqual(prop!.isExactName, true);
    });
  });

  describe("exact naming on enums", () => {
    it("marks enum name as exact", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          enum Status {
            Active,
            Inactive,
          }

          op get(@query status: Status): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.Status, exact("my_status_enum"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const enumType = sdkPackage.enums[0];
      strictEqual(enumType.name, "my_status_enum");
      strictEqual(enumType.isExactName, true);
    });
  });

  describe("exact naming on operations", () => {
    it("marks method name as exact via exact()", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          @route("/test")
          op testOp(): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.testOp, exact("my_exact_op"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const client = sdkPackage.clients[0];
      const method = client.methods[0];
      strictEqual(method.name, "my_exact_op");
      strictEqual(method.isExactName, true);
    });
  });

  describe("exact naming on enum values", () => {
    it("marks enum value name as exact via exact()", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          enum Status {
            Active,
            Inactive,
          }

          op get(@query status: Status): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.Status.Active, exact("my_active_value"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const enumType = sdkPackage.enums[0];
      const activeValue = enumType.values.find((v) => v.name === "my_active_value");
      strictEqual(activeValue?.isExactName, true);
      const inactiveValue = enumType.values.find((v) => v.name === "Inactive");
      strictEqual(inactiveValue?.isExactName, false);
    });
  });

  describe("exact naming on clients", () => {
    it("marks client name as exact via exact()", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          @route("/test")
          op testOp(): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService, exact("my_exact_client"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const sdkPackage = context.sdkPackage;
      const client = sdkPackage.clients[0];
      strictEqual(client.name, "my_exact_client");
      strictEqual(client.isExactName, true);
    });
  });
});
