import { strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTesterWithService,
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
    it("preserves exact names when synthesizing a model discriminator from a subtype property", async () => {
      const { program } = await SimpleTesterWithService.compile(`
        @discriminator("kind")
        model PetBase {}
        model Cat extends PetBase {
          @clientName(exact("Pet_KIND")) kind: "cat";
        }
        op get(): PetBase;
      `);
      const context = await createSdkContextForTester(program);
      const base = context.sdkPackage.models.find((model) => model.name === "PetBase");
      strictEqual(base?.discriminatorProperty?.name, "Pet_KIND");
      strictEqual(base?.discriminatorProperty?.isExactName, true);
    });

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

  describe("exact naming on unions", () => {
    it("marks regular union name as exact with language scope and false for regular @clientName", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model MCPToolFilter {
            toolNames: string[];
          }

          union MCPToolAllowedTools {
            string[],
            MCPToolFilter,
          }

          union RenamedUnion {
            string[],
            MCPToolFilter,
          }

          op send(@body body: {
            allowedTools: MCPToolAllowedTools;
            renamed: RenamedUnion;
          }): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.MCPToolAllowedTools, exact("_MCPToolAllowedTools"), "javascript");
          @@clientName(MyService.RenamedUnion, "CustomUnion");
          `,
        ),
      );

      {
        const context = await createSdkContextForTester(program, {
          emitterName: "@azure-tools/typespec-ts",
        });
        const exactUnion = context.sdkPackage.unions.find((u) => u.name === "_MCPToolAllowedTools");
        strictEqual(exactUnion?.kind, "union");
        strictEqual(exactUnion?.isExactName, true);
        strictEqual(exactUnion?.isGeneratedName, false);

        const renamedUnion = context.sdkPackage.unions.find((u) => u.name === "CustomUnion");
        strictEqual(renamedUnion?.kind, "union");
        strictEqual(renamedUnion?.isExactName, false);
      }

      {
        const context = await createSdkContextForTester(program, {
          emitterName: "@azure-tools/typespec-python",
        });
        const defaultUnion = context.sdkPackage.unions.find(
          (u) => u.name === "MCPToolAllowedTools",
        );
        strictEqual(defaultUnion?.kind, "union");
        strictEqual(defaultUnion?.isExactName, false);
      }
    });

    it("preserves exact union name through anonymous nullable @alternateType", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace OpenAI;

          model MCPToolFilter {
            tool_names: string[];
          }

          model ToolMcpTool {
            allowed_tools?: string[] | MCPToolFilter | null;
          }

          @route("/tool")
          @post
          op useTool(@body body: ToolMcpTool): ToolMcpTool;
          `,
          `
          namespace CustomizedToolCompatibility {
            #suppress "experimental-feature" "testing exact"
            @clientName(exact("_MCPToolAllowedTools"))
            union MCPToolAllowedTools {
              string[],
              OpenAI.MCPToolFilter,
            }
          }

          @@alternateType(
            OpenAI.ToolMcpTool.allowed_tools,
            CustomizedToolCompatibility.MCPToolAllowedTools | null
          );
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const toolModel = context.sdkPackage.models.find((m) => m.name === "ToolMcpTool");
      const allowedToolsProp = toolModel?.properties.find((p) => p.name === "allowed_tools");
      strictEqual(allowedToolsProp?.type.kind, "nullable");
      strictEqual(allowedToolsProp.type.isGeneratedName, true);
      strictEqual(allowedToolsProp.type.isExactName, false);
      strictEqual(allowedToolsProp.type.type.kind, "union");
      strictEqual(allowedToolsProp.type.type.name, "_MCPToolAllowedTools");
      strictEqual(allowedToolsProp.type.type.isGeneratedName, false);
      strictEqual(allowedToolsProp.type.type.isExactName, true);
    });

    it("marks named nullable unions as exact across single-type, enum, and multi-variant unions", async () => {
      const { program } = await SimpleBaseTester.compile(
        createClientCustomizationInput(
          `
          @service
          namespace MyService;

          model Item {
            id: string;
          }

          union NullableItem {
            Item,
            null,
          }

          union NullableEnum {
            string,
            one: "one",
            null,
          }

          union NullableMixed {
            string[],
            Item,
            null,
          }

          op send(@body body: {
            item: NullableItem;
            choice: NullableEnum;
            mixed: NullableMixed;
          }): void;
          `,
          `
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.NullableItem, exact("_NullableItem"));
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.NullableEnum, exact("_NullableEnum"));
          #suppress "experimental-feature" "testing exact"
          @@clientName(MyService.NullableMixed, exact("_NullableMixed"));
          `,
        ),
      );

      const context = await createSdkContextForTester(program);
      const nullableItem = context.sdkPackage.unions.find((u) => u.name === "_NullableItem");
      strictEqual(nullableItem?.kind, "nullable");
      strictEqual(nullableItem.isGeneratedName, false);
      strictEqual(nullableItem.isExactName, true);

      const nullableEnum = context.sdkPackage.unions.find((u) => u.name === "_NullableEnum");
      strictEqual(nullableEnum?.kind, "nullable");
      strictEqual(nullableEnum.isGeneratedName, false);
      strictEqual(nullableEnum.isExactName, true);
      strictEqual(nullableEnum.type.kind, "enum");
      strictEqual(nullableEnum.type.isExactName, true);

      const nullableMixed = context.sdkPackage.unions.find((u) => u.name === "_NullableMixed");
      strictEqual(nullableMixed?.kind, "nullable");
      strictEqual(nullableMixed.isGeneratedName, false);
      strictEqual(nullableMixed.isExactName, true);
      strictEqual(nullableMixed.type.kind, "union");
      strictEqual(nullableMixed.type.name, "_NullableMixed");
      strictEqual(nullableMixed.type.isGeneratedName, true);
      strictEqual(nullableMixed.type.isExactName, true);
    });
  });
});
