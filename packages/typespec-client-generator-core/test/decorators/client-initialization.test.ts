import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  InitializedByFlags,
  type SdkClientType,
  type SdkHttpOperation,
} from "../../src/interfaces.js";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
  SimpleTesterWithService,
} from "../tester.js";

it("change client initialization", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);
  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
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
});

it("backward compatibility", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);
  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
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
});

it("client accessor", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
      model clientInitModel
      {
          p1: string;
      }

      @route("/bump")
      @clientInitialization({parameters: clientInitModel})
      interface bumpParameter {
          @route("/op1")
          
          @post
          @convenientAPI(true, "java")
          op op1(@path p1: string, @query q1: string): void;

          @route("/op2")
          
          @post
          @convenientAPI(true, "java")
          op op2(@path p1: string): void;
      }
      `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];

  const bumpParameterClient = client.children![0] as SdkClientType<SdkHttpOperation>;
  strictEqual(bumpParameterClient.clientInitialization.initializedBy, InitializedByFlags.Default);

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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

      @@clientInitialization(StorageClient, {parameters: ClientInitialization});
      @@clientInitialization(StorageClient.BlobClient, {parameters: ClientInitialization});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const clients = sdkPackage.clients;
  strictEqual(clients.length, 1);
  const client = clients[0];
  strictEqual(client.name, "StorageClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);
  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
  strictEqual(blobName.onClient, true);

  const methods = client.methods;
  strictEqual(methods.length, 1);

  // the main client's function should not have `blobName` as a client method parameter
  const mainClientDownload = methods.find((x) => x.kind === "basic" && x.name === "download");
  ok(mainClientDownload);
  strictEqual(mainClientDownload.parameters.length, 0);

  const blobClient = client.children![0] as SdkClientType<SdkHttpOperation>;

  strictEqual(blobClient.kind, "client");
  strictEqual(blobClient.name, "BlobClient");
  strictEqual(blobClient.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(blobClient.clientInitialization.parameters.length, 2);

  const blobClientEndpoint = blobClient.clientInitialization.parameters.find(
    (x) => x.kind === "endpoint",
  );
  ok(blobClientEndpoint);
  strictEqual(
    blobClientEndpoint,
    blobClient.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobClientBlobName = blobClient.clientInitialization.parameters.find(
    (x) => x.name === "blobName",
  );
  ok(blobClientBlobName);
  strictEqual(
    blobClientBlobName,
    blobClient.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
  strictEqual(blobClientBlobName.kind, "method");
  strictEqual(blobClientBlobName.onClient, true);
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
  strictEqual(blobNameOpParam.correspondingMethodParams[0], blobClientBlobName);
  strictEqual(blobNameOpParam.onClient, true);
});

it("some methods don't have client initialization params", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 3);

  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
  strictEqual(blobName.clientDefaultValue, undefined);
  strictEqual(blobName.onClient, true);
  strictEqual(blobName.optional, false);

  const containerName = client.clientInitialization.parameters.find(
    (x) => x.name === "containerName",
  );
  ok(containerName);
  strictEqual(
    containerName,
    client.clientInitialization.parameters.find((x) => x.name === "containerName"),
  );
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
});

it("Sub client with same model on parent client", async () => {
  const { program } = await SimpleTester.compile(
    `
      @service
      namespace MyService;

      interface MyInterface {
        op download(@path blobName: string, @path containerName: string): void;
      }

      model MyClientInitialization {
        blobName: string;
        containerName: string;
      }

      @@clientInitialization(MyService, {parameters: MyClientInitialization});
      @@clientInitialization(MyService.MyInterface, {parameters: MyClientInitialization});
      `,
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 3);

  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );
  strictEqual(blobName.clientDefaultValue, undefined);
  strictEqual(blobName.onClient, true);

  const containerName = client.clientInitialization.parameters.find(
    (x) => x.name === "containerName",
  );
  ok(containerName);
  strictEqual(
    containerName,
    client.clientInitialization.parameters.find((x) => x.name === "containerName"),
  );
  strictEqual(containerName.clientDefaultValue, undefined);
  strictEqual(containerName.onClient, true);

  const methods = client.methods;
  strictEqual(methods.length, 0);

  const og = client.children![0] as SdkClientType<SdkHttpOperation>;
  strictEqual(og.kind, "client");

  strictEqual(og.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(og.clientInitialization.parameters.length, 3);

  ok(og.clientInitialization.parameters.find((x) => x.kind === "endpoint"));
  ok(og.clientInitialization.parameters.find((x) => x === blobName));
  ok(og.clientInitialization.parameters.find((x) => x === containerName));
  ok(og.clientInitialization.parameters.find((x) => x.kind === "endpoint"));
  ok(og.clientInitialization.parameters.find((x) => x === blobName));
  ok(og.clientInitialization.parameters.find((x) => x === containerName));

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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
      @clientInitialization({parameters: ContainerClientInitialization})
      namespace ContainerClient {
        op upload is MyService.uploadContainer;

        model BlobClientInitialization {
          containerName: string;
          blobName: string;
        }

        @client({service: MyService})
        @clientInitialization({parameters: BlobClientInitialization})
        namespace BlobClient {
          op upload is MyService.uploadBlob;
        }
      }
    }
    
    `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const containerClient = sdkPackage.clients.find((x) => x.name === "ContainerClient");
  ok(containerClient);
  strictEqual(containerClient.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(containerClient.clientInitialization.parameters.length, 2);

  const endpoint = containerClient.clientInitialization.parameters.find(
    (x) => x.kind === "endpoint",
  );
  ok(endpoint);
  strictEqual(
    endpoint,
    containerClient.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );

  const containerName = containerClient.clientInitialization.parameters.find(
    (x) => x.name === "containerName",
  );
  ok(containerName);
  strictEqual(
    containerName,
    containerClient.clientInitialization.parameters.find((x) => x.name === "containerName"),
  );

  const methods = containerClient.methods;
  strictEqual(methods.length, 1);
  strictEqual(methods[0].name, "upload");
  strictEqual(methods[0].kind, "basic");
  strictEqual(methods[0].parameters.length, 0);
  strictEqual(methods[0].operation.parameters.length, 1);
  strictEqual(methods[0].operation.parameters[0].correspondingMethodParams[0], containerName);

  const blobClient = containerClient.children?.find((x) => x.name === "BlobClient");
  ok(blobClient);
  strictEqual(blobClient.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(blobClient.clientInitialization.parameters.length, 3);

  const endpointOnBlobClient = blobClient.clientInitialization.parameters.find(
    (x) => x.kind === "endpoint",
  );
  ok(endpointOnBlobClient);
  strictEqual(
    endpointOnBlobClient,
    blobClient.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );

  const containerNameOnBlobClient = blobClient.clientInitialization.parameters.find(
    (x) => x.name === "containerName",
  );
  ok(containerNameOnBlobClient);
  strictEqual(
    containerNameOnBlobClient,
    blobClient.clientInitialization.parameters.find((x) => x.name === "containerName"),
  );

  const blobName = blobClient.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    blobClient.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );

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
});

it("@paramAlias", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

    @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization});
    `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);

  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  strictEqual(
    endpoint,
    client.clientInitialization.parameters.find((x) => x.kind === "endpoint"),
  );

  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(
    blobName,
    client.clientInitialization.parameters.find((x) => x.name === "blobName"),
  );

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

it("sub client initialized individually", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
    model clientInitModel
    {
        p1: string;
    }

    @route("/bump")
    @clientInitialization({parameters: clientInitModel, initializedBy: InitializedBy.individually | InitializedBy.parent})
    interface bumpParameter {
        @route("/op1")
        
        @post
        @convenientAPI(true, "java")
        op op1(@path p1: string, @query q1: string): void;

        @route("/op2")
        
        @post
        @convenientAPI(true, "java")
        op op2(@path p1: string): void;
    }
    `,
  );
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-java",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];

  const bumpParameterClient = client.children![0] as SdkClientType<SdkHttpOperation>;
  strictEqual(
    bumpParameterClient.clientInitialization.initializedBy,
    InitializedByFlags.Individually | InitializedByFlags.Parent,
  );
});

it("wrong initializedBy value type", async () => {
  const diagnostics = await SimpleTester.diagnose(`
    @clientInitialization({initializedBy: 4})
    namespace Test {
    }
  `);

  expectDiagnostics(diagnostics, {
    code: "invalid-argument",
  });
});

it("client initialized with None", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

      @@clientInitialization(MyService, {parameters: MyCustomizations.MyClientInitialization, initializedBy: InitializedBy.customizeCode});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.CustomizeCode);
  strictEqual(client.clientInitialization.parameters.length, 2);
  const endpoint = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpoint);
  const blobName = client.clientInitialization.parameters.find((x) => x.name === "blobName");
  ok(blobName);
  strictEqual(blobName.onClient, true);
});

describe("@clientInitialization scope in ClientInitializationOptions", () => {
  const mainCode = `
      @service
      namespace MyService;

      op download(@path blobName: string): void;
      `;

  function customization(scopeArgs: string): string {
    return `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      @@clientInitialization(MyService, ${scopeArgs});
      `;
  }

  it("accepts scope through ClientInitializationOptions.scope instead of the legacy positional argument", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        mainCode,
        customization(`{parameters: MyCustomizations.MyClientInitialization, scope: "csharp"}`),
      ),
    );

    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    strictEqual(
      csharpContext.sdkPackage.clients[0].clientInitialization.parameters.length,
      2,
      "csharp is in scope, so the customization applies",
    );

    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      pythonContext.sdkPackage.clients[0].clientInitialization.parameters.length,
      1,
      "python is out of scope, so only the default endpoint parameter remains",
    );
  });

  it("reports a warning and prefers the options bag scope when ClientInitializationOptions.scope conflicts with the legacy positional argument", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        mainCode,
        customization(
          `{parameters: MyCustomizations.MyClientInitialization, scope: "csharp"}, "python"`,
        ),
      ),
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflicting-scope",
      severity: "warning",
    });

    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    strictEqual(
      csharpContext.sdkPackage.clients[0].clientInitialization.parameters.length,
      2,
      "the options bag scope wins, so csharp gets the customization",
    );

    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      pythonContext.sdkPackage.clients[0].clientInitialization.parameters.length,
      1,
      "the legacy positional scope is ignored, so python does not get the customization",
    );
  });

  it("does not report a warning when the options bag scope and the legacy positional scope are semantically equivalent", async () => {
    const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
        mainCode,
        customization(
          `{parameters: MyCustomizations.MyClientInitialization, scope: "csharp, python"}, "python,csharp"`,
        ),
      ),
    );

    expectDiagnostics(diagnostics, []);
  });

  it("treats a named model extending ClientInitializationOptions as an options bag (scope selects the emitter, no scope parameter)", async () => {
    // Regression (provenance, not name): a named model that derives from ClientInitializationOptions
    // is an options bag even though it is named. Its `scope` selects the emitter and must not become
    // a client parameter.
    const customizationCode = `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      model CSharpInitialization extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        parameters: MyClientInitialization;
        scope: "csharp";
      }

      @@clientInitialization(MyService, MyCustomizations.CSharpInitialization);
      `;

    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    const csharpInit = (
      await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-csharp" })
    ).sdkPackage.clients[0].clientInitialization;
    strictEqual(csharpInit.parameters.length, 2, "csharp is in scope, so blobName is elevated");
    ok(
      !csharpInit.parameters.find((x) => x.name === "scope"),
      "scope must not become a client initialization parameter",
    );

    const pythonInit = (
      await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" })
    ).sdkPackage.clients[0].clientInitialization;
    strictEqual(
      pythonInit.parameters.length,
      1,
      "python is out of scope, so only the default endpoint parameter remains",
    );
    ok(!pythonInit.parameters.find((x) => x.name === "scope"));
  });

  it("identifies a scope-only named model extending ClientInitializationOptions via ancestry", async () => {
    // Regression (Josh counterexample 1): a *named* model deriving from ClientInitializationOptions
    // that only sets scope must be recognized as an options bag through its ancestry, so scope
    // selects the emitter and never becomes a client parameter.
    const customizationCode = `
      namespace MyCustomizations;

      model CSharpOnly extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        scope: "csharp";
      }

      @@clientInitialization(MyService, MyCustomizations.CSharpOnly);
      `;

    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    for (const emitterName of ["@azure-tools/typespec-csharp", "@azure-tools/typespec-python"]) {
      const init = (await createSdkContextForTester(program, { emitterName })).sdkPackage.clients[0]
        .clientInitialization;
      ok(
        !init.parameters.find((x) => x.name === "scope"),
        `scope must not become a client parameter for ${emitterName}`,
      );
    }
  });

  it("treats an anonymous scope-only model as a legacy raw parameters model", async () => {
    // Regression (backward compatibility): an anonymous scope-only model such as
    // `{ scope: "https://management.azure.com/.default" }` was a valid legacy raw parameters model
    // before the options-bag feature, so its `scope` must remain a real client parameter for all
    // emitters instead of being consumed as an emitter selector.
    const legacyMain = `
      @service
      namespace MyService;

      op download(@path blobName: string, @query scope: "https://management.azure.com/.default"): void;
      `;
    const legacyCustomization = `
      namespace MyCustomizations;

      @@clientInitialization(MyService, { scope: "https://management.azure.com/.default" });
      `;

    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(legacyMain, legacyCustomization),
    );
    expectDiagnostics(diagnostics, []);

    for (const emitterName of ["@azure-tools/typespec-csharp", "@azure-tools/typespec-python"]) {
      const context = await createSdkContextForTester(program, { emitterName });
      const scopeParam = context.sdkPackage.clients[0].clientInitialization.parameters.find(
        (x) => x.name === "scope",
      );
      ok(scopeParam, `scope must remain a client parameter for ${emitterName}`);
    }
  });

  it("treats a legacy raw parameters model with a scope property as client parameters", async () => {
    // Regression: a legacy client-parameters model that happens to contain a `scope` property must
    // not be interpreted as an emitter selector. The `scope` must remain a real client parameter
    // and the customization must apply to every emitter.
    const legacyMain = `
      @service
      namespace MyService;

      op download(@path blobName: string, @query scope: "https://management.azure.com/.default"): void;
      `;
    const legacyCustomization = `
      namespace MyCustomizations;

      model LegacyClientParameters {
        scope: "https://management.azure.com/.default";
      }

      @@clientInitialization(MyService, MyCustomizations.LegacyClientParameters);
      `;

    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(legacyMain, legacyCustomization),
    );
    expectDiagnostics(diagnostics, []);

    for (const emitterName of ["@azure-tools/typespec-csharp", "@azure-tools/typespec-python"]) {
      const context = await createSdkContextForTester(program, { emitterName });
      const scopeParam = context.sdkPackage.clients[0].clientInitialization.parameters.find(
        (x) => x.name === "scope",
      );
      ok(scopeParam, `scope must remain a client parameter for ${emitterName}`);
    }
  });

  it("identifies a scope-only model via sourceModel provenance (model is PickProperties)", async () => {
    // Regression (Josh: traverse source-model provenance): a named model produced by a spread-based
    // transformation such as `model Copy is PickProperties<Base, "scope">` has no `baseModel`, but it
    // still derives from ClientInitializationOptions through `sourceModel`/`sourceModels`. It must be
    // recognized as an options bag so `scope` selects the emitter instead of leaking as a parameter.
    const customizationCode = `
      namespace MyCustomizations;

      model Base extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        scope: "csharp";
      }

      model Copy is TypeSpec.PickProperties<Base, "scope">;

      @@clientInitialization(MyService, MyCustomizations.Copy);
      `;

    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    for (const emitterName of ["@azure-tools/typespec-csharp", "@azure-tools/typespec-python"]) {
      const init = (await createSdkContextForTester(program, { emitterName })).sdkPackage.clients[0]
        .clientInitialization;
      ok(
        !init.parameters.find((x) => x.name === "scope"),
        `scope must not become a client parameter for ${emitterName}`,
      );
    }
  });

  it("resolves an inherited scope through the model inheritance chain", async () => {
    // Regression (Josh: resolve scope through the effective options inheritance chain): a `scope`
    // declared on a base options model must be honored even when the leaf model only adds other
    // properties. `Final extends Base` inherits `scope: "csharp"`, so the customization applies to
    // csharp only, and scope is never surfaced as a client parameter.
    const customizationCode = `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      model Base extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        scope: "csharp";
      }

      model Final extends Base {
        parameters: MyClientInitialization;
      }

      @@clientInitialization(MyService, MyCustomizations.Final);
      `;

    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    const csharpInit = (
      await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-csharp" })
    ).sdkPackage.clients[0].clientInitialization;
    strictEqual(
      csharpInit.parameters.length,
      2,
      "csharp is in scope (inherited), so blobName is elevated",
    );
    ok(
      !csharpInit.parameters.find((x) => x.name === "scope"),
      "scope must not become a client parameter",
    );

    const pythonInit = (
      await createSdkContextForTester(program, { emitterName: "@azure-tools/typespec-python" })
    ).sdkPackage.clients[0].clientInitialization;
    strictEqual(
      pythonInit.parameters.length,
      1,
      "python is out of scope (inherited scope selects csharp), so only endpoint remains",
    );
  });

  it("reports a conflict for an inherited scope that disagrees with the legacy positional argument", async () => {
    // Regression (Josh: inherited scope must still be compared): an inherited `scope` that conflicts
    // with the legacy positional scope argument must still produce a `conflicting-scope` warning.
    const customizationCode = `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      model Base extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        scope: "csharp";
      }

      model Final extends Base {
        parameters: MyClientInitialization;
      }

      @@clientInitialization(MyService, MyCustomizations.Final, "python");
      `;

    const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/conflicting-scope",
      severity: "warning",
    });
  });

  it("resolves inherited parameters and initializedBy through the model inheritance chain", async () => {
    // Every `ClientInitializationOptions` setting - not just `scope` - is read through the `extends`
    // chain. Here `parameters` and `initializedBy` are declared on the base options model while the
    // leaf only adds `scope`, and both base settings are still applied. (`customizeCode` is used
    // because it is a valid `initializedBy` value for a root client and differs from the default.)
    const customizationCode = `
      namespace MyCustomizations;

      model MyClientInitialization {
        blobName: string;
      }

      model Base extends Azure.ClientGenerator.Core.ClientInitializationOptions {
        parameters: MyClientInitialization;
        initializedBy: InitializedBy.customizeCode;
      }

      model Final extends Base {
        scope: "csharp";
      }

      @@clientInitialization(MyService, MyCustomizations.Final);
      `;

    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );

    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const csharpClient = csharpContext.sdkPackage.clients[0];
    strictEqual(
      csharpClient.clientInitialization.parameters.length,
      2,
      "csharp is in scope, so the inherited parameters model is applied",
    );
    strictEqual(
      csharpClient.clientInitialization.initializedBy,
      InitializedByFlags.CustomizeCode,
      "the inherited initializedBy flag is applied",
    );

    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    strictEqual(
      pythonContext.sdkPackage.clients[0].clientInitialization.parameters.length,
      1,
      "python is out of scope, so only the default endpoint parameter remains",
    );
  });
});
