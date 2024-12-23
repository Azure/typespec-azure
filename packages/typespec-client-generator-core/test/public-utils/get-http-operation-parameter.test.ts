import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkMethodParameter,
  SdkServiceMethod,
} from "../../src/interfaces.js";
import { getHttpOperationParameter } from "../../src/public-utils.js";
import { getServiceMethodOfClient } from "../packages/utils.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: public-utils getHttpOperationParameter", () => {
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "h");
      } else if (param.name === "q") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "query");
        strictEqual(httpParam[0].serializedName, "q");
      } else if (param.name === "p") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "path");
        strictEqual(httpParam[0].serializedName, "p");
      } else if (param.name === "b") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "b");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
      } else if (param.name === "accept") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Accept");
      }
    }
  });

  it("spread model with @bodyRoot property", async () => {
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
      } else if (param.name === "accept") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Accept");
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "b") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "a");
      } else if (param.name === "b") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
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

        @visibility("read") readOnly: string,

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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "path");
        strictEqual(httpParam[0].serializedName, "name");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "content-type");
      } else if (param.name === "file_data") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      } else if (param.name === "readOnly") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 0);
      } else if (param.name === "constant") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "body");
      }
    }
  });

  it("template case", async () => {
    await runner.compile(`
      @service({
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
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "path");
        strictEqual(httpParam[0].serializedName, "petId");
      } else if (param.name === "checkupId") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "path");
        strictEqual(httpParam[0].serializedName, "checkupId");
      } else if (param.name === "resource") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "body");
        strictEqual(httpParam[0].serializedName, "resource");
      } else if (param.name === "contentType") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Content-Type");
      } else if (param.name === "accept") {
        const httpParam = getHttpOperationParameter(method, param);
        ok(httpParam);
        strictEqual(httpParam.length, 1);
        strictEqual(httpParam[0].kind, "header");
        strictEqual(httpParam[0].serializedName, "Accept");
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
    strictEqual(httpParam.length, 1);
    strictEqual(httpParam[0].kind, "query");
    strictEqual(httpParam[0].serializedName, "apiVersion");
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
      client.initialization.properties[0] as SdkMethodParameter,
    );
    strictEqual(httpParam.length, 1);
    strictEqual(httpParam[0].kind, "path");
    strictEqual(httpParam[0].serializedName, "blob");

    httpParam = getHttpOperationParameter(
      client.methods[1] as SdkServiceMethod<SdkHttpOperation>,
      client.initialization.properties[0] as SdkMethodParameter,
    );
    strictEqual(httpParam.length, 1);
    strictEqual(httpParam[0].kind, "path");
    strictEqual(httpParam[0].serializedName, "blobName");
  });
});
