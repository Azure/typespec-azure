import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkServiceMethod,
} from "../../src/interfaces.js";
import { getHttpOperationParameter } from "../../src/public-utils.js";
import { getServiceMethodOfClient } from "../packages/utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("normal method case", async () => {
  await runner.compileWithBuiltInService(`
      op myOp(@header h: string, @query q: string, @path p: string, @body b: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
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
  await runner.compileWithBuiltInService(`
      model Input {
        key: string;
      }

      op myOp(...Input): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
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
  await runner.compileWithBuiltInService(`
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
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
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
  await runner.compileWithBuiltInService(`
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
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
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
  await runner.compileWithBuiltInService(`
      op myOp(a: string, b: string): void;
    `);
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
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
  await runner.compileWithBuiltInService(`
      op myOp(@header a: string, b: string): void;
    `);
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
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
  await runner.compileWithBuiltInService(`
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
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
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
  await runner.compileWithBuiltInService(`
      @route("upload/{name}")
      @post
      op uploadFile(
        @path name: string,
        @header contentType: "multipart/form-data",
        file_data: bytes,

        @visibility(Lifecycle.Read) readOnly: string,

        constant: "constant",
      ): OkResponse;
    `);
  const method = getServiceMethodOfClient(runner.context.sdkPackage);
  const parameters = method.parameters;

  strictEqual(parameters.length, 5);

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
    } else if (param.name === "file_data") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "file_data");
    } else if (param.name === "readOnly") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(!httpParam);
    } else if (param.name === "constant") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "constant");
    }
  }
});

it("template case", async () => {
  await runner.compile(`
      @service(#{
        title: "Pet Store Service",
      })
      namespace PetStore;
      using TypeSpec.Rest.Resource;

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
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0].methods.find((x) => x.kind === "clientaccessor")
    ?.response as SdkClientType<SdkHttpOperation>;
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
  await runner.compileWithVersionedService(`
      op test(@query apiVersion: string, @body body: string): void;
    `);
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const method = getServiceMethodOfClient(sdkPackage);
  const httpParam = getHttpOperationParameter(
    method,
    client.initialization.properties[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "query");
  strictEqual(httpParam.serializedName, "apiVersion");
});

it("client parameter", async () => {
  await runner.compileWithCustomization(
    `
      @service
      namespace MyService;

      op download(@path blob: string): void;
      op upload(@path blobName: string): void;
      `,
    `
      namespace MyCustomizations;

      model MyClientInitialization {
        @paramAlias("blob")
        blobName: string;
      }

      @@clientInitialization(MyService, MyCustomizations.MyClientInitialization);
      `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  let httpParam = getHttpOperationParameter(
    client.methods[0] as SdkServiceMethod<SdkHttpOperation>,
    client.initialization.properties[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "path");
  strictEqual(httpParam.serializedName, "blob");

  httpParam = getHttpOperationParameter(
    client.methods[1] as SdkServiceMethod<SdkHttpOperation>,
    client.initialization.properties[1] as SdkMethodParameter,
  );
  ok(httpParam);
  strictEqual(httpParam.kind, "path");
  strictEqual(httpParam.serializedName, "blobName");
});

it("@override impact", async () => {
  await runner.compileWithCustomization(
    `
      @service
      namespace MyService;
      model Params {
        foo: string;
        bar: string;
      }

      op func(...Params): void;
      `,
    `
      namespace MyCustomizations;

      op func(params: MyService.Params): void;

      @@override(MyService.func, MyCustomizations.func);
      `,
  );
  const sdkPackage = runner.context.sdkPackage;
  const client = sdkPackage.clients[0];
  const method = client.methods[0] as SdkServiceMethod<SdkHttpOperation>;
  const parameters = method.parameters;

  strictEqual(parameters.length, 2);

  for (const param of parameters) {
    if (param.name === "params") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(!httpParam);
    } else if (param.name === "contentType") {
      const httpParam = getHttpOperationParameter(method, param);
      ok(httpParam);
      strictEqual(httpParam.kind, "header");
      strictEqual(httpParam.serializedName, "Content-Type");
    }
  }

  strictEqual(parameters[0].type.kind, "model");
  for (const property of parameters[0].type.properties) {
    if (property.name === "foo") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "foo");
    } else if (property.name === "bar") {
      const httpParam = getHttpOperationParameter(method, property);
      ok(httpParam);
      strictEqual(httpParam.kind, "property");
      strictEqual(httpParam.name, "bar");
    }
  }
});
