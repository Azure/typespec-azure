import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});
it("head operation marked as void", async () => {
  await runner.compileWithBuiltInService(`
    @responseAsBool
    @head
    op headOperation(): void;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");
  const operation = method.operation;
  strictEqual(operation.responses.length, 2);

  const twoOFourResponse = operation.responses.find((x) => x.statusCodes === 204);
  ok(twoOFourResponse);
  strictEqual(twoOFourResponse.type?.kind, "constant");
  strictEqual(twoOFourResponse.type.value, true);
  strictEqual(twoOFourResponse.type.valueType.kind, "boolean");

  const fourOFourResponse = operation.responses.find((x) => x.statusCodes === 404);
  ok(fourOFourResponse);
  strictEqual(fourOFourResponse.type?.kind, "constant");
  strictEqual(fourOFourResponse.type.value, false);
  strictEqual(fourOFourResponse.type.valueType.kind, "boolean");

  strictEqual(operation.exceptions.length, 0);

  strictEqual(method.response.type?.kind, "boolean");
});

it("head operation marked as void with error model", async () => {
  await runner.compileWithBuiltInService(`
    @error
    model Error {
      code: int32;
      message: string;
    }

    @responseAsBool
    @head
    op headOperation(): void | Error;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");
  const operation = method.operation;
  strictEqual(operation.responses.length, 2);

  const twoOFourResponse = operation.responses.find((x) => x.statusCodes === 204);
  ok(twoOFourResponse);
  strictEqual(twoOFourResponse.type?.kind, "constant");
  strictEqual(twoOFourResponse.type.value, true);
  strictEqual(twoOFourResponse.type.valueType.kind, "boolean");

  const fourOFourResponse = operation.responses.find((x) => x.statusCodes === 404);
  ok(fourOFourResponse);
  strictEqual(fourOFourResponse.type?.kind, "constant");
  strictEqual(fourOFourResponse.type.value, false);
  strictEqual(fourOFourResponse.type.valueType.kind, "boolean");

  strictEqual(operation.exceptions.length, 1);

  strictEqual(method.response.type?.kind, "boolean");
});

it("head operation with explicitly marked valid response", async () => {
  await runner.compileWithBuiltInService(`
    @responseAsBool
    @head
    op headOperation(): boolean;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");
  const operation = method.operation;
  strictEqual(operation.responses.length, 2);
  const twoOFourResponse = operation.responses.find((x) => x.statusCodes === 200);
  ok(twoOFourResponse);
  strictEqual(twoOFourResponse.type?.kind, "constant");
  strictEqual(twoOFourResponse.type.value, true);
  strictEqual(twoOFourResponse.type.valueType.kind, "boolean");
  const fourOFourResponse = operation.responses.find((x) => x.statusCodes === 404);
  ok(fourOFourResponse);
  strictEqual(fourOFourResponse.type?.kind, "constant");
  strictEqual(fourOFourResponse.type.value, false);
  strictEqual(fourOFourResponse.type.valueType.kind, "boolean");
  strictEqual(method.response.type?.kind, "boolean");
});
it("head operation with explicitly marked 404", async () => {
  await runner.compileWithBuiltInService(`
    @error
    model Error {
      code: int32;
      message: string;
    }

    @error
    model FourOFourError {
      @statusCode _: 404;
      message: string;
    }
    @responseAsBool
    @head
    op headOperation(): void | FourOFourError | Error;
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = sdkPackage.clients[0].methods[0];
  strictEqual(method.kind, "basic");
  const operation = method.operation;
  strictEqual(operation.responses.length, 2);

  const twoOFourResponse = operation.responses.find((x) => x.statusCodes === 204);
  ok(twoOFourResponse);
  strictEqual(twoOFourResponse.type?.kind, "constant");
  strictEqual(twoOFourResponse.type.value, true);
  strictEqual(twoOFourResponse.type.valueType.kind, "boolean");

  const fourOFourResponse = operation.responses.find((x) => x.statusCodes === 404);
  ok(fourOFourResponse);
  strictEqual(fourOFourResponse.type?.kind, "constant");
  strictEqual(fourOFourResponse.type.value, false);
  strictEqual(fourOFourResponse.type.valueType.kind, "boolean");
});
it("non-head operation", async () => {
  const diagnostics = await runner.diagnose(`
    @responseAsBool
    @get
    op getOperation(): boolean;
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/non-head-bool-response-decorator",
    message:
      "@responseAsBool decorator can only be used on HEAD operations. Will ignore decorator on getOperation.",
  });
});
