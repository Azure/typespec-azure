import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("@clientInitialization", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  it("main client", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;

      op download(@path blobName: string): void;
      `,
      `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      @@clientInitialization(MyService, MyCustomizations.MyClientInitialization);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    strictEqual(client.initialization.model.properties.length, 2);
    const endpoint = client.initialization.model.properties.find((x) => x.kind === "endpoint");
    ok(endpoint);
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.clientDefaultValue, undefined);
    strictEqual(blobName.onClient, true);
    strictEqual(blobName.optional, false);

    const methods = client.methods;
    strictEqual(methods.length, 1);
    const download = methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 0);

    const downloadOp = download.operation;
    strictEqual(downloadOp.parameters.length, 1);
    const blobNameOpParam = downloadOp.parameters[0];
    strictEqual(blobNameOpParam.name, "blobName");
    strictEqual(blobNameOpParam.correspondingMethodParams.length, 1);
    strictEqual(blobNameOpParam.correspondingMethodParams[0], blobName);
    strictEqual(blobNameOpParam.onClient, true);

    strictEqual(sdkPackage.models.length, 1);
    const clientInitializationModel = sdkPackage.models[0];
    ok(clientInitializationModel.usage & UsageFlags.ClientInitialization);
  });

  it("On Interface", async () => {
    await runner.compileWithBuiltInService(
      `
      model clientInitModel
      {
          p1: string;
      }

      @route("/bump")
      @clientInitialization(clientInitModel)
      interface bumpParameter {
          @route("/op1")
          @doc("bump parameter")
          @post
          @convenientAPI(true)
          op op1(@path p1: string, @query q1: string): void;

          @route("/op2")
          @doc("bump parameter")
          @post
          @convenientAPI(true)
          op op2(@path p1: string): void;
      }
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const clientAccessor = sdkPackage.clients[0].methods[0];
    strictEqual(clientAccessor.kind, "clientaccessor");
    const bumpParameterClient = clientAccessor.response;

    const methods = bumpParameterClient.methods;
    strictEqual(methods.length, 2);

    const op1Method = methods.find((x) => x.name === "op1");
    ok(op1Method);
    strictEqual(op1Method.kind, "basic");
    strictEqual(op1Method.parameters.length, 1);
    strictEqual(op1Method.parameters[0].name, "q1");
    const op1Op = op1Method.operation;
    strictEqual(op1Op.parameters.length, 2);
    strictEqual(op1Op.parameters[0].name, "p1");
    strictEqual(op1Op.parameters[0].onClient, true);
    strictEqual(op1Op.parameters[1].name, "q1");
    strictEqual(op1Op.parameters[1].onClient, false);
  });
  it("subclient", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace StorageClient {

        @route("/main")
        op download(@path blobName: string): void;

        interface BlobClient {
          @route("/blob")
          op download(@path blobName: string): void;
        }
      }
      `,
      `
      model ClientInitialization {
        blobName: string
      };

      @@clientInitialization(StorageClient, ClientInitialization);
      @@clientInitialization(StorageClient.BlobClient, ClientInitialization);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const clients = sdkPackage.clients;
    strictEqual(clients.length, 1);
    const client = clients[0];
    strictEqual(client.name, "StorageClient");
    strictEqual(client.initialization.access, "public");
    strictEqual(client.initialization.model.properties.length, 2);
    ok(client.initialization.model.properties.find((x) => x.kind === "endpoint"));
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.onClient, true);

    const methods = client.methods;
    strictEqual(methods.length, 2);

    // the main client's function should not have `blobName` as a client method parameter
    const mainClientDownload = methods.find((x) => x.kind === "basic" && x.name === "download");
    ok(mainClientDownload);
    strictEqual(mainClientDownload.parameters.length, 0);

    const getBlobClient = methods.find((x) => x.kind === "clientaccessor");
    ok(getBlobClient);
    strictEqual(getBlobClient.kind, "clientaccessor");
    strictEqual(getBlobClient.name, "getBlobClient");
    strictEqual(getBlobClient.parameters.length, 1);
    const blobNameParam = getBlobClient.parameters.find((x) => x.name === "blobName");
    ok(blobNameParam);
    strictEqual(blobNameParam.onClient, true);
    strictEqual(blobNameParam.optional, false);
    strictEqual(blobNameParam.kind, "method");

    const blobClient = getBlobClient.response;

    strictEqual(blobClient.kind, "client");
    strictEqual(blobClient.name, "BlobClient");
    strictEqual(blobClient.initialization.access, "internal");
    strictEqual(blobClient.initialization.model.properties.length, 2);

    ok(blobClient.initialization.model.properties.find((x) => x.kind === "endpoint"));
    const blobClientBlobInitializationProp = blobClient.initialization.model.properties.find(
      (x) => x.name === "blobName",
    );
    ok(blobClientBlobInitializationProp);
    strictEqual(blobClientBlobInitializationProp.kind, "method");
    strictEqual(blobClientBlobInitializationProp.onClient, true);
    strictEqual(blobClient.methods.length, 1);

    const download = blobClient.methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 0);

    const downloadOp = download.operation;
    strictEqual(downloadOp.parameters.length, 1);
    const blobNameOpParam = downloadOp.parameters[0];
    strictEqual(blobNameOpParam.name, "blobName");
    strictEqual(blobNameOpParam.correspondingMethodParams.length, 1);
    strictEqual(blobNameOpParam.correspondingMethodParams[0], blobClientBlobInitializationProp);
    strictEqual(blobNameOpParam.onClient, true);

    strictEqual(sdkPackage.models.length, 1);
    const clientInitializationModel = sdkPackage.models[0];
    ok(clientInitializationModel.usage & UsageFlags.ClientInitialization);
  });
  it("some methods don't have client initialization params", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;

      op download(@path blobName: string, @header header: int32): void;
      op noClientParams(@query query: int32): void;
      `,
      `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      @@clientInitialization(MyService, MyCustomizations.MyClientInitialization);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    strictEqual(client.initialization.model.properties.length, 2);
    const endpoint = client.initialization.model.properties.find((x) => x.kind === "endpoint");
    ok(endpoint);
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.clientDefaultValue, undefined);
    strictEqual(blobName.onClient, true);
    strictEqual(blobName.optional, false);

    const methods = client.methods;
    strictEqual(methods.length, 2);
    const download = methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 1);

    const headerParam = download.parameters.find((x) => x.name === "header");
    ok(headerParam);
    strictEqual(headerParam.onClient, false);

    const downloadOp = download.operation;
    strictEqual(downloadOp.parameters.length, 2);
    const blobNameOpParam = downloadOp.parameters[0];
    strictEqual(blobNameOpParam.name, "blobName");
    strictEqual(blobNameOpParam.correspondingMethodParams.length, 1);
    strictEqual(blobNameOpParam.correspondingMethodParams[0], blobName);
    strictEqual(blobNameOpParam.onClient, true);

    const noClientParamsMethod = methods[1];
    strictEqual(noClientParamsMethod.name, "noClientParams");
    strictEqual(noClientParamsMethod.kind, "basic");
    strictEqual(noClientParamsMethod.parameters.length, 1);
    strictEqual(noClientParamsMethod.parameters[0].name, "query");
    strictEqual(noClientParamsMethod.parameters[0].onClient, false);
  });

  it("multiple client params", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;

      op download(@path blobName: string, @path containerName: string): void;
      `,
      `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
        containerName: string;
      }

      @@clientInitialization(MyService, MyCustomizations.MyClientInitialization);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const client = sdkPackage.clients[0];
    strictEqual(client.initialization.model.properties.length, 3);
    const endpoint = client.initialization.model.properties.find((x) => x.kind === "endpoint");
    ok(endpoint);
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.clientDefaultValue, undefined);
    strictEqual(blobName.onClient, true);
    strictEqual(blobName.optional, false);

    const containerName = client.initialization.model.properties.find(
      (x) => x.name === "containerName",
    );
    ok(containerName);
    strictEqual(containerName.clientDefaultValue, undefined);
    strictEqual(containerName.onClient, true);

    const methods = client.methods;
    strictEqual(methods.length, 1);
    const download = methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 0);

    const downloadOp = download.operation;
    strictEqual(downloadOp.parameters.length, 2);
    const blobNameOpParam = downloadOp.parameters[0];
    strictEqual(blobNameOpParam.name, "blobName");
    strictEqual(blobNameOpParam.correspondingMethodParams.length, 1);
    strictEqual(blobNameOpParam.correspondingMethodParams[0], blobName);

    const containerNameOpParam = downloadOp.parameters[1];
    strictEqual(containerNameOpParam.name, "containerName");
    strictEqual(containerNameOpParam.correspondingMethodParams.length, 1);
    strictEqual(containerNameOpParam.correspondingMethodParams[0], containerName);

    strictEqual(sdkPackage.models.length, 1);
    const clientInitializationModel = sdkPackage.models[0];
    ok(clientInitializationModel.usage & UsageFlags.ClientInitialization);
  });

  it("@operationGroup with same model on parent client", async () => {
    await runner.compile(
      `
      @service
      namespace MyService;

      @operationGroup
      interface MyInterface {
        op download(@path blobName: string, @path containerName: string): void;
      }

      model MyClientInitialization {
        blobName: string;
        containerName: string;
      }

      @@clientInitialization(MyService, MyClientInitialization);
      @@clientInitialization(MyService.MyInterface, MyClientInitialization);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);

    const client = sdkPackage.clients[0];
    strictEqual(client.initialization.access, "public");
    strictEqual(client.initialization.model.properties.length, 3);
    ok(client.initialization.model.properties.find((x) => x.kind === "endpoint"));
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.clientDefaultValue, undefined);
    strictEqual(blobName.onClient, true);

    const containerName = client.initialization.model.properties.find(
      (x) => x.name === "containerName",
    );
    ok(containerName);
    strictEqual(containerName.clientDefaultValue, undefined);
    strictEqual(containerName.onClient, true);

    const methods = client.methods;
    strictEqual(methods.length, 1);
    const clientAccessor = methods[0];
    strictEqual(clientAccessor.kind, "clientaccessor");
    const og = clientAccessor.response;
    strictEqual(og.kind, "client");

    strictEqual(og.initialization.access, "internal");
    strictEqual(og.initialization.model.properties.length, 3);
    ok(og.initialization.model.properties.find((x) => x.kind === "endpoint"));
    ok(og.initialization.model.properties.find((x) => x === blobName));
    ok(og.initialization.model.properties.find((x) => x === containerName));

    const download = og.methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 0);

    const op = download.operation;
    strictEqual(op.parameters.length, 2);
    strictEqual(op.parameters[0].correspondingMethodParams[0], blobName);
    strictEqual(op.parameters[1].correspondingMethodParams[0], containerName);
    strictEqual(op.parameters[0].onClient, true);
    strictEqual(op.parameters[1].onClient, true);
  });

  it("redefine client structure", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace MyService;

      op uploadContainer(@path containerName: string): void;
      op uploadBlob(@path containerName: string, @path blobName: string): void;
      `,
      `
      namespace MyCustomizations {
        model ContainerClientInitialization {
          containerName: string;
        }
        @client({service: MyService})
        @clientInitialization(ContainerClientInitialization)
        namespace ContainerClient {
          op upload is MyService.uploadContainer;


          model BlobClientInitialization {
            containerName: string;
            blobName: string;
          }

          @client({service: MyService})
          @clientInitialization(BlobClientInitialization)
          namespace BlobClient {
            op upload is MyService.uploadBlob;
          }
        }
      }
      
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 2);

    const containerClient = sdkPackage.clients.find((x) => x.name === "ContainerClient");
    ok(containerClient);
    strictEqual(containerClient.initialization.access, "public");
    strictEqual(containerClient.initialization.model.properties.length, 2);
    ok(containerClient.initialization.model.properties.find((x) => x.kind === "endpoint"));

    const containerName = containerClient.initialization.model.properties.find(
      (x) => x.name === "containerName",
    );
    ok(containerName);

    const methods = containerClient.methods;
    strictEqual(methods.length, 1);
    strictEqual(methods[0].name, "upload");
    strictEqual(methods[0].kind, "basic");
    strictEqual(methods[0].parameters.length, 0);
    strictEqual(methods[0].operation.parameters.length, 1);
    strictEqual(methods[0].operation.parameters[0].correspondingMethodParams[0], containerName);

    const blobClient = sdkPackage.clients.find((x) => x.name === "BlobClient");
    ok(blobClient);
    strictEqual(blobClient.initialization.access, "public");
    strictEqual(blobClient.initialization.model.properties.length, 3);
    ok(blobClient.initialization.model.properties.find((x) => x.kind === "endpoint"));

    const containerNameOnBlobClient = blobClient.initialization.model.properties.find(
      (x) => x.name === "containerName",
    );
    ok(containerNameOnBlobClient);

    const blobName = blobClient.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);

    const blobMethods = blobClient.methods;
    strictEqual(blobMethods.length, 1);
    strictEqual(blobMethods[0].name, "upload");
    strictEqual(blobMethods[0].kind, "basic");
    strictEqual(blobMethods[0].parameters.length, 0);
    strictEqual(blobMethods[0].operation.parameters.length, 2);
    strictEqual(
      blobMethods[0].operation.parameters[0].correspondingMethodParams[0],
      containerNameOnBlobClient,
    );
    strictEqual(blobMethods[0].operation.parameters[1].correspondingMethodParams[0], blobName);

    strictEqual(sdkPackage.models.length, 2);
    const containerClientInitializationModel = sdkPackage.models.find(
      (x) => x.name === "ContainerClientInitialization",
    );
    ok(containerClientInitializationModel);
    ok(containerClientInitializationModel.usage & UsageFlags.ClientInitialization);

    const blobClientInitializationModel = sdkPackage.models.find(
      (x) => x.name === "BlobClientInitialization",
    );
    ok(blobClientInitializationModel);
    ok(blobClientInitializationModel.usage & UsageFlags.ClientInitialization);
  });

  it("@paramAlias", async () => {
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
    strictEqual(client.initialization.model.properties.length, 2);
    const endpoint = client.initialization.model.properties.find((x) => x.kind === "endpoint");
    ok(endpoint);
    const blobName = client.initialization.model.properties.find((x) => x.name === "blobName");
    ok(blobName);
    strictEqual(blobName.clientDefaultValue, undefined);
    strictEqual(blobName.onClient, true);
    strictEqual(blobName.optional, false);

    const methods = client.methods;
    strictEqual(methods.length, 2);
    const download = methods[0];
    strictEqual(download.name, "download");
    strictEqual(download.kind, "basic");
    strictEqual(download.parameters.length, 0);

    const downloadOp = download.operation;
    strictEqual(downloadOp.parameters.length, 1);
    strictEqual(downloadOp.parameters[0].name, "blob");
    strictEqual(downloadOp.parameters[0].correspondingMethodParams.length, 1);
    strictEqual(downloadOp.parameters[0].correspondingMethodParams[0], blobName);

    const upload = methods[1];
    strictEqual(upload.name, "upload");
    strictEqual(upload.kind, "basic");
    strictEqual(upload.parameters.length, 0);

    const uploadOp = upload.operation;
    strictEqual(uploadOp.parameters.length, 1);
    strictEqual(uploadOp.parameters[0].name, "blobName");
    strictEqual(uploadOp.parameters[0].correspondingMethodParams.length, 1);
    strictEqual(uploadOp.parameters[0].correspondingMethodParams[0], blobName);
  });

  it("storage example", async () => {
    await runner.compileWithCustomization(
      `
      @service
      namespace Storage.Blob;
      op download(@header("x-ms-version") version: string): void;
      `,
      `
      namespace MyCustomizations;

      model StorageBlobOptions {
        version: string;
      }

      @@clientInitialization(Storage.Blob, MyCustomizations.StorageBlobOptions);
      `,
    );
    const sdkPackage = runner.context.sdkPackage;
    const model = sdkPackage.models.find((x) => x.name === "StorageBlobOptions");
    ok(model);
    ok(model.usage & UsageFlags.ClientInitialization);
    const version = model.properties.find(x =>  x.name === "version");
    ok(version);

    const client = sdkPackage.clients[0];
    strictEqual(client.initialization.model, model);
    const method = client.methods[0];
    strictEqual(method.kind, "basic");
    strictEqual(method.name, "download");
    strictEqual(method.parameters.length, 0);
    const op = method.operation;
    strictEqual(op.parameters.length, 1);
    const versionParam = op.parameters[0];
    strictEqual(versionParam.name, "version");
    strictEqual(versionParam.onClient, true);
    strictEqual(versionParam.serializedName, "x-ms-version");
    strictEqual(versionParam.correspondingMethodParams[0], version)
  });
});
