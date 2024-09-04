import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { getHttpPart, isOrExtendsHttpFile } from "@typespec/http";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { getOperations } from "./test-host.js";

describe("typespec-azure-core: models", () => {
  it("MultiPartFile could be recognized by @typespec/http", async () => {
    const [operations, diagnostics, runner] = await getOperations(
      `
      model TestModel {
        file: HttpPart<MultiPartFile>;
      };

      @post op TestOperation(@header contentType: "multipart/form-date", @multipartBody body: TestModel): void;
      `
    );

    ok(operations.length === 1);
    ok(operations[0].parameters.body);
    strictEqual(operations[0].parameters.body.bodyKind, "multipart");
    strictEqual(operations[0].parameters.body.type.kind, "Model");
    const fileHttpPart = operations[0].parameters.body.type.properties.get("file");
    ok(fileHttpPart);
    const file = getHttpPart(runner.program, fileHttpPart.type);
    ok(file !== undefined);
    ok(isOrExtendsHttpFile(runner.program, file.type));
    expectDiagnosticEmpty(diagnostics);
  });
});
