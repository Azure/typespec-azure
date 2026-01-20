import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { SdkHttpOperation, SdkMethodParameter, SdkServiceMethod } from "../../src/interfaces.js";
import { getHttpOperationParameter } from "../../src/public-utils.js";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
  TcgcTester,
  VersionedServiceTester,
} from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("normal method case", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op myOp(@header h: string, @query q: string, @path p: string, @body b: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const parameters = method.parameters;

  for (const param of parameters) {
    if (param.name === "h") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "h");
    } else if (param.name === "q") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "query");
      strictEqual(httpParam.serializedName, "q");
    } else if (param.name === "p") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "path");
      strictEqual(httpParam.serializedName, "p");
    } else if (param.name === "b") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.serializedName, "b");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
});

it("normal spread case", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Input {
      key: string;
    }

    op myOp(...Input): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 2);

  for (const param of parameters) {
    if (param.name === "key") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "key");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
});

it("spread model with @body property", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Shelf {
      name: string;
      theme?: string;
    }
    model CreateShelfRequest {
      @body
      body: Shelf;
    }
    op createShelf(...CreateShelfRequest): Shelf;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 3);

  for (const param of parameters) {
    if (param.name === "body") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.serializedName, "body");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    } else if (param.name === "accept") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Accept");
    }
  }
});

it("spread model with @bodyRoot property", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model Shelf {
      @query
      name: string;
      theme?: string;
    }
    model CreateShelfRequest {
      @bodyRoot
      body: Shelf;
    }
    op createShelf(...CreateShelfRequest): Shelf;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 3);

  for (const param of parameters) {
    if (param.name === "body") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.serializedName, "body");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    } else if (param.name === "accept") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Accept");
    }
  }
  strictEqual(parameters[0].type.kind, "model");
  for (const property of parameters[0].type.properties) {
    if (property.name === "name") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(httpParam);
      strictEqual(httpParam.kind, "query");
      strictEqual(httpParam.serializedName, "name");
    } else if (property.name === "theme") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(!httpParam);
    }
  }
});

it("implicit spread for body", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op myOp(a: string, b: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 3);

  for (const param of parameters) {
    if (param.name === "a") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "a");
    } else if (param.name === "b") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "b");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
});

it("implicit spread for header and body", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    op myOp(@header a: string, b: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 3);

  for (const param of parameters) {
    if (param.name === "a") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "a");
    } else if (param.name === "b") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "b");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
});

it("@bodyRoot case", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model TestRequest {
      @header
      h: string;
      @query
      q: string;
      prop1: string;
      prop2: string;
    }
    op test(@bodyRoot request: TestRequest): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 2);

  for (const param of parameters) {
    if (param.name === "request") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.serializedName, "request");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
  strictEqual(parameters[0].type.kind, "model");
  for (const property of parameters[0].type.properties) {
    if (property.name === "h") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "h");
    } else if (property.name === "q") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(httpParam);
      strictEqual(httpParam.kind, "query");
      strictEqual(httpParam.serializedName, "q");
    } else if (property.name === "prop1") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(!httpParam);
    } else if (property.name === "prop2") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(!httpParam);
    }
  }
});

it("multipart case", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @route("upload/{name}")
    @post
    op uploadFile(
      @path name: string,
      @header contentType: "multipart/form-data",
      @multipartBody body: {
        file_data: HttpPart<bytes>,
        @visibility(Lifecycle.Read) readOnly: HttpPart<string>,
        constant: HttpPart<"constant">,
      },
    ): OkResponse;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 3);

  for (const param of parameters) {
    if (param.name === "name") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "path");
      strictEqual(httpParam.serializedName, "name");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "content-type");
    } else if (param.name === "body") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.name, "body");
    }
  }
});

it("template case", async () => {
  const { program } = await SimpleTester.compile(`
    @service(#{
      title: "Pet Store Service",
    })
    namespace PetStore;
    using Rest.Resource;

    @error
    model PetStoreError {
      code: int32;
      message: string;
    }

    @resource("pets")
    model Pet {
      @key("petId")
      id: int32;
    }

    @resource("checkups")
    model Checkup {
      @key("checkupId")
      id: int32;

      vetName: string;
      notes: string;
    }

    interface PetCheckups
      extends ExtensionResourceCreateOrUpdate<Checkup, Pet, PetStoreError>,
        ExtensionResourceList<Checkup, Pet, PetStoreError> {}
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0].children?.[0];
  ok(client);
  const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  const parameters = method.parameters;

  strictEqual(parameters.length, 5);

  for (const param of parameters) {
    if (param.name === "petId") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "path");
      strictEqual(httpParam.serializedName, "petId");
    } else if (param.name === "checkupId") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "path");
      strictEqual(httpParam.serializedName, "checkupId");
    } else if (param.name === "resource") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "body");
      strictEqual(httpParam.serializedName, "resource");
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    } else if (param.name === "accept") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Accept");
    }
  }
});

it("api version parameter", async () => {
  const { program } = await VersionedServiceTester.compile(`
    op test(@query apiVersion: string, @body body: string): void;
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  const method = getServiceMethodOfClient(sdkPackage);
  const httpParam = getHttpOperationParameter(
    method,
    client.clientInitialization.parameters[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "query");
  strictEqual(httpParam.serializedName, "apiVersion");
});

it("client parameter", async () => {
  const { program } = await TcgcTester.compile({
    "main.tsp": `
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-client-generator-core";
      import "./client.tsp";
      using Http;
      using Rest;
      using Versioning;
      using Azure.ClientGenerator.Core;
      @service
      namespace MyService;

      op download(@path blob: string): void;
      op upload(@path blobName: string): void;
      `,
    "client.tsp": `
      import "./main.tsp";
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-client-generator-core";
      using Http;
      using Rest;
      using Versioning;
      using Azure.ClientGenerator.Core;
      namespace MyCustomizations;

      model MyClientInitialization {
        @paramAlias("blob")
        blobName: string;
      }

      @@clientInitialization(MyService, MyCustomizations.MyClientInitialization);
      `,
  });
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  let httpParam = getHttpOperationParameter(
    client.methods[0] as SdkServiceMethod<SdkHttpOperation>,
    client.clientInitialization.parameters[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "path");
  strictEqual(httpParam.serializedName, "blob");

  httpParam = getHttpOperationParameter(
    client.methods[1] as SdkServiceMethod<SdkHttpOperation>,
    client.clientInitialization.parameters[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "path");
  strictEqual(httpParam.serializedName, "blobName");
});

it("@override impact", async () => {
  const { program } = await TcgcTester.compile({
    "main.tsp": `
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-client-generator-core";
      import "./client.tsp";
      using Http;
      using Rest;
      using Versioning;
      using Azure.ClientGenerator.Core;
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
      }

      op func(...Params): void;
      `,
    "client.tsp": `
      import "./main.tsp";
      import "@typespec/http";
      import "@typespec/rest";
      import "@typespec/versioning";
      import "@azure-tools/typespec-client-generator-core";
      using Http;
      using Rest;
      using Versioning;
      using Azure.ClientGenerator.Core;
      namespace MyCustomizations;

      op func(params: MyService.Params): void;

      @@override(MyService.func, MyCustomizations.func);
      `,
  });
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  const parameters = method.parameters;

  strictEqual(parameters.length, 2);

  for (const param of parameters) {
    if (param.name === "params") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }
});

it("should not add Accept header when success response has no body but error response has body", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    @error
    model ErrorModel {
      message: string;
      code: int32;
    }
    
    @route("/test")
    op testOperation(): {
      @statusCode statusCode: 200;
    } | {
      @statusCode statusCode: 500;
      @body error: ErrorModel;
    };
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const parameters = method.parameters;

  // The operation should not have an accept parameter since success response has no body
  const acceptParam = parameters.find((p) => p.name === "accept");
  strictEqual(
    acceptParam,
    undefined,
    "Accept parameter should not be present when success response has no body",
  );
});

it("should add Accept header when success response has body", async () => {
  const { program } = await SimpleTesterWithBuiltInService.compile(`
    model ResponseModel {
      data: string;
    }
    
    model ErrorModel {
      message: string;
      code: int32;
    }
    
    @route("/test")
    op testOperation(): ResponseModel | {
      @statusCode statusCode: 500;
      @body error: ErrorModel;
    };
  `);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const sdkPackage = context.sdkPackage;
  const method = getServiceMethodOfClient(sdkPackage);
  const parameters = method.parameters;

  // The operation should have an accept parameter since success response has a body
  const acceptParam = parameters.find((p) => p.name === "accept");
  ok(acceptParam, "Accept parameter should be present when success response has a body");

  const httpParam = getHttpOperationParameter(method, acceptParam);
  ok(httpParam);
  strictEqual(httpParam.kind, "header");
  strictEqual(httpParam.serializedName, "Accept");
});
