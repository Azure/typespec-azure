import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

it("head operation marked as void", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @responseAsBool
    @head
    op headOperation(): void;
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
    @error
    model Error {
      code: int32;
      message: string;
    }

    @responseAsBool
    @head
    op headOperation(): void | Error;
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
    @responseAsBool
    @head
    op headOperation(): boolean;
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const diagnostics = await SimpleTester.diagnose(`
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
