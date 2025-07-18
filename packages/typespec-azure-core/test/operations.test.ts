import { Model, StringLiteral } from "@typespec/compiler";
import {
  BasicTestRunner,
  expectDiagnosticEmpty,
  expectDiagnostics,
} from "@typespec/compiler/testing";
import { HttpOperation } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { isFinalLocation, isPollingLocation } from "../src/decorators.js";
import { LroMetadata, getLroMetadata } from "../src/lro-helpers.js";
import { getNamespaceName } from "../src/rules/utils.js";
import {
  SimpleHttpOperation,
  createAzureCoreTestRunner,
  getOperations,
  getSimplifiedOperations,
} from "./test-host.js";

describe("typespec-azure-core: operation templates", () => {
  it("gathers metadata about ResourceCreateOrUpdate operation template", async () => {
    const [operations, diagnostics] = await getOperations(
      `
      @resource("test")
      model TestModel {
        @key
        name: string;

        data: string;
      };

      @test op resourceUpsert is StandardResourceOperations.ResourceCreateOrUpdate<TestModel>;
      `,
    );

    ok(operations.length === 1);
    strictEqual(operations[0].path, "/test/{name}");
    strictEqual(operations[0].verb, "patch");

    const contentTypeParam = operations[0].parameters.parameters.find(
      (p) => p.name === "Content-Type",
    );
    ok(contentTypeParam, "No Content-Type header was found.");
    strictEqual(contentTypeParam!.type, "header");
    strictEqual(contentTypeParam!.param.type.kind, "String");
    strictEqual(
      (contentTypeParam!.param.type as StringLiteral).value,
      "application/merge-patch+json",
    );

    expectDiagnosticEmpty(diagnostics);
  });

  it("recursively make updatable properties optional for Upsert", async () => {
    const runner = await createAzureCoreTestRunner();
    const _ = (await runner.compile(
      `
      @test
      model FlowerProperties {
        petals: int32;
        berries?: "banana" | "tomato"
      }

      @test
      @resource("flowers")
      model Flower {
        @key
        name: string;
        description?: string;

        similarFlowers: Flower[];

        properties: FlowerProperties;
      }

      @test
      model UpsertableFlowerProperties is Azure.Core.Foundations.ResourceCreateOrUpdateModel<FlowerProperties> {};

      @test
      model UpsertableFlower is Azure.Core.Foundations.ResourceCreateOrUpdateModel<Flower> {};
      `,
    )) as {
      FlowerProperties: Model;
      Flower: Model;
      UpsertableFlowerProperties: Model;
      UpsertableFlower: Model;
    };

    // function assertAllOptional(model: ModelType, visited: Set<string>) {
    //   model.properties.forEach((prop) => {
    //     ok(prop.optional, `Property ${prop.name} was not made optional?`);
    //     if (prop.type.kind === "Model" && !visited.has(prop.type.name)) {
    //       visited.add(prop.type.name);
    //       assertAllOptional(prop.type, visited);
    //     }
    //   });
    // }
    // TODO: We need to recursively make things optional
    //assertAllOptional(compiled.UpsertableFlowerProperties, new Set<string>());
    //assertAllOptional(compiled.UpsertableFlower, new Set<string>());
  });

  it("properly annotates long-running operations with a status monitor", async () => {
    const [operations, diagnostics, runner] = await getOperations(
      `
      @resource("test")
      model TestModel {
        @key
        name: string;
      };

      @test op create is StandardResourceOperations.LongRunningResourceCreateWithServiceProvidedName<TestModel>;
      @test op createReplace is StandardResourceOperations.LongRunningResourceCreateOrReplace<TestModel>;
      @test op delete is Azure.Core.LongRunningResourceDelete<TestModel>;

      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      @TypeSpec.Http.route("basic")
@test op basicOp is Azure.Core.Foundations.LongRunningOperation<{}>;
      `,
    );

    function hasLocationHeader(operation: HttpOperation, statusCode: number = 201): void {
      const response = operation.responses.find((r) => r.statusCodes === statusCode);
      ok(response);
      const locationHeader = response.responses[0].headers?.["Location"];
      ok(locationHeader, `No location header: ${operation.operation.name}`);
      ok(
        isFinalLocation(runner.program, locationHeader),
        `@finalLocation not found: ${operation.operation.name}`,
      );
    }

    function hasOperationLocationHeader(operation: HttpOperation, statusCode: number = 201): void {
      const response = operation.responses.find((r) => r.statusCodes === statusCode);
      ok(response);
      const operationLocationHeader = response.responses[0].headers?.["Operation-Location"];
      ok(operationLocationHeader, `No Operation-Location header: ${operation.operation.name}`);
      ok(
        isPollingLocation(runner.program, operationLocationHeader),
        `@pollingLocation not found: ${operation.operation.name}`,
      );
    }

    expectDiagnosticEmpty(diagnostics);

    strictEqual(operations.length, 4);
    const createOp = operations[0];
    strictEqual(createOp.operation.name, "create");
    hasLocationHeader(createOp, 202);

    const createReplaceOp = operations[1];
    strictEqual(createReplaceOp.operation.name, "createReplace");
    hasOperationLocationHeader(createReplaceOp);

    // NOTE: CreateOrUpdate does not return an LRO status!

    const deleteOp = operations[2];
    strictEqual(deleteOp.operation.name, "delete");
    hasOperationLocationHeader(deleteOp, 202);

    const basicOp = operations[3];
    strictEqual(basicOp.operation.name, "basicOp");
    hasOperationLocationHeader(basicOp, 202);
  });

  it("allows derived class to derive resource metadata from base class", async () => {
    const [_, diagnostics] = await getOperations(`
      @resource("foo")
      model BaseWithKey {
        @key
        name: string;
      }

      model Derived extends BaseWithKey {
        extra: string;
      }

      op read is Azure.Core.StandardResourceOperations.ResourceRead<Derived>;
    `);
    expectDiagnosticEmpty(diagnostics);
  });

  it("emits diagnostic when invalid resource type is given", async () => {
    const [_, diagnostics] = await getOperations(`
      model NoKeyModel {
        name: string;
      }

      model NoSegmentModel {
        @key
        name: string;
      }

      op read is Azure.Core.ResourceRead<NoKeyModel>;
      op create is StandardResourceOperations.ResourceCreateOrUpdate<NoSegmentModel>;
    `);

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-core/invalid-resource-type",
        message:
          "Model type 'Azure.MyService.NoKeyModel' is not a valid resource type.  It must contain a property decorated with '@key'.",
      },
      {
        code: "@azure-tools/typespec-azure-core/invalid-resource-type",
        message:
          "Model type 'Azure.MyService.NoSegmentModel' is not a valid resource type.  It must be decorated with the '@resource' decorator.",
      },
    ]);
  });

  function wrapResourceCode(code: string): string {
    return `
    model TestModel {
      @key
      @segment("test")
      name: string;
      value: int32;
    }

    model CustomRequestHeaders {
      @header
      "x-ms-foobar": string;
    }

    model CustomQueryParameters {
      @query
      nameHint: string;
    }

    model CustomParameters { ...CustomRequestHeaders; ...CustomQueryParameters; }

    model CustomResponseProperties {
      @header
      "x-ms-response-id": int32;
    }

    alias Customizations = Azure.Core.Traits.RequestHeadersTrait<CustomRequestHeaders> & Azure.Core.Traits.QueryParametersTrait<CustomQueryParameters> & Azure.Core.Traits.ResponseHeadersTrait<CustomResponseProperties>;

    ${code}
    `;
  }

  async function compileResourceOperations(code: string): Promise<SimpleHttpOperation[]> {
    const [operations, diagnostics] = await getSimplifiedOperations(wrapResourceCode(code));

    expectDiagnosticEmpty(diagnostics);
    return operations;
  }

  async function compileResourceOperation(code: string): Promise<SimpleHttpOperation> {
    const operations = await compileResourceOperations(code);
    strictEqual(operations.length, 1);
    return operations[0];
  }

  async function compileLroOperation(
    code: string,
    operationName?: string,
  ): Promise<[HttpOperation, LroMetadata | undefined, BasicTestRunner]> {
    let [operations, diagnostics, runner] = await getOperations(
      `
      model TestModel {
        @key
        @segment("test")
        name: string;
        value: int32;
      }

      model CustomRequestHeaders {
        @header
        "x-ms-foobar": string;
      }

      model CustomQueryParameters {
        @query
        nameHint: string;
      }

      model CustomParameters { ...CustomRequestHeaders; ...CustomQueryParameters; }

      model CustomResponseProperties {
        @header
        "x-ms-response-id": int32;
      }

      alias Customizations = Azure.Core.Traits.RequestHeadersTrait<CustomRequestHeaders> & Azure.Core.Traits.QueryParametersTrait<CustomQueryParameters> & Azure.Core.Traits.ResponseHeadersTrait<CustomResponseProperties>;

      ${code}
      `,
    );

    expectDiagnosticEmpty(diagnostics);

    if (operationName !== undefined) {
      operations = operations.filter((o) => o.operation.name === operationName);
    }

    strictEqual(operations.length, 1);
    const lro = getLroMetadata(runner.program, operations[0].operation);
    expectDiagnosticEmpty(runner.program.diagnostics);

    return [operations[0], lro, runner];
  }

  const expectedParams = [
    {
      name: "api-version",
      type: "query",
    },
    {
      name: "x-ms-foobar",
      type: "header",
    },
    {
      name: "nameHint",
      type: "query",
    },
  ];

  const expectedParamsWithName = [...expectedParams];
  expectedParamsWithName.splice(1, 0, {
    name: "name",
    type: "path",
  });

  it("ResourceRead", async () => {
    const operation = await compileResourceOperation(
      `@test op read is Azure.Core.ResourceRead<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "read",
      verb: "get",
      path: "/test/{name}",
      params: {
        body: undefined,
        params: expectedParamsWithName,
      },
      responseProperties: ["name", "value", "x-ms-response-id"],
    });
  });

  it("emits warning if you overload a standard operation with a different verb", async () => {
    const [_, diagnostics] = await getOperations(`
      @resource("widgets")
      model Widget {
        @key
        @visibility(Lifecycle.Read)
        name: string;
      }

      @test @delete op read is Azure.Core.ResourceRead<Widget>;
    `);
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-core/verb-conflict",
        severity: "warning",
        message: "Operation template 'ResourceRead' requires HTTP verb 'GET' but found 'DELETE'.",
      },
    ]);
  });

  it("ResourceList", async () => {
    const operation = await compileResourceOperation(
      `@test op list is Azure.Core.ResourceList<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "list",
      verb: "get",
      path: "/test",
      params: {
        body: undefined,
        params: expectedParams,
      },
      responseProperties: ["value", "nextLink", "x-ms-response-id"],
    });
  });

  it("NonPagedResourceList", async () => {
    const operation = await compileResourceOperation(
      `
      #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
      @test op list is Azure.Core.Foundations.NonPagedResourceList<TestModel, Customizations>;
      `,
    );

    deepStrictEqual(operation, {
      name: "list",
      verb: "get",
      path: "/test",
      params: {
        body: undefined,
        params: expectedParams,
      },
      responseProperties: ["body", "x-ms-response-id"],
    });
  });

  it("ResourceCreateWithServiceProvidedName", async () => {
    const operation = await compileResourceOperation(
      `@test op create is StandardResourceOperations.ResourceCreateWithServiceProvidedName<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "create",
      verb: "post",
      path: "/test",
      params: {
        body: "resource",
        params: expectedParams,
      },
      responseProperties: ["statusCode", "location", "x-ms-response-id"],
    });
  });

  it("ResourceCreateOrUpdate", async () => {
    const operation = await compileResourceOperation(
      `@test op createOrUpdate is StandardResourceOperations.ResourceCreateOrUpdate<TestModel, Customizations>;`,
    );

    const params = [...expectedParamsWithName];
    params.splice(2, 0, {
      name: "Content-Type",
      type: "header",
    });

    deepStrictEqual(operation, {
      name: "createOrUpdate",
      verb: "patch",
      path: "/test/{name}",
      params: {
        body: "resource",
        params,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id"],
    });
  });

  it("ResourceUpdate", async () => {
    const operation = await compileResourceOperation(
      `@test op update is StandardResourceOperations.ResourceUpdate<TestModel, Customizations>;`,
    );

    const params = [...expectedParamsWithName];
    params.splice(2, 0, {
      name: "Content-Type",
      type: "header",
    });

    deepStrictEqual(operation, {
      name: "update",
      verb: "patch",
      path: "/test/{name}",
      params: {
        body: "resource",
        params,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id"],
    });
  });

  it("ResourceCreateOrReplace", async () => {
    const operation = await compileResourceOperation(
      `@test op createOrReplace is StandardResourceOperations.ResourceCreateOrReplace<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "createOrReplace",
      verb: "put",
      path: "/test/{name}",
      params: {
        body: "resource",
        params: expectedParamsWithName,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id"],
    });
  });

  it("ResourceDelete", async () => {
    const operation = await compileResourceOperation(
      `@test op delete is Azure.Core.ResourceDelete<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "delete",
      verb: "delete",
      path: "/test/{name}",
      params: {
        body: undefined,
        params: expectedParamsWithName,
      },
      responseProperties: ["statusCode", "x-ms-response-id"],
    });
  });

  it("LongRunningResourceCreateWithServiceProvidedName", async () => {
    const operation = await compileResourceOperation(
      `@test op create is StandardResourceOperations.LongRunningResourceCreateWithServiceProvidedName<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "create",
      verb: "post",
      path: "/test",
      params: {
        body: "resource",
        params: expectedParams,
      },
      responseProperties: ["statusCode", "location", "x-ms-response-id"],
    });
  });

  it("LongRunningResourceCreateOrUpdate", async () => {
    const operation = await compileResourceOperation(
      `@test op createOrUpdate is StandardResourceOperations.LongRunningResourceCreateOrUpdate<TestModel, Customizations>;`,
    );

    const params = [...expectedParamsWithName];
    params.splice(2, 0, {
      name: "Content-Type",
      type: "header",
    });

    deepStrictEqual(operation, {
      name: "createOrUpdate",
      verb: "patch",
      path: "/test/{name}",
      params: {
        body: "resource",
        params,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id", "operationLocation"],
    });
  });

  it("LongRunningResourceCreateOrReplace", async () => {
    const operation = await compileResourceOperation(
      `@test op createOrReplace is StandardResourceOperations.LongRunningResourceCreateOrReplace<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "createOrReplace",
      verb: "put",
      path: "/test/{name}",
      params: {
        body: "resource",
        params: expectedParamsWithName,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id", "operationLocation"],
    });
  });

  it("LongRunningResourceUpdate", async () => {
    const operation = await compileResourceOperation(
      `#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
       @test op update is Azure.Core.Foundations.LongRunningResourceUpdate<TestModel, Customizations>;`,
    );

    const params = [...expectedParamsWithName];
    params.splice(2, 0, {
      name: "Content-Type",
      type: "header",
    });

    deepStrictEqual(operation, {
      name: "update",
      verb: "patch",
      path: "/test/{name}",
      params: {
        body: "resource",
        params,
      },
      responseProperties: ["statusCode", "name", "value", "x-ms-response-id", "operationLocation"],
    });
  });

  it("LongRunningResourceDelete", async () => {
    const operation = await compileResourceOperation(
      `@test op delete is Azure.Core.LongRunningResourceDelete<TestModel, Customizations>;`,
    );

    deepStrictEqual(operation, {
      name: "delete",
      verb: "delete",
      path: "/test/{name}",
      params: {
        body: undefined,
        params: expectedParamsWithName,
      },
      responseProperties: [
        "statusCode",
        "id",
        "status",
        "error",
        "result",
        "operationLocation",
        "x-ms-response-id",
      ],
    });
  });

  it("ResourceAction", async () => {
    const operation = await compileResourceOperation(
      `
      // Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
      model OpParams {
        value: string;
        ...CustomParameters;
      };

      model OpResponse is CustomResponseProperties {
        message: string;
      }

      @test op customAction is Azure.Core.ResourceAction<TestModel, OpParams, OpResponse>;
      `,
    );

    deepStrictEqual(operation, {
      name: "customAction",
      verb: "post",
      path: "/test/{name}:customAction",
      params: {
        body: ["value"],
        params: expectedParamsWithName,
      },
      responseProperties: ["x-ms-response-id", "message"],
    });
  });

  it("ResourceAction customizations", async () => {
    const [operations, _] = await getOperations(
      `
      @TypeSpec.Rest.resource("things")
      model Thing {
        @key
        id: string
      }

      @TypeSpec.Rest.actionSeparator("/")
      @test op action2 is Azure.Core.ResourceAction<Thing, {}, {}>;
      `,
    );
    strictEqual(operations[0].path, "/things/{id}/action2");
  });

  it("ResourceCollectionAction", async () => {
    const operation = await compileResourceOperation(
      `
        // Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };

        model OpResponse is CustomResponseProperties {
          message: string;
        }
  
        @test op customAction is Azure.Core.ResourceCollectionAction<TestModel, OpParams, OpResponse>;`,
    );

    deepStrictEqual(operation, {
      name: "customAction",
      verb: "post",
      path: "/test:customAction",
      params: {
        body: ["value"],
        params: expectedParams,
      },
      responseProperties: ["x-ms-response-id", "message"],
    });
  });

  it("ResourceCollectionAction customizations", async () => {
    const [operations, _] = await getOperations(
      `
      @TypeSpec.Rest.resource("things")
      model Thing {
        @key
        id: string
      }
      
      @TypeSpec.Rest.actionSeparator("/")
      @test op customAction is Azure.Core.ResourceCollectionAction<Thing, {}, {}>;
      `,
    );
    strictEqual(operations[0].path, "/things/customAction");
  });

  describe("RpcOperation", () => {
    it("allows override of TraitContext", async () => {
      const operation = await compileResourceOperation(
        `@test @route("/test") op rpcOp is Azure.Core.RpcOperation<{}, TestModel, Customizations, Azure.Core.Foundations.ErrorResponse, Azure.Core.Traits.TraitContext.Read>;`,
      );

      deepStrictEqual(operation, {
        name: "rpcOp",
        verb: "get",
        path: "/test",
        params: {
          body: undefined,
          params: expectedParams,
        },
        responseProperties: ["name", "value", "x-ms-response-id"],
      });
    });

    it("works with default TraitContext.Undefined", async () => {
      const operation = await compileResourceOperation(
        `@test @route("/test") op rpcOp is Azure.Core.RpcOperation<{}, TestModel>;`,
      );

      deepStrictEqual(operation, {
        name: "rpcOp",
        verb: "get",
        path: "/test",
        params: {
          body: undefined,
          params: [
            {
              name: "api-version",
              type: "query",
            },
          ],
        },
        responseProperties: ["name", "value"],
      });
    });
  });

  describe("LongRunningRpcOperation", () => {
    it("allows override of TraitContext", async () => {
      const operations = await compileResourceOperations(
        `
        @doc("get lro status")
        @route("/lrRpcOp/{operationId}")
        @get op getStatus(@doc("The operation") @path operationId: string): PollingStatus;
  
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        model StatusError { message: string; }
        @test @pollingOperation(getStatus) @route("/lrRpcOp") op lrRpcOp is Azure.Core.LongRunningRpcOperation<{}, TestModel, PollingStatus, StatusError, Customizations, Azure.Core.Foundations.ErrorResponse, Azure.Core.Traits.TraitContext.Read>;
      `,
      );

      const statusOp = operations[0];
      const lroOp = operations[1];

      deepStrictEqual(lroOp, {
        name: "lrRpcOp",
        verb: "post",
        path: "/lrRpcOp",
        params: {
          body: undefined,
          params: [
            { type: "query", name: "api-version" },
            { type: "header", name: "x-ms-foobar" },
            { type: "query", name: "nameHint" },
          ],
        },
        responseProperties: [
          "statusCode",
          "id",
          "status",
          "error",
          "result",
          "operationLocation",
          "x-ms-response-id",
        ],
      });

      deepStrictEqual(statusOp, {
        name: "getStatus",
        verb: "get",
        path: "/lrRpcOp/{operationId}",
        params: {
          body: undefined,
          params: [
            {
              name: "operationId",
              type: "path",
            },
          ],
        },
        responseProperties: ["location", "statusValue"],
      });
    });

    it("works with default TraitContext.Undefined", async () => {
      const operations = await compileResourceOperations(
        `
        @doc("get lro status")
        @route("/lrRpcOp/{operationId}")
        @get op getStatus(@doc("The operation") @path operationId: string): PollingStatus;
  
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        model StatusError { message: string; }
        @test @pollingOperation(getStatus) @route("/lrRpcOp") op lrRpcOp is Azure.Core.LongRunningRpcOperation<{}, TestModel, PollingStatus, StatusError>;
      `,
      );

      const statusOp = operations[0];
      const lroOp = operations[1];

      deepStrictEqual(lroOp, {
        name: "lrRpcOp",
        verb: "post",
        path: "/lrRpcOp",
        params: {
          body: undefined,
          params: [{ type: "query", name: "api-version" }],
        },
        responseProperties: ["statusCode", "id", "status", "error", "result", "operationLocation"],
      });

      deepStrictEqual(statusOp, {
        name: "getStatus",
        verb: "get",
        path: "/lrRpcOp/{operationId}",
        params: {
          body: undefined,
          params: [
            {
              name: "operationId",
              type: "path",
            },
          ],
        },
        responseProperties: ["location", "statusValue"],
      });
    });
  });

  describe("LongRunningOperation", () => {
    it("Gets Lro for standard Async CreateOrUpdate", async () => {
      const [_, metadata] = await compileLroOperation(
        `@test op createOrUpdate is StandardResourceOperations.LongRunningResourceCreateOrUpdate<TestModel, Customizations>;`,
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "OperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async CreateOrUpdate with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        op poll is StandardResourceOperations.GetResourceOperationStatus<TestModel>;
  
        @Azure.Core.pollingOperation(poll)
        @test op createOrUpdate is StandardResourceOperations.LongRunningResourceCreateOrUpdate<TestModel, Customizations>;`,
        "createOrUpdate",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "ResourceOperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async CreateOrReplace", async () => {
      const [_, metadata] = await compileLroOperation(
        `@test op createOrReplace is StandardResourceOperations.LongRunningResourceCreateOrReplace<TestModel, Customizations>;`,
      );

      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, undefined);

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      // For createOrReplace, since the resource is returned in the 200 or 201 envelope, the status monitor will not return a results field
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "TestModel");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for standard Async CreateOrReplace with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        op poll is StandardResourceOperations.GetResourceOperationStatus<TestModel>;
  
        @Azure.Core.pollingOperation(poll)
        @test op createOrReplace is StandardResourceOperations.LongRunningResourceCreateOrReplace<TestModel, Customizations>;`,
        "createOrReplace",
      );

      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "ResourceOperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for non-resource PUT with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        /** The created job */
model Job {
  /** job id */
  @path
  @key
  @visibility(Lifecycle.Read)
  id: uuid;

  /** job name */
  name: string;
}

/** request to create a job */
model StartJobRequest {
  /** Name of the job */
  name: string;

  /** Job instructions */
  instructions: string[];
}

model JobStatus is Azure.Core.Foundations.OperationStatus<Job>;

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Non-resource operation"
@route("/jobs/{id}")
op getJobStatus is Foundations.GetOperationStatus<
  Rest.Resource.KeysOf<Job>,
  Job
>;

alias JobLroResponse = {
  @header("Operation-Location") operationLocation: url;
  ...Azure.Core.Foundations.OperationStatus<Job>;
};

/** Start a job */
#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Non-resource operation"
@pollingOperation(getJobStatus)
@route("/startJob/")
@put
op startJobAsync(
  ...Azure.Core.Foundations.ApiVersionParameter,

  /** body */
  @body _: StartJobRequest,
): (CreatedResponse & JobLroResponse) | (OkResponse &
  JobLroResponse) | Azure.Core.Foundations.ErrorResponse;
`,
        "startJobAsync",
      );

      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "Job");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "Job");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "OperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for custom PUT with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        /** The created job */
        @resource("jobs")
model Job {
  /** job id */
  @path
  @key
  @visibility(Lifecycle.Read)
  name: string;

  /** Job instructions */
  instructions: string[];
}

/** request to create a job */
model StartJobRequest {
  /** Name of the job */
  name: string;

  /** Job instructions */
  instructions: string[];
}

model JobStatus is Azure.Core.Foundations.OperationStatus;

#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Non-resource operation"
@route("/jobs/status/{name}")
op getJobStatus is Foundations.GetOperationStatus<
  Rest.Resource.KeysOf<Job>,
  Job
>;

op read is StandardResourceOperations.ResourceRead<Job>;

alias JobLroResponse = {
  @header("Operation-Location") operationLocation: string;
  ...Azure.Core.Foundations.OperationStatus<Job>;
};

/** Start a job */
#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "test"
@finalOperation(read)
@pollingOperation(getJobStatus)
@createsOrReplacesResource(Job)
@route("/jobs/{name}")
@put
op createJob(
  ...Azure.Core.Foundations.ApiVersionParameter,
  @path name: string,
  @bodyRoot body: Job,
): (CreatedResponse & JobLroResponse) | (OkResponse &
  JobLroResponse) | Azure.Core.Foundations.ErrorResponse;
`,
        "createJob",
      );

      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "Job");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "Job");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "Job");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for standard Async Delete", async () => {
      const [_, metadata, runner] = await compileLroOperation(
        `@test op delete is Azure.Core.LongRunningResourceDelete<TestModel, Customizations>;`,
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, undefined);

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "OperationStatus");
      deepStrictEqual(
        getNamespaceName(runner.program, metadata.logicalResult.namespace),
        "Azure.Core.Foundations",
      );
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata.finalEnvelopeResult, "void");
      deepStrictEqual(metadata.finalResultPath, undefined);
      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "noPollingResult");
    });

    it("Gets Lro for standard Async Delete with polling reference", async () => {
      const [_, metadata, runner] = await compileLroOperation(
        `
        op poll is StandardResourceOperations.GetResourceOperationStatus<TestModel, never>;
  
        @Azure.Core.pollingOperation(poll)
        @test op delete is Azure.Core.LongRunningResourceDelete<TestModel, Customizations>;`,
        "delete",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "ResourceOperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, undefined);

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "ResourceOperationStatus");
      deepStrictEqual(
        getNamespaceName(runner.program, metadata.logicalResult.namespace),
        "Azure.Core",
      );
      deepStrictEqual(metadata.envelopeResult.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata.finalEnvelopeResult, "void");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "noPollingResult");
    });

    it("Gets Lro for standard Async Update", async () => {
      const [_, metadata] = await compileLroOperation(
        `#suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
         @test op update is Azure.Core.Foundations.LongRunningResourceUpdate<TestModel, Customizations>;`,
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "OperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async Update with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
         op poll is StandardResourceOperations.GetResourceOperationStatus<TestModel>;
  
        
         #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "This is a test."
         @Azure.Core.pollingOperation(poll)
         @test op update is Azure.Core.Foundations.LongRunningResourceUpdate<TestModel, Customizations>;`,
        "update",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "ResourceOperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async ResourceAction", async () => {
      const [_, metadata] = await compileLroOperation(
        `// Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };
  
        model OpResponse is CustomResponseProperties {
          message: string;
        }
  
        @test op doAction is Azure.Core.LongRunningResourceAction<TestModel, OpParams, OpResponse>;`,
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "OperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "OperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "OpResponse");
      deepStrictEqual(metadata.envelopeResult.name, "OperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "OpResponse");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "OperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async ResourceAction with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        // Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };
  
        model OpResponse is CustomResponseProperties {
          message: string;
        }
        op poll is StandardResourceOperations.GetResourceOperationStatus<TestModel>;
  
        @Azure.Core.pollingOperation(poll)
        @test op doAction is Azure.Core.LongRunningResourceAction<TestModel, OpParams, OpResponse>;`,
        "doAction",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "ResourceOperationStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "ResourceOperationStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for standard Async RpcOperation with polling reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        @doc("get lro status")
        @route("/lrRpcOp/{operationId}")
        @get op getStatus(@doc("The operation") @path operationId: string): PollingStatus;
  
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<TestModel>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";

          @doc("The result")
          @Azure.Core.lroResult
          result?: TestModel;
        }
  
        model StatusError { message: string; }
        @test @pollingOperation(getStatus) @route("/lrRpcOp") op lrRpcOp is Azure.Core.LongRunningRpcOperation<{}, TestModel, PollingStatus, StatusError, Customizations, Azure.Core.Foundations.ErrorResponse, Azure.Core.Traits.TraitContext.Read>;`,
        "lrRpcOp",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "PollingStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "result");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "TestModel");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "TestModel");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "PollingStatus");
      deepStrictEqual(metadata.finalResultPath, "result");
    });

    it("Gets Lro for polling and final reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        @doc("simple polling status")
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        @doc("A sample widget")
        model SimpleWidget {
          @doc("The widget identity")
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          @doc("A value")
          value: string;
        }
  
        @doc("Get a widget")
        @route("/simpleWidgets/{id}")
        @get op getWidget(@doc("The id") @path id: string): SimpleWidget;
  
        @doc("Create a widget")
        @finalOperation(getWidget, {@doc("The id") id: ResponseProperty<"id">})
        @pollingOperation(getStatus, {@doc("The id")id: ResponseProperty<"id">; @doc("The operation")operationId: ResponseProperty<"operationId">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@doc("The id") @path id: string, @doc("The request body")body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operationId: string};
  
        @doc("get lro status")
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@doc("The id") @path id: string, @doc("The operation") @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationReference");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "PollingStatus");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, undefined);

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for polling operation with custom lro template and operation reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model TLongRunningStatusLocation<TStatusResult extends TypeSpec.Reflection.Model> {
          @pollingLocation
          @TypeSpec.Http.header("Operation-Location")
          operationLocation: ResourceLocation<TStatusResult>;
        }
  
        @post
        op TLongRunningRpcOperation<
          TParams,
          TResponse extends TypeSpec.Reflection.Model
        > is Azure.Core.Foundations.Operation<
          TParams & RepeatabilityRequestHeaders,
          (Foundations.AcceptedResponse<TLongRunningStatusLocation<TResponse>> &
            Foundations.RetryAfterHeader &
            RepeatabilityResponseHeaders),
          RepeatabilityRequestHeaders & RepeatabilityResponseHeaders,
          Azure.Core.Foundations.ErrorResponse
        >;
  
        enum JobStatus {
          Running: "running",
          Succeeded: "succeeded",
          Failed: "failed",
          Canceled: "canceled",
        }  

        alias Request = {
          patients: string[];
        };
  
        model JobResults {
          success: string;
          error?: Azure.Core.Foundations.Error;
        }

        @resource("foo/jobs")
        model JobResult {
          @key
          @format("uuid")
          jobId: string;
            
          @lroStatus
          status: JobStatus;

          @lroResult
          results?: JobResults;
          errors?: Azure.Core.Foundations.Error[];          
        }
  
        interface Foo {
          @route("/foo/jobs")
          createJob is TLongRunningRpcOperation<{...Request}, JobResult>;
        }
        `,
        "createJob",
      );
      ok(metadata);

      deepStrictEqual(metadata.finalStep?.kind, "pollingSuccessProperty");
      deepStrictEqual((metadata.finalStep?.target as any).name, "results");
      deepStrictEqual((metadata.finalStep?.target as any).type.name, "JobResults");

      deepStrictEqual(metadata.statusMonitorStep?.kind, "nextOperationLink");
      deepStrictEqual(metadata.statusMonitorStep?.responseModel.name, "JobResult");

      deepStrictEqual(metadata.pollingInfo.kind, "pollingOperationStep");
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "JobResult");
      deepStrictEqual(metadata.pollingInfo.resultProperty?.name, "results");

      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "JobResults");
      deepStrictEqual(metadata.envelopeResult.name, "JobResult");
      deepStrictEqual(metadata.logicalPath, "results");

      deepStrictEqual((metadata.finalResult as Model)?.name, "JobResults");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "JobResult");
      deepStrictEqual(metadata.finalResultPath, "results");
    });

    it("Gets Lro for non-standard polling in custom createOrReplace operations with finalLocation", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
        
          value: string;
        }
        
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        
        @pollingOperation(getStatus)
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @header id: string,
            @header("operation-id") operate: string,
            @finalLocation @header("Location") location: ResourceLocation<SimpleWidget>,
            @pollingLocation @header("Operation-Location") opLink: string,
            @lroResult @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      deepStrictEqual(metadata.finalStep?.kind, "finalOperationLink");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "location");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async + location operation polling in createOrReplace operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @finalLocation(SimpleWidget)
            @header location: string;
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      deepStrictEqual(metadata.finalStep?.kind, "finalOperationLink");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "location");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async operation polling in createOrReplace operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @createsOrReplacesResource(SimpleWidget)
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      deepStrictEqual(metadata.finalStep, undefined);

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style location polling in createOrReplace operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @createsOrUpdatesResource(SimpleWidget)
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<SimpleWidget>) @header("location") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "SimpleWidget");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "provisioningState");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);
      deepStrictEqual(metadata.finalStep, undefined);

      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async + location operation polling in update operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @patch(#{implicitOptionality: true}) op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @finalLocation(SimpleWidget)
            @header location: string;
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      deepStrictEqual(metadata.finalStep?.kind, "finalOperationLink");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "location");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async operation polling in update operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
          @finalLocation(SimpleWidget)
          @header location: string;
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @patch(#{implicitOptionality: true}) op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationLink");
      deepStrictEqual((metadata.finalStep.responseModel as Model).name, "SimpleWidget");
      deepStrictEqual(metadata.finalStep.target?.property.name, "location");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style location polling in update operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @patch(#{implicitOptionality: true}) op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @finalLocation(SimpleWidget) @pollingLocation(StatusMonitorPollingOptions<SimpleWidget>) @header("location") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "SimpleWidget");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "provisioningState");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);
      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationLink");
      deepStrictEqual((metadata.finalStep.responseModel as Model).name, "SimpleWidget");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async + location operation polling in action operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @post op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 202;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @finalLocation(SimpleWidget)
            @header location: string;
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      deepStrictEqual(metadata.finalStep?.kind, "finalOperationLink");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "location");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async operation polling in action operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @post op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 202;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep?.kind, "noPollingResult");

      deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
      deepStrictEqual(metadata.logicalResult.name, "PollingStatus");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata.finalEnvelopeResult, "void");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style location polling in action operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled" | "Running";
          value: string;
        }
        
        @route("/simpleWidgets/{id}")
        @post op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 202;
            @finalLocation(SimpleWidget) @pollingLocation(StatusMonitorPollingOptions<SimpleWidget>) @header("location") opLink: string,
            @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "SimpleWidget");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "provisioningState");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);
      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep?.kind, "finalOperationLink");
      deepStrictEqual(metadata.finalStep?.target?.kind, "link");
      deepStrictEqual((metadata.finalStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.finalStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style azure-async operation polling in delete operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        
        @route("/simpleWidgets/{id}")
        @delete op deleteWidget(@path id: string) : {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("Azure-AsyncOperation") opLink: string,
          };      
        `,
        "deleteWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);

      //ok(metadata.finalStep);
      //deepStrictEqual(metadata.finalStep?.kind, "noPollingResult");

      deepStrictEqual(metadata.finalStateVia, "azure-async-operation");
      deepStrictEqual(metadata.logicalResult.name, "PollingStatus");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata.finalEnvelopeResult, "void");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for arm-style location polling in delete operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        
        @route("/simpleWidgets/{id}")
        @delete op deleteWidget(@path id: string) : {
            @statusCode statusCode: 201;
            @pollingLocation(StatusMonitorPollingOptions<PollingStatus>) @header("location") opLink: string,
          };      
        `,
        "deleteWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.statusMonitorStep?.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep?.target as any).property.name, "opLink");

      deepStrictEqual(metadata.pollingInfo?.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo?.terminationStatus?.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo?.terminationStatus.succeededState, ["Succeeded"]);
      //ok(metadata.finalStep);
      //deepStrictEqual(metadata.finalStep?.kind, "noPollingResult");

      deepStrictEqual(metadata.finalStateVia, "location");
      deepStrictEqual(metadata.logicalResult.name, "PollingStatus");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata.finalEnvelopeResult, "void");
      deepStrictEqual(metadata.finalResultPath, undefined);
    });

    it("Gets Lro for non-standard polling in custom createOrReplace operations without finalLocation", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
        
          value: string;
        }
        
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        
        @pollingOperation(getStatus)
        @route("/simpleWidgets/{id}")
        @createsOrReplacesResource(SimpleWidget)
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @header id: string,
            @header("operation-id") operate: string,
            @pollingLocation @header("Operation-Location") opLink: string,
            @lroResult @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata?.finalResultPath, undefined);

      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep.target as any)?.location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep.target as any)?.property.name, "opLink");

      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("Gets Lro for non-standard polling in custom put operations without finalLocation", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
        
          value: string;
        }
        
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        
        @pollingOperation(getStatus)
        @route("/simpleWidgets/{id}")
        @createsOrReplacesResource(SimpleWidget)
        @put op createWidget(@path id: string, body: SimpleWidget) : SimpleWidget | 
          {
            @statusCode statusCode: 201;
            @header id: string,
            @header("operation-id") operate: string,
            @pollingLocation @header("Operation-Location") opLink: string,
            @lroResult @bodyRoot body?: SimpleWidget
          };      
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata?.finalResultPath, undefined);

      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "link");
      deepStrictEqual((metadata.statusMonitorStep.target as any)?.location, "ResponseHeader");
      deepStrictEqual((metadata.statusMonitorStep.target as any)?.property.name, "opLink");

      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("Gets Lro for non-standard polling in post operations", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
          result?: SimpleWidget;
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
        
          value: string;
        }
        
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get
        op getStatus(@path id: string, @path operationId: string): PollingStatus & {@header correlationId: string;};
        
        @pollingOperation(getStatus, {operationId: ResponseProperty<"operate">})
        @route("/simpleWidgets/{id}")
        @post
        op mungeWidget(@path id: string, body: SimpleWidget): SimpleWidget | {
          @statusCode statusCode: 201;
          @header id: string;
          @header("operation-id") operate: string;
          @pollingLocation @header("Operation-Location") opLink: string;
          @lroResult @bodyRoot body?: SimpleWidget;
        };
        `,
        "mungeWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "custom-operation-reference");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata?.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata?.logicalPath, "result");

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "PollingStatus");
      deepStrictEqual(metadata?.finalResultPath, "result");

      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "pollingSuccessProperty");
      deepStrictEqual(metadata.finalStep.target?.kind, "ModelProperty");

      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("Gets Lro for non-standard polling with void return type", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        using Azure.Core.Traits;
        
        alias ServiceTraits = SupportsClientRequestId &
        NoConditionalRequests &
        NoRepeatableRequests;
      
        alias ServiceOperations = Azure.Core.ResourceOperations<ServiceTraits>;

        @lroStatus
        enum OperationStatus {
          NotStarted,
          Running,
          Succeeded,
          Failed,
          Canceled,
        }
        
        enum ImportType {
          Devices,
          Modules,
          All,
        }
        
        @resource("management/operations")
        model DeviceOperation {
          @key
          @visibility(Lifecycle.Read)
          operationId: string;
          error?: Azure.Core.Foundations.Error;
        }
        
        @resource("updates/operations")
        model UpdateOperation {
          @key
          @visibility(Lifecycle.Read)
          operationId: string;
          status: OperationStatus;
          resourceLocation?: string;
          error?: Azure.Core.Foundations.Error;
        }
        
        model IfNoneMatchParameter {
          @TypeSpec.Http.header("If-None-Match")
          ifNoneMatch?: string;
        }
        
        op getOperationStatus is ServiceOperations.ResourceRead<
          UpdateOperation,
          TraitOverride<RequestHeadersTrait<
            {
              ...IfNoneMatchParameter;
            },
            TraitContext.Read
          >>
        >;
        
        @pollingOperation(getOperationStatus)
        @route("management/devices:import")
        @post
        op importDevices is Azure.Core.Foundations.Operation<
          {
            @body
            importType: ImportType;
          },
          {
            @statusCode _: 202;
        
            @pollingLocation
            @header("Operation-Location")
            operationLocation?: ResourceLocation<DeviceOperation>;
          }
        >;`,
        "importDevices",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "operation-location");
      deepStrictEqual(metadata.logicalResult.name, "UpdateOperation");
      deepStrictEqual(metadata?.envelopeResult.name, "UpdateOperation");
      deepStrictEqual(metadata?.logicalPath, undefined);

      deepStrictEqual(metadata.finalResult, "void");
      deepStrictEqual(metadata?.finalEnvelopeResult, "void");
      deepStrictEqual(metadata?.logicalPath, undefined);

      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "link");

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "noPollingResult");

      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "UpdateOperation");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "status");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("ignores bad lro operation links with Operation-Location", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;
  
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {id: ResponseProperty<"id">})
        @route("/simpleWidgets/{id}")
        @patch(#{implicitOptionality: true}) op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operate: string, @header("Operation-Location")opLink: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "link");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("ignores bad lro operation links with @pollingLocation", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        @doc("simple polling status")
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        @doc("A sample widget")
        model SimpleWidget {
          @doc("The widget identity")
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          @doc("A value")
          value: string;
        }
  
        @doc("Get a widget")
        @route("/simpleWidgets/{id}")
        @get op getWidget(@doc("The id") @path id: string): SimpleWidget;
  
        @doc("Create a widget")
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {@doc("The id")id: ResponseProperty<"id">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@doc("The id") @path id: string, @doc("The request body")body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operate: string, @Azure.Core.pollingLocation opLink: string};
  
        @doc("get lro status")
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@doc("The id") @path id: string, @doc("The operation") @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "link");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("throws with bad lro operation links and no polling header", async () => {
      const [_, diagnostics] = await getOperations(
        `
        @doc("simple polling status")
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        @doc("A sample widget")
        model SimpleWidget {
          @doc("The widget identity")
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          @doc("A value")
          value: string;
        }
  
        @doc("Get a widget")
        @route("/simpleWidgets/{id}")
        @get op getWidget(@doc("The id") @path id: string): SimpleWidget;
  
        @doc("Create a widget")
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {@doc("The id")id: ResponseProperty<"id">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@doc("The id") @path id: string, @doc("The request body")body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operate: string};
  
        @doc("get lro status")
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@doc("The id") @path id: string, @doc("The operation") @path operationId: string): PollingStatus;
        `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/polling-operation-no-ref-or-link",
          message:
            "An operation decorated with '@pollingOperation' must either return a response with an 'Operation-Location' header that will contain a runtime link to the polling operation, or specify parameters and return type properties to map into the polling operation parameters.  A map into polling operation parameters can be created using the '@pollingOperationParameter' decorator",
        },
      ]);
    });

    it("handles custom lro with polling and final links", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        @doc("simple polling status")
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Failed" | "Canceled" | "Running" | "NotStarted";
        }
  
        @doc("A sample widget")
        model SimpleWidget {
          @doc("The widget identity")
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          @doc("A value")
          value: string;
        }
  
        @doc("Get a widget")
        @route("/simpleWidgets/{id}")
        @get op getWidget(@doc("The id") @path id: string): SimpleWidget;
  
        @doc("Create a widget")
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {@doc("The id")id: ResponseProperty<"id">; @doc("The operation")operationId: ResponseProperty<"operation">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@doc("The id") @path id: string, @doc("The request body")body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operation: string};
  
        @doc("get lro status")
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@doc("The id") @path id: string, @doc("The operation") @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");
      deepStrictEqual(metadata.statusMonitorStep.target.operation.name, "getStatus");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("handles custom lro with polling using polling parameter decorators by name", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;
  
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus)
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @pollingOperationParameter @header id: string, @pollingOperationParameter("operationId") @header("operation-id") operation: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");
      deepStrictEqual(metadata.statusMonitorStep.target.operation.name, "getStatus");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("handles custom lro with polling using polling parameter decorators by reference", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;
  
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
        }
  
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus)
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @pollingOperationParameter(getStatus::parameters.id) @header id: string, @pollingOperationParameter(getStatus::parameters.operationId) @header("operation-id") operation: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");
      deepStrictEqual(metadata.statusMonitorStep.target.operation.name, "getStatus");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
    });

    it("handles custom lro status values", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;  
          statusValue: CustomStatus;
        }
        
        @Azure.Core.lroStatus
        enum CustomStatus {
          @Azure.Core.lroSucceeded
          Successful: "Successful";
          @Azure.Core.lroCanceled
          Cancelled: "Cancelled";
          @Azure.Core.lroFailed
          Faulted: "Faulted";
          Normal: "Running";
        }
  
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {id: ResponseProperty<"id">; operationId: ResponseProperty<"operation">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operation: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );

      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");
      deepStrictEqual(metadata.statusMonitorStep.target.operation.name, "getStatus");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Cancelled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Faulted"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Successful"]);
    });

    it("throws for missing success value", async () => {
      const [_, diagnostics] = await getOperations(
        `
        @doc("simple polling status")
        model PollingStatus {
          @doc("PollingLocation")
          @header location?: ResourceLocation<PollingStatus>;
  
          @doc("The status of the operation")
          status: "Successful" | "Canceled" | "Failed";
        }
  
        @doc("A sample widget")
        model SimpleWidget {
          @doc("The widget identity")
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          @doc("A value")
          value: string;
        }
  
        @doc("Get a widget")
        @route("/simpleWidgets/{id}")
        @get op getWidget(@doc("The id") @path id: string): SimpleWidget;
  
        @doc("Create a widget")
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {@doc("The id")id: ResponseProperty<"id">; @doc("The operation")operationId: ResponseProperty<"operation">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@doc("The id") @path id: string, @doc("The request body")body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operation: string};
  
        @doc("get lro status")
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@doc("The id") @path id: string, @doc("The operation") @path operationId: string): PollingStatus;
        `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-azure-core/polling-operation-no-status-monitor",
          message:
            "The operation linked in  @pollingOperation must return a valid status monitor.  The status monitor model must contain a 'status' property, or a property decorated with  '@lroStatus'.  The status field must be of Enum or Union type and contain terminal status values for success and failure.",
        },
      ]);
    });

    it("handles custom lro with non-standard status and error fields", async () => {
      const [_, metadata] = await compileLroOperation(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;
  
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
  
          @Azure.Core.lroResult
          yeah: SimpleWidget;
  
          @Azure.Core.lroErrorResult
          nay: Azure.Core.Foundations.Error;
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {id: ResponseProperty<"id">; operationId: ResponseProperty<"operation">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operation: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
        "createWidget",
      );
      ok(metadata);
      deepStrictEqual(metadata.finalStateVia, "original-uri");
      deepStrictEqual(metadata.logicalResult.name, "SimpleWidget");
      deepStrictEqual(metadata.envelopeResult.name, "PollingStatus");
      deepStrictEqual(metadata.logicalPath, undefined);

      deepStrictEqual((metadata.finalResult as Model)?.name, "SimpleWidget");
      deepStrictEqual((metadata.finalEnvelopeResult as Model)?.name, "SimpleWidget");
      deepStrictEqual(metadata.finalResultPath, undefined);

      ok(metadata.finalStep);
      deepStrictEqual(metadata.finalStep.kind, "finalOperationReference");
      deepStrictEqual(metadata.finalStep.target?.kind, "reference");
      deepStrictEqual(metadata.finalStep.target?.operation.name, "getWidget");
      ok(metadata.statusMonitorStep);
      deepStrictEqual(metadata.statusMonitorStep.target.kind, "reference");
      deepStrictEqual(metadata.statusMonitorStep.target.operation.name, "getStatus");
      ok(metadata.pollingInfo);
      deepStrictEqual(metadata.pollingInfo.responseModel.name, "PollingStatus");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.kind, "model-property");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.property.name, "statusValue");
      deepStrictEqual(metadata.pollingInfo.terminationStatus.canceledState, ["Canceled"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.failedState, ["Failed"]);
      deepStrictEqual(metadata.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
      ok(metadata.pollingInfo.resultProperty);
      deepStrictEqual(metadata.pollingInfo.resultProperty.name, "yeah");
      ok(metadata.pollingInfo.errorProperty);
      deepStrictEqual(metadata.pollingInfo.errorProperty.name, "nay");
    });

    it("emits diagnostics for multiple lro result fields", async () => {
      const [_ops, diagnostics, _runner] = await getOperations(
        `
        model PollingStatus {
          @header location?: ResourceLocation<PollingStatus>;
  
          @Azure.Core.lroStatus
          statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
  
          @Azure.Core.lroResult
          yeah: SimpleWidget;
  
          @Azure.Core.lroResult
          notSoYeah: SimpleWidget;
  
          @Azure.Core.lroErrorResult
          nay: Azure.Core.Foundations.Error;
  
          @Azure.Core.lroErrorResult
          alsoNay: Azure.Core.Foundations.Error;
        }
        
        model SimpleWidget {
          @key
          @segment("simpleWidgets")
          @visibility(Lifecycle.Read)
          @path
          id: string;
  
          value: string;
        }
  
        @route("/simpleWidgets/{id}")
        @get op getWidget(@path id: string): SimpleWidget;
  
        @finalOperation(getWidget)
        @pollingOperation(getStatus, {id: ResponseProperty<"id">; operationId: ResponseProperty<"operation">})
        @route("/simpleWidgets/{id}")
        @put op createWidget(@path id: string, body: SimpleWidget) : {@statusCode _: 202; @header id: string, @header("operation-id") operation: string};
  
        @route("/simpleWidgets/{id}/operations/{operationId}")
        @get op getStatus(@path id: string, @path operationId: string): PollingStatus;
        `,
      );
      ok(diagnostics.length > 1);
      expectDiagnostics(diagnostics, [
        {
          code: `@azure-tools/typespec-azure-core/lro-status-monitor-invalid-result-property`,
          message: `StatusMonitor has more than one result property marked with '@lroResult'.  Ensure that only one property in the model is marked with this decorator.`,
        },
        {
          code: `@azure-tools/typespec-azure-core/lro-status-monitor-invalid-result-property`,
          message: `StatusMonitor has more than one error property marked with '@lroErrorResult'.  Ensure that only one property in the model is marked with this decorator.`,
        },
      ]);
    });

    it("Gets Lro undefined for sync operation", async () => {
      const [_, metadata] = await compileLroOperation(
        `// Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };
  
        model OpResponse is CustomResponseProperties {
          message: string;
        }
         @test op update is Azure.Core.ResourceAction<TestModel, OpParams, OpResponse>;`,
      );
      deepStrictEqual(metadata, undefined);
    });

    it("Gets Lro undefined for sync operation with status field", async () => {
      const [_, metadata] = await compileLroOperation(
        `// Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };
  
        model OpResponse is CustomResponseProperties {
          message: string;
          status: "Succeeded" | "Failed" | "Canceled";
        }
         @test op update is Azure.Core.ResourceAction<TestModel, OpParams, OpResponse>;`,
      );
      deepStrictEqual(metadata, undefined);
    });

    it("Gets Lro undefined for sync operation with provisioningState field", async () => {
      const [_, metadata] = await compileLroOperation(
        `// Reuse CustomParameters and CustomResponseProperties in the "normal" TParams and TResponse fields
        model OpParams {
          value: string;
          ...CustomParameters;
        };
  
        model OpResponse is CustomResponseProperties {
          message: string;
          provisioningState: "Succeeded" | "Failed" | "Canceled";
        }
         @test op update is Azure.Core.ResourceAction<TestModel, OpParams, OpResponse>;`,
      );
      deepStrictEqual(metadata, undefined);
    });

    it("signatures with customizable responses do not accept unions for TResponse", async () => {
      const [_, diagnostics] = await getOperations(`
        model Foo {}
        model Bar {}
        @resource("widgets") model Widget { @key name: string; }
        op customAction is Azure.Core.StandardResourceOperations.ResourceAction<Widget, {}, Foo | Bar>;
        op customCollectionAction is Azure.Core.StandardResourceOperations.ResourceCollectionAction<Widget, {}, Foo | Bar>;
        op rpcAction is Azure.Core.RpcOperation<{}, Foo | Bar>;
  
        op poll is StandardResourceOperations.GetResourceOperationStatus<Widget>;
  
        @Azure.Core.pollingOperation(poll)
        op lroCustomAction is Azure.Core.StandardResourceOperations.LongRunningResourceAction<Widget, {}, Bar | Foo>;
        @Azure.Core.pollingOperation(poll)
        op lroCustomCollectionAction is Azure.Core.StandardResourceOperations.LongRunningResourceCollectionAction<Widget, {}, Bar | Foo>;
        @Azure.Core.pollingOperation(poll)
        op lroRpcAction is Azure.Core.LongRunningRpcOperation<{}, Bar | Foo, {}>;
      `);

      expectDiagnostics(diagnostics, [
        {
          code: "invalid-argument",
        },
        {
          code: "invalid-argument",
        },
        {
          code: "invalid-argument",
        },
        {
          code: "invalid-argument",
        },
        {
          code: "invalid-argument",
        },
        {
          code: "invalid-argument",
        },
      ]);
    });
  });

  // Regression test for https://github.com/Azure/typespec-azure/issues/332
  it("doesn't crash when passing non model to ServiceTraits", async () => {
    const [_, diagnostics] = await getOperations(`
      alias Operations = Azure.Core.ResourceOperations<abc>;
    `);
    expectDiagnostics(
      diagnostics.filter((x) => x.severity === "error"),
      [
        {
          code: "invalid-ref",
          message: "Unknown identifier abc",
        },
        {
          code: "invalid-argument",
        },
      ],
    );
  });
});
