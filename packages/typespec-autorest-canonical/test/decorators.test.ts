import { getAsEmbeddingVector } from "@azure-tools/typespec-azure-core";
import { Model, Namespace, Scalar } from "@typespec/compiler";
import { BasicTestRunner } from "@typespec/compiler/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { createAutorestCanonicalTestRunner, openApiFor } from "./test-host.js";

let runner: BasicTestRunner;

beforeEach(async () => {
  runner = await createAutorestCanonicalTestRunner();
});

describe("@embeddingVector", () => {
  it("returns embedding vector metadata for embedding vector models", async () => {
    const [result, _] = await runner.compileAndDiagnose(`
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @test @service({title:"MyService"})
      namespace MyNamespace;

      model MyVector is EmbeddingVector<int64>;
      `);
    const ns = result["MyNamespace"] as Namespace;
    const model = ns.models.get("MyVector") as Model;
    const metadata = getAsEmbeddingVector(runner.program, model);
    deepStrictEqual((metadata!.elementType as Scalar).name, "int64");
  });

  it("returns undefined for non-embedding vector models", async () => {
    const [result, _] = await runner.compileAndDiagnose(`
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      @test @service({title:"MyService"})
      namespace MyNamespace;

      model Foo {};
      `);
    const ns = result["MyNamespace"] as Namespace;
    const model = ns.models.get("MyVector") as Model;
    const metadata = getAsEmbeddingVector(runner.program, model);
    strictEqual(metadata, undefined);
  });
});

describe("@operationId", () => {
  it("preserves casing of explicit @operationId decorator", async () => {
    const openapi = await openApiFor(`
        @get
        @operationId("Pets_GET")
        op read(): string;
      `);

    deepStrictEqual(openapi.paths["/"].get.operationId, "Pets_GET");
  });
});
