import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { deepStrictEqual, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkMethodParameter } from "../../src/interfaces.js";
import { getPropertySegmentsFromModelOrParameters } from "../../src/methods.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";
import { getServiceMethodOfClient } from "../utils.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
});

it("azure paged result with encoded name", async () => {
  await runner.compileWithBuiltInService(`
    op test(): ListTestResult;
    #suppress "deprecated" "Keep for validation purposes."
    @pagedResult
    model ListTestResult {
      #suppress "deprecated" "Keep for validation purposes."
      @items
      @clientName("values")
      tests: Test[];
      @nextLink
      @clientName("nextLink")
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("azure paged result with next link in header", async () => {
  await runner.compileWithBuiltInService(`
    op test(): ListTestResult;
    #suppress "deprecated" "Keep for validation purposes."
    @pagedResult
    model ListTestResult {
      #suppress "deprecated" "Keep for validation purposes."
      @items
      @clientName("values")
      tests: Test[];
      @nextLink
      @clientName("nextLink")
      @header
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], method.operation.responses[0].headers[0]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      @pageItems
      tests: Test[];
      @TypeSpec.nextLink
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with next link in header", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      @pageItems
      tests: Test[];
      @header
      @TypeSpec.nextLink
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], method.operation.responses[0].headers[0]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result in anonymous model with header", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): {
      @pageItems
      tests: Test[];
      @header
      h: string;
    };
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("nullable paged result", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult | NotFoundResponse;
    model ListTestResult {
      @pageItems
      tests: Test[];
      @TypeSpec.nextLink
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with encoded name", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      @pageItems
      @clientName("values")
      tests: Test[];
      @TypeSpec.nextLink
      @clientName("nextLink")
      next: string;
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with nested paging value", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      results: {
        @pageItems
        values: Test[];
      };
      pagination: {
        @TypeSpec.nextLink
        nextLink: string;
      };
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 2);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(sdkPackage.models[0].properties[1].type.kind, "model");
  strictEqual(
    method.pagingMetadata.nextLinkSegments[1],
    sdkPackage.models[0].properties[1].type.properties[0],
  );

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 2);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(sdkPackage.models[0].properties[0].type.kind, "model");
  strictEqual(response.resultSegments[1], sdkPackage.models[0].properties[0].type.properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with deeply nested paging value", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      data: {
        results: {
          items: {
            @pageItems
            values: Test[];
          };
        };
      };
      metadata: {
        pagination: {
          @TypeSpec.nextLink
          nextLink: string;
        };
      };
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 3);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(sdkPackage.models[0].properties[1].type.kind, "model");
  strictEqual(
    method.pagingMetadata.nextLinkSegments[1],
    sdkPackage.models[0].properties[1].type.properties[0],
  );
  strictEqual(sdkPackage.models[0].properties[1].type.properties[0].type.kind, "model");
  strictEqual(
    method.pagingMetadata.nextLinkSegments[2],
    sdkPackage.models[0].properties[1].type.properties[0].type.properties[0],
  );

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 4);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(sdkPackage.models[0].properties[0].type.kind, "model");
  strictEqual(response.resultSegments[1], sdkPackage.models[0].properties[0].type.properties[0]);
  strictEqual(sdkPackage.models[0].properties[0].type.properties[0].type.kind, "model");
  strictEqual(
    response.resultSegments[2],
    sdkPackage.models[0].properties[0].type.properties[0].type.properties[0],
  );
  strictEqual(
    sdkPackage.models[0].properties[0].type.properties[0].type.properties[0].type.kind,
    "model",
  );
  strictEqual(
    response.resultSegments[3],
    sdkPackage.models[0].properties[0].type.properties[0].type.properties[0].type.properties[0],
  );
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with nested continuation token", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(@continuationToken @query token?: string): ListTestResult;
    model ListTestResult {
      data: {
        @pageItems
        items: Test[];
      };
      pagination: {
        @continuationToken
        continuationToken?: string;
      };
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
  strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.[0], method.parameters[0]);
  strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 2);
  strictEqual(method.operation.responses[0].type?.kind, "model");
  strictEqual(
    method.pagingMetadata.continuationTokenResponseSegments?.[0],
    method.operation.responses[0].type.properties[1],
  );
  strictEqual(method.operation.responses[0].type.properties[1].type.kind, "model");
  strictEqual(
    method.pagingMetadata.continuationTokenResponseSegments?.[1],
    method.operation.responses[0].type.properties[1].type.properties[0],
  );

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 2);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(sdkPackage.models[0].properties[0].type.kind, "model");
  strictEqual(response.resultSegments[1], sdkPackage.models[0].properties[0].type.properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("normal paged result with asymmetric nesting", async () => {
  await runner.compileWithBuiltInService(`
    @list
    op test(): ListTestResult;
    model ListTestResult {
      @pageItems
      items: Test[];
      metadata: {
        pagination: {
          @TypeSpec.nextLink
          nextLink: string;
        };
      };
    }
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 3);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(sdkPackage.models[0].properties[1].type.kind, "model");
  strictEqual(
    method.pagingMetadata.nextLinkSegments[1],
    sdkPackage.models[0].properties[1].type.properties[0],
  );
  strictEqual(sdkPackage.models[0].properties[1].type.properties[0].type.kind, "model");
  strictEqual(
    method.pagingMetadata.nextLinkSegments[2],
    sdkPackage.models[0].properties[1].type.properties[0].type.properties[0],
  );

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[0].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

it("azure page result with inheritance", async () => {
  await runner.compileWithBuiltInService(`
    op test(): ExtendedListTestResult;
    #suppress "deprecated" "Keep for validation purposes."
    @pagedResult
    model ListTestResult {
      #suppress "deprecated" "Keep for validation purposes."
      @items
      values: Test[];

      @nextLink
      nextLink: string;
    }

    model ExtendedListTestResult extends ListTestResult {
      message: string;
    }
    
    model Test {
      id: string;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[1].properties[1]);

  const response = method.response;
  strictEqual(response.kind, "method");
  strictEqual(response.resultSegments?.length, 1);
  strictEqual(response.resultSegments[0], sdkPackage.models[1].properties[0]);
  strictEqual(method.pagingMetadata.pageItemsSegments, response.resultSegments);
});

describe("common paging with continuation token", () => {
  it("continuation token in response body and query parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken @query token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.operation.parameters[0].correspondingMethodParams[0], method.parameters[0]);
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].type.properties[1],
    );
  });

  it("continuation token in response body and header parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken @header token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].type.properties[1],
    );
  });

  it("continuation token in response body and body parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].type.properties[1],
    );
  });

  it("continuation token in response header and query parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken @query token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        @header
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].headers[0],
    );
  });

  it("continuation token in response header and header parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken @header token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        @header
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].headers[0],
    );
  });

  it("continuation token in response header and body parameter", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(@continuationToken token?: string): ListTestResult;
      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        @header
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 1);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].headers[0],
    );
  });

  it("continuation token with @override", async () => {
    await runner.compileWithBuiltInService(`
      @list
      op test(...Options): ListTestResult;

      model Options {
        @continuationToken
        @query
        token?: string;
      }

      @list
      op customizedOp(options: Options): ListTestResult;
      @@override(test, customizedOp);

      model ListTestResult {
        @pageItems
        items: Test[];
        @continuationToken
        nextToken?: string;
      }
      model Test {
        prop: string;
      }
    `);
    const sdkPackage = runner.context.sdkPackage;
    const method = getServiceMethodOfClient(sdkPackage);
    strictEqual(method.name, "test");
    strictEqual(method.kind, "paging");
    strictEqual(method.pagingMetadata.continuationTokenParameterSegments?.length, 2);
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[0],
      method.parameters[0],
    );
    strictEqual(method.parameters[0].type.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenParameterSegments?.[1],
      method.parameters[0].type.properties[0],
    );
    strictEqual(
      method.operation.parameters[0].correspondingMethodParams[0],
      method.parameters[0].type.properties[0],
    );
    strictEqual(method.pagingMetadata.continuationTokenResponseSegments?.length, 1);
    strictEqual(method.operation.responses[0].type?.kind, "model");
    strictEqual(
      method.pagingMetadata.continuationTokenResponseSegments?.[0],
      method.operation.responses[0].type.properties[1],
    );
  });
});

it("getPropertySegmentsFromModelOrParameters test for nested case", async () => {
  await runner.compileWithBuiltInService(`
    op test(): Test;
    model Test {
      a: {
        b: {
          a: string;
        };
      };
      b: {
        d: string;
      };
    }
  `);
  const testModel = runner.context.sdkPackage.models[0];
  const aProperty = testModel.properties[0];
  const bProperty = testModel.properties[1];
  strictEqual(aProperty.type.kind, "model");
  const aBProperty = aProperty.type.properties[0];
  strictEqual(aBProperty.type.kind, "model");
  const aBAProperty = aBProperty.type.properties[0];
  strictEqual(bProperty.type.kind, "model");
  const bDProperty = bProperty.type.properties[0];

  deepStrictEqual(
    getPropertySegmentsFromModelOrParameters(testModel, (p) => p === aBAProperty),
    [aProperty, aBProperty, aBAProperty],
  );
  deepStrictEqual(
    getPropertySegmentsFromModelOrParameters(testModel, (p) => p === bDProperty),
    [bProperty, bDProperty],
  );
});

it("getPropertySegmentsFromModelOrParameters test for nested case of parameter", async () => {
  await runner.compileWithBuiltInService(`
    op test(param: Test): Test;
    model Test {
      a: {
        b: {
          a: string;
        };
      };
      b: {
        d: string;
      };
    }
  `);
  const testModel = runner.context.sdkPackage.models[0];
  const aProperty = testModel.properties[0];
  const bProperty = testModel.properties[1];
  strictEqual(aProperty.type.kind, "model");
  const aBProperty = aProperty.type.properties[0];
  strictEqual(aBProperty.type.kind, "model");
  const aBAProperty = aBProperty.type.properties[0];
  strictEqual(bProperty.type.kind, "model");
  const bDProperty = bProperty.type.properties[0];

  const parameters = runner.context.sdkPackage.clients[0].methods[0]
    .parameters as SdkMethodParameter[];
  deepStrictEqual(
    getPropertySegmentsFromModelOrParameters(parameters, (p) => p === aBAProperty),
    [parameters[0], aProperty, aBProperty, aBAProperty],
  );
  deepStrictEqual(
    getPropertySegmentsFromModelOrParameters(parameters, (p) => p === bDProperty),
    [parameters[0], bProperty, bDProperty],
  );
});

it("next link with re-injected parameters", async () => {
  await runner.compileWithBuiltInAzureCoreService(`
    model TestOptions {
      @query
      includePending?: boolean;

      @query
      includeExpired?: boolean;
    }

    op test(...TestOptions): ListTestResult;

    #suppress "deprecated" "Keep for validation purposes."
    @pagedResult
    model ListTestResult {
      #suppress "deprecated" "Keep for validation purposes."
      @items
      values: Test[];
      @nextLink
      nextLink: Azure.Core.Legacy.parameterizedNextLink<[TestOptions.includePending, TestOptions.includeExpired]>;
    }

    model Test {
      id: string;
    }
  `);

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments?.length, 2);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments[0].length, 1);
  strictEqual(
    method.pagingMetadata.nextLinkReInjectedParametersSegments[0][0],
    method.parameters[0],
  );
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments[1].length, 1);
  strictEqual(
    method.pagingMetadata.nextLinkReInjectedParametersSegments[1][0],
    method.parameters[1],
  );
});

it("next link with mix of re-injected parameters and not", async () => {
  await runner.compileWithBuiltInAzureCoreService(`
    model IncludePendingOptions {
      @query
      includePending?: boolean;
    }
      
    model User {
      @key
      @visibility(Lifecycle.Read)
      id: int32;
    }

    #suppress "deprecated" "Keep for validation purposes."
    @pagedResult
    model ParameterizedNextLinkPagingResult {
      #suppress "deprecated" "Keep for validation purposes."
      @items
      values: User[];

      @nextLink
      nextLink: Legacy.parameterizedNextLink<[IncludePendingOptions.includePending]>;
    }

    @doc("List with parameterized next link that re-injects parameters.")
    @route("/with-parameterized-next-link")
    op test(
      ...IncludePendingOptions,
      @query select: string,
    ): ParameterizedNextLinkPagingResult;
  `);

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments[0].length, 1);
  strictEqual(
    method.pagingMetadata.nextLinkReInjectedParametersSegments[0][0],
    method.parameters[0],
  );
});

it.skip("next link with reinjected parameters with versioning", async () => {
  await runner.compile(`
    @server("http://localhost:3000", "endpoint")
    @service()
    @versioned(Versions)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      V2024_04_01_PREVIEW: "2024-04-01-preview",
    }

    model TestOptions {
      @query
      includePending?: boolean;
    }

    op test(...TestOptions): ListTestResult;

    @pagedResult
    model ListTestResult {
      @items
      values: Test[];
      @nextLink
      nextLink: Azure.Core.Legacy.parameterizedNextLink<[TestOptions.includePending]>;
    }

    model Test {
      id: string;
    }
  `);

  const sdkPackage = runner.context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  strictEqual(method.name, "test");
  strictEqual(method.kind, "paging");
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkSegments[0], sdkPackage.models[0].properties[1]);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkReInjectedParametersSegments[0].length, 1);
  strictEqual(
    method.pagingMetadata.nextLinkReInjectedParametersSegments[0][0],
    method.parameters[0],
  );
});
