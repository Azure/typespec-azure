import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getClientDocExplicit } from "../../src/decorators.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("@clientDoc model with append mode", async () => {
  await runner.compileWithBuiltInService(`
      @doc("Original model documentation")
      @clientDoc("Additional client documentation", DocumentationMode.append)
      @usage(Usage.input)
      model TestModel {
        prop: string;
      }
    `);

  const sdkContext = runner.context;
  const model = sdkContext.sdkPackage.models[0];

  // Check doc data is stored correctly
  const clientDocInfo = getClientDocExplicit(sdkContext, model.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Additional client documentation");
  strictEqual(clientDocInfo.mode, "append");

  // Check doc is accessible from model
  strictEqual(model.doc, "Original model documentation\nAdditional client documentation");
});

it("@clientDoc method with replace mode", async () => {
  await runner.compileWithBuiltInService(`
      @doc("Original operation documentation")
      @clientDoc("Client-specific documentation", DocumentationMode.replace)
      @get
      op test(): string;
    `);

  const sdkContext = runner.context;
  const method = sdkContext.sdkPackage.clients[0].methods[0];

  // Check doc data is stored correctly
  const clientDocInfo = getClientDocExplicit(sdkContext, method.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Client-specific documentation");
  strictEqual(clientDocInfo.mode, "replace");

  // Check doc is accessible from operation
  strictEqual(method.doc, "Client-specific documentation");
});

it("@clientDoc property with append mode", async () => {
  await runner.compileWithBuiltInService(`
      @usage(Usage.input)
      model TestModel {
        @doc("Original property documentation")
        @clientDoc("Client property documentation", DocumentationMode.append)
        prop: string;
      }
    `);

  const sdkContext = runner.context;
  const model = sdkContext.sdkPackage.models[0];
  const property = model.properties[0];

  // Check doc data is stored correctly
  const clientDocInfo = getClientDocExplicit(sdkContext, property.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Client property documentation");
  strictEqual(clientDocInfo.mode, "append");

  // Check doc is accessible from property
  strictEqual(property.doc, "Original property documentation\nClient property documentation");
});

it("@clientDoc enum with append mode", async () => {
  await runner.compileWithBuiltInService(`
      @doc("Original enum documentation")
      @clientDoc("Client enum documentation", DocumentationMode.append)
      @usage(Usage.input)
      enum Colors {
        Red,
        Green,
        Blue
      }
    `);

  const sdkContext = runner.context;
  const enumType = sdkContext.sdkPackage.enums[0];

  // Check doc data is stored correctly
  const clientDocInfo = getClientDocExplicit(sdkContext, enumType.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Client enum documentation");
  strictEqual(clientDocInfo.mode, "append");

  // Check doc is accessible from enum
  strictEqual(enumType.doc, "Original enum documentation\nClient enum documentation");
});

it("@clientDoc enum member with replace mode", async () => {
  await runner.compileWithBuiltInService(`
    @usage(Usage.input)
      enum Colors {
        @doc("Original enum member doc")
        @clientDoc("Client enum member doc", DocumentationMode.replace)
        Red,
        Green,
        Blue
      }
    `);

  const sdkContext = runner.context;
  const enumType = sdkContext.sdkPackage.enums[0];
  const enumMember = enumType.values[0];

  // Check doc data is stored correctly
  const clientDocInfo = getClientDocExplicit(sdkContext, enumMember.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Client enum member doc");
  strictEqual(clientDocInfo.mode, "replace");

  // Check doc is accessible from enum member
  strictEqual(enumMember.doc, "Client enum member doc");
});

it("@clientMode with scope", async () => {
  await runner.compileWithBuiltInService(`
      @doc("Original documentation")
      @clientDoc("Python documentation", DocumentationMode.replace, "python")
      @clientDoc("JavaScript documentation", DocumentationMode.replace, "javascript")
      @usage(Usage.input)
      model TestModel {
        prop: string;
      }
    `);

  const sdkContext = runner.context;
  const model = sdkContext.sdkPackage.models[0];

  // Since our test runner uses python emitter, we should see the Python documentation
  const clientDocInfo = getClientDocExplicit(sdkContext, model.__raw!);
  ok(clientDocInfo, "Client documentation data should exist");
  strictEqual(clientDocInfo.documentation, "Python documentation");
  strictEqual(clientDocInfo.mode, "replace");

  // Check doc is accessible from model
  strictEqual(model.doc, "Python documentation");
});

it("reports error when an invalid mode is used", async () => {
  const diagnostics = await runner.diagnose(`
      enum InvalidMode {
        invalid: "invalid"
      }
      
      @doc("Original documentation")
      @clientDoc("Invalid mode", InvalidMode.invalid)
      model TestModel {
        prop: string;
      }
    `);

  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-client-doc-mode",
    message:
      /Invalid mode 'invalid' for @clientDoc decorator. Valid values are "append" or "replace"./,
  });
});

it("reports error when an invalid mode value is used", async () => {
  const diagnostics = await runner.diagnose(`
      enum CustomMode {
        custom: "custom"
      }
      
      @doc("Original documentation")
      @clientDoc("Invalid mode value", CustomMode.custom)
      model TestModel {
        prop: string;
      }
    `);

  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-doc-mode",
      message:
        /Invalid mode 'custom' for @clientDoc decorator. Valid values are "append" or "replace"./,
    },
  ]);
});
