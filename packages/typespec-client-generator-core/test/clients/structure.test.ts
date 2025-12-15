import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { InitializedByFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

it("normal client", async () => {
  await runner.compile(
    `
    @service(#{
      title: "Pet Store",
    })
    namespace PetStore;

    @route("/feed")
    op feed(): void;

    @route("/pet")
    op pet(): void;
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "PetStoreClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");

  const methods = client.methods;
  strictEqual(methods.length, 2);
  strictEqual(methods[0].name, "feed");
  strictEqual(methods[1].name, "pet");
});

it("arm client with operation groups", async () => {
  const runnerWithArm = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithArm.compile(`
    @armProviderNamespace("My.Service")
    @server("http://localhost:3000", "endpoint")
    @service(#{title: "My.Service"})
    @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v5)
    namespace My.Service;

    /** Api versions */
    enum Versions {
      /** 2024-04-01-preview api version */
          V2024_04_01_PREVIEW: "2024-04-01-preview",
    }

    model TestTrackedResource is TrackedResource<TestTrackedResourceProperties> {
      ...ResourceNameParameter<TestTrackedResource>;
    }

    model TestTrackedResourceProperties {
      description?: string;
    }

    @armResourceOperations
    interface Tests {
      get is ArmResourceRead<TestTrackedResource>;
    }
  `);

  const sdkPackage = runnerWithArm.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 4);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(client.clientInitialization.parameters[1].name, "credential");
  strictEqual(client.clientInitialization.parameters[2].name, "apiVersion");
  strictEqual(client.clientInitialization.parameters[3].name, "subscriptionId");
  strictEqual(client.methods.length, 0);
  strictEqual(client.children?.length, 1);

  const tests = client.children?.find((c) => c.name === "Tests");
  ok(tests);
  strictEqual(tests.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(tests.clientInitialization.parameters.length, 4);
  strictEqual(tests.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(tests.clientInitialization.parameters[1].name, "credential");
  strictEqual(tests.clientInitialization.parameters[2].name, "apiVersion");
  strictEqual(tests.clientInitialization.parameters[3].name, "subscriptionId");
  strictEqual(tests.methods.length, 1);
  strictEqual(tests.methods[0].name, "get");
});

it("client with sub clients", async () => {
  await runner.compile(
    `
    @service(#{
      title: "Pet Store",
    })
    namespace PetStore;

    @route("/pets")
    namespace Pets {
      @route("/dogs")
      interface Dogs {
        @route("/feed")
        feed(): void;
        @route("/pet")
        pet(): void;
      }

      @route("/cats")
      interface Cats {
        @route("/feed")
        op feed(): void;
        @route("/pet")
        op pet(): void;
      }
    }

    @route("/actions")
    interface Actions {
      @route("/open")
      open(): void;
      @route("/close")
      close(): void;
    }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "PetStoreClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(client.methods.length, 0);
  strictEqual(client.children?.length, 2);

  const pets = client.children?.find((c) => c.name === "Pets");
  ok(pets);
  strictEqual(pets.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(pets.clientInitialization.parameters.length, 1);
  strictEqual(pets.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(pets?.methods.length, 0);
  strictEqual(pets?.children?.length, 2);

  const dogs = pets.children?.find((c) => c.name === "Dogs");
  ok(dogs);
  strictEqual(dogs.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(dogs.clientInitialization.parameters.length, 1);
  strictEqual(dogs.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(dogs?.methods.length, 2);
  strictEqual(dogs?.methods[0].name, "feed");
  strictEqual(dogs?.methods[1].name, "pet");

  const cats = pets.children?.find((c) => c.name === "Cats");
  ok(cats);
  strictEqual(cats.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(cats.clientInitialization.parameters.length, 1);
  strictEqual(cats.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(cats?.methods.length, 2);
  strictEqual(cats?.methods[0].name, "feed");
  strictEqual(cats?.methods[1].name, "pet");

  const actions = client.children?.find((c) => c.name === "Actions");
  ok(actions);
  strictEqual(actions.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(actions.clientInitialization.parameters.length, 1);
  strictEqual(actions.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(actions?.methods.length, 2); // client accessor methods which have already deprecated
  strictEqual(actions?.methods[0].name, "open");
  strictEqual(actions?.methods[1].name, "close");
});

it("client with sub client and sub client has extra initialization paramters", async () => {
  await runner.compileWithCustomization(
    `
    @service(#{
      title: "Azure AI Face API",
    })
    namespace Face;

    @route("/largefacelists")
    interface FaceListOperations {
      op getLargeFaceList(@query largeFaceListId: string): void;
    }

    @route("/largepersongroups")
    interface PersonGroupOperations {
      op getLargePersonGroup(@query largePersonGroupId: string): void;
    }
    `,
    `
    @client(
      {
        name: "FaceAdministrationClient",
        service: Face,
      }
    )
    namespace FaceAdministrationClient {
      model LargeFaceListClientOptions {
        largeFaceListId: string;
      }

      model LargePersonGroupClientOptions {
        largePersonGroupId: string;
      }

      @operationGroup
      @clientInitialization(LargeFaceListClientOptions)
      interface LargeFaceList {
        get is Face.FaceListOperations.getLargeFaceList;
      }

      @operationGroup
      @clientInitialization(LargePersonGroupClientOptions)
      interface LargePersonGroup {
        get is Face.PersonGroupOperations.getLargePersonGroup;
      }
    }
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "FaceAdministrationClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(client.methods.length, 0);
  strictEqual(client.children?.length, 2);

  const largeFaceList = client.children?.find((c) => c.name === "LargeFaceList");
  ok(largeFaceList);
  strictEqual(largeFaceList.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(largeFaceList.clientInitialization.parameters.length, 2);
  strictEqual(largeFaceList.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(largeFaceList.clientInitialization.parameters[1].name, "largeFaceListId");
  strictEqual(largeFaceList?.methods.length, 1);
  strictEqual(largeFaceList?.methods[0].name, "get");
  strictEqual(largeFaceList?.methods[0].parameters.length, 0);

  const largePersonGroup = client.children?.find((c) => c.name === "LargePersonGroup");
  ok(largePersonGroup);
  strictEqual(largePersonGroup.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(largePersonGroup.clientInitialization.parameters.length, 2);
  strictEqual(largePersonGroup.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(largePersonGroup.clientInitialization.parameters[1].name, "largePersonGroupId");
  strictEqual(largePersonGroup?.methods.length, 1);
  strictEqual(largePersonGroup?.methods[0].name, "get");
  strictEqual(largePersonGroup?.methods[0].parameters.length, 0);
});

it("client with sub client and sub client can also be initialized individually", async () => {
  await runner.compileWithCustomization(
    `
    @service(#{
      title: "Pet Store",
    })
    namespace PetStore;

    @route("/pets")
    namespace Pets {
      @route("/feed")
      op feed(): void;
      @route("/pet")
      op pet(): void;
    }

    @route("/actions")
    namespace Actions {
      @route("/open")
      op open(): void;
      @route("/close")
      op close(): void;
    }
    `,
    `
    @@clientInitialization(PetStore.Pets,
      {
        initializedBy: InitializedBy.individually | InitializedBy.parent,
      }
    );

    @@clientInitialization(PetStore.Actions,
      {
        initializedBy: InitializedBy.individually | InitializedBy.parent,
      }
    );
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "PetStoreClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 1);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(client.methods.length, 0);
  strictEqual(client.children?.length, 2);

  const pets = client.children?.find((c) => c.name === "Pets");
  ok(pets);
  strictEqual(
    pets.clientInitialization.initializedBy,
    InitializedByFlags.Individually | InitializedByFlags.Parent,
  );
  strictEqual(pets.clientInitialization.parameters.length, 1);
  strictEqual(pets.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(pets?.methods.length, 2);
  strictEqual(pets.methods[0].name, "feed");
  strictEqual(pets.methods[1].name, "pet");

  const actions = client.children?.find((c) => c.name === "Actions");
  ok(actions);
  strictEqual(
    actions.clientInitialization.initializedBy,
    InitializedByFlags.Individually | InitializedByFlags.Parent,
  );
  strictEqual(actions.clientInitialization.parameters.length, 1);
  strictEqual(actions.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(actions?.methods.length, 2);
  strictEqual(actions.methods[0].name, "open");
  strictEqual(actions.methods[1].name, "close");
});

it("client with sub client and sub client can also be initialized individually with extra paramters", async () => {
  await runner.compileWithCustomization(
    `
    @service
    namespace ContainerClient {
      interface Blob {
        @route("/blob")
        op download(@path containerName: string, @path blobName: string): void;
      }
    }
    `,
    `
    model ContainerClientInitialization {
      containerName: string
    };

    model BlobClientInitialization {
      containerName: string,
      blobName: string
    };

    @@clientInitialization(ContainerClient, {parameters: ContainerClientInitialization});
    @@clientInitialization(ContainerClient.Blob, {parameters: BlobClientInitialization, initializedBy: InitializedBy.individually | InitializedBy.parent});
    `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ContainerClient");
  strictEqual(client.clientInitialization.initializedBy, InitializedByFlags.Individually);
  strictEqual(client.clientInitialization.parameters.length, 2);
  strictEqual(client.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(client.clientInitialization.parameters[1].name, "containerName");
  strictEqual(client.methods.length, 0);
  strictEqual(client.children?.length, 1);

  const blob = client.children?.find((c) => c.name === "Blob");
  ok(blob);
  strictEqual(
    blob.clientInitialization.initializedBy,
    InitializedByFlags.Individually | InitializedByFlags.Parent,
  );
  strictEqual(blob.clientInitialization.parameters.length, 3);
  strictEqual(blob.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(blob.clientInitialization.parameters[1].name, "containerName");
  strictEqual(blob.clientInitialization.parameters[2].name, "blobName");
  strictEqual(blob?.methods.length, 1);
  strictEqual(blob.methods[0].name, "download");
  strictEqual(blob.methods[0].parameters.length, 0);
});

it("first level client could not be initialized by parent", async () => {
  await runner.compileWithCustomization(
    `
      @service
      namespace MyService;

      op download(@path blobName: string): void;
      `,
    `
      namespace MyCustomizations;

      @@clientInitialization(MyService, {initializedBy: InitializedBy.parent});
      `,
  );
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-initialized-by",
    message:
      "Invalid 'initializedBy' value. First level client must have `InitializedBy.individually` specified in `initializedBy`.",
  });
});

it("sub client could not only be initialized individually", async () => {
  await runner.compileWithBuiltInService(
    `
    @route("/bump")
    @clientInitialization({initializedBy: InitializedBy.individually})
    interface SubClient {
        op test(): void;
    }
    `,
  );
  expectDiagnostics(runner.context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-initialized-by",
    message:
      "Invalid 'initializedBy' value. Sub client must have `InitializedBy.parent` or `InitializedBy.individually | InitializedBy.parent` specified in `initializedBy`.",
  });
});

it("single with core", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @versioned(MyVersions)
    @server("http://localhost:3000", "endpoint")
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
    @service
    namespace My.Service;

    @doc("The version of the API.")
    enum MyVersions {
      @doc("The version 2022-12-01-preview.")
      v2022_12_01_preview: "2022-12-01-preview",
    }

    @resource("users")
    @doc("Details about a user.")
    model User {
      @key
      @doc("The user's id.")
      @visibility(Lifecycle.Read)
      id: int32;

      @doc("The user's name.")
      name: string;
    }

    alias ServiceTraits = Traits.SupportsRepeatableRequests & Traits.SupportsConditionalRequests & Traits.SupportsClientRequestId;

    alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;

    op delete is Operations.ResourceDelete<User>;
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.crossLanguageDefinitionId, "My.Service");
  strictEqual(client.clientInitialization.parameters.length, 3);
  strictEqual(client.apiVersions.length, 1);
  strictEqual(client.apiVersions[0], "2022-12-01-preview");

  const endpointParam = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpointParam);
  strictEqual(endpointParam.name, "endpoint");
  strictEqual(endpointParam.kind, "endpoint");
  strictEqual(endpointParam.optional, false);
  strictEqual(endpointParam.onClient, true);
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");

  strictEqual(endpointParam.type.templateArguments.length, 1);
  const endpointTemplateArg = endpointParam.type.templateArguments[0];
  strictEqual(endpointTemplateArg.name, "endpoint");
  strictEqual(endpointTemplateArg.onClient, true);
  strictEqual(endpointTemplateArg.optional, false);
  strictEqual(endpointTemplateArg.kind, "path");
  strictEqual(endpointTemplateArg.clientDefaultValue, "http://localhost:3000");

  const apiVersionParam = client.clientInitialization.parameters.filter(
    (p) => p.isApiVersionParam,
  )[0];
  strictEqual(apiVersionParam.name, "apiVersion");
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.kind, "method");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
});

it("multiple with core", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @versioned(MyVersions)
    @server("http://localhost:3000", "endpoint")
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
    @service
    namespace My.Service;

    @doc("The version of the API.")
    enum MyVersions {
      @doc("The version 2022-12-01-preview.")
      v2022_12_01_preview: "2022-12-01-preview",
      @doc("The version 2022-12-01.")
      v2022_12_01: "2022-12-01",
    }

    @resource("users")
    @doc("Details about a user.")
    model User {
      @key
      @doc("The user's id.")
      @visibility(Lifecycle.Read)
      id: int32;

      @doc("The user's name.")
      name: string;
    }

    alias ServiceTraits = Traits.SupportsRepeatableRequests & Traits.SupportsConditionalRequests & Traits.SupportsClientRequestId;

    alias Operations = Azure.Core.ResourceOperations<ServiceTraits>;
    op get is Operations.ResourceRead<User>;

    op delete is Operations.ResourceDelete<User>;
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "ServiceClient");
  strictEqual(client.crossLanguageDefinitionId, "My.Service");
  strictEqual(client.clientInitialization.parameters.length, 3);
  strictEqual(client.apiVersions.length, 2);
  deepStrictEqual(client.apiVersions, ["2022-12-01-preview", "2022-12-01"]);

  const endpointParam = client.clientInitialization.parameters.find((x) => x.kind === "endpoint");
  ok(endpointParam);
  strictEqual(endpointParam.type.kind, "endpoint");
  strictEqual(endpointParam.type.serverUrl, "{endpoint}");
  strictEqual(endpointParam.type.templateArguments.length, 1);
  const templateArg = endpointParam.type.templateArguments[0];
  strictEqual(templateArg.kind, "path");
  strictEqual(templateArg.name, "endpoint");
  strictEqual(templateArg.onClient, true);
  strictEqual(templateArg.clientDefaultValue, "http://localhost:3000");

  const apiVersionParam = client.clientInitialization.parameters.filter(
    (p) => p.isApiVersionParam,
  )[0];
  strictEqual(apiVersionParam.name, "apiVersion");
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.optional, false);
  strictEqual(apiVersionParam.kind, "method");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01");
});

it("namespace", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @server("http://localhost:3000", "endpoint")
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
    @service
    namespace My.Service;
    op func(): void;
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const clientOne = sdkPackage.clients.filter((c) => c.name === "ServiceClient")[0];
  strictEqual(clientOne.namespace, "My.Service");
});

it("model-only namespace should be filtered out", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @service
    namespace Foo {
      @usage(Usage.input)
      model B {}
    }
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 0);
  strictEqual(sdkPackage.models.length, 1);
});

it("empty namespace with empty subclient", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @service
    namespace Foo {
      model B {}
      namespace Bar {
        model A {}
      }
      interface Baz {}
    }
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 0);
});

it("explicit clients with only models should not be filtered out", async () => {
  const runnerWithCore = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core"],
    emitterName: "@azure-tools/typespec-java",
  });
  await runnerWithCore.compile(`
    @client
    @service
    namespace Foo {
      model B {}
    }
  `);
  const sdkPackage = runnerWithCore.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
});

it("operationGroup", async () => {
  await runner.compileWithBuiltInService(`
    @operationGroup
    namespace MyOperationGroup {
      op func(): void;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const mainClient = sdkPackage.clients.find((c) => c.name === "TestServiceClient");
  ok(mainClient);
  ok(mainClient.children);
  const operationGroup = mainClient.children[0];
  ok(operationGroup);
  strictEqual(operationGroup.parent, mainClient);

  strictEqual(mainClient.methods.length, 0);
  strictEqual(mainClient.children?.length, 1);
  strictEqual(mainClient.clientInitialization.parameters.length, 1);
  strictEqual(mainClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(mainClient.crossLanguageDefinitionId, "TestService");

  strictEqual(operationGroup.clientInitialization.parameters.length, 1);
  strictEqual(operationGroup.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(operationGroup.methods.length, 1);
  strictEqual(operationGroup.methods[0].name, "func");
  strictEqual(
    operationGroup.methods[0].crossLanguageDefinitionId,
    "TestService.MyOperationGroup.func",
  );
  strictEqual(operationGroup.crossLanguageDefinitionId, "TestService.MyOperationGroup");
});

it("operationGroup2", async () => {
  await runner.compileWithBuiltInService(`
    namespace Foo {
      interface Bar {
        @route("/one")
        one(): void;
      }
    }
    interface Bar {
      @route("/two")
      two(): void;
    }
  `);
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);

  const mainClient = sdkPackage.clients[0];
  strictEqual(mainClient.children?.length, 2);
  const fooClient = mainClient.children.find((m) => m.name === "Foo");
  strictEqual(fooClient?.children?.length, 1);
  const fooBarClient = fooClient.children.find((m) => m.name === "Bar");
  const barClient = mainClient.children.find((m) => m.name === "Bar");
  ok(fooBarClient && barClient);
  strictEqual(fooClient.parent, mainClient);
  strictEqual(fooBarClient.parent, fooClient);
  strictEqual(barClient.parent, mainClient);

  strictEqual(mainClient.methods.length, 0);
  strictEqual(mainClient.children?.length, 2);
  ok(mainClient.clientInitialization);
  strictEqual(mainClient.clientInitialization.parameters.length, 1);
  strictEqual(mainClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(mainClient.crossLanguageDefinitionId, "TestService");

  strictEqual(fooClient.clientInitialization.parameters.length, 1);
  strictEqual(fooClient.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(fooClient.methods.length, 0);
  strictEqual(fooClient.children?.length, 1);
  strictEqual(fooClient.crossLanguageDefinitionId, "TestService.Foo");

  strictEqual(fooBarClient.clientInitialization.parameters.length, 1);
  strictEqual(fooBarClient.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(fooBarClient.crossLanguageDefinitionId, "TestService.Foo.Bar");
  strictEqual(fooBarClient.methods.length, 1);
  strictEqual(fooBarClient.methods[0].kind, "basic");
  strictEqual(fooBarClient.methods[0].name, "one");
  strictEqual(fooBarClient.methods[0].crossLanguageDefinitionId, "TestService.Foo.Bar.one");

  strictEqual(barClient.clientInitialization.parameters.length, 1);
  strictEqual(barClient.clientInitialization.initializedBy, InitializedByFlags.Default);
  strictEqual(barClient.crossLanguageDefinitionId, "TestService.Bar");
  strictEqual(barClient.methods.length, 1);
  strictEqual(barClient.methods[0].kind, "basic");
  strictEqual(barClient.methods[0].name, "two");
  strictEqual(barClient.methods[0].crossLanguageDefinitionId, "TestService.Bar.two");
});

it("optional params propagated", async () => {
  await runner.compileWithCustomization(
    `
    @service(#{
      title: "Test optional client param is propagated",
    })
    namespace ClientOptionalParams;
      model ExpandParameter {
        @query("$expand")
        $expand?: string;
      }

      namespace WithExpand {
        @route("/with")
        op test(@query("$expand")$expand?: string): void;
      }

      namespace WithoutExpand {
        @route("/without")
        op test(): void;
      }`,
    `
  @@clientInitialization(ClientOptionalParams,
    {
      parameters: ClientOptionalParams.ExpandParameter,
    },
  );
`,
  );
});

it("one client from multiple services", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const aVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsA");
  ok(aVersionsEnum);
  const bVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsB");
  ok(bVersionsEnum);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // For root client of multiple services, the `apiVersions` will be empty.
  strictEqual(client.apiVersions.length, 0);
  strictEqual(client.children!.length, 2);
  strictEqual(client.clientInitialization.parameters.length, 2);
  ok(client.clientInitialization.parameters.find((p) => p.name === "endpoint"));
  const apiVersionParam = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );
  ok(apiVersionParam);
  strictEqual(apiVersionParam.apiVersions.length, 0);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);
  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);

  // AI client should have api versions from ServiceA
  strictEqual(aiClient.apiVersions.length, 2);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);
  strictEqual(aiClient.clientInitialization.parameters.length, 2);
  strictEqual(aiClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(aiClient.clientInitialization.parameters[1].name, "apiVersion");
  const aiApiVersionParam = aiClient.clientInitialization.parameters[1];
  strictEqual(aiApiVersionParam.isApiVersionParam, true);
  strictEqual(aiApiVersionParam.onClient, true);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av2");

  // AI client should have aTest method with VersionsA api version
  strictEqual(aiClient.methods.length, 1);
  const aiMethod = aiClient.methods[0];
  strictEqual(aiMethod.name, "aTest");
  strictEqual(aiMethod.parameters.length, 0);
  const aiOperation = aiMethod.operation;
  strictEqual(aiOperation.parameters.length, 1);
  const aiOperationApiVersionParam = aiOperation.parameters.find((p) => p.isApiVersionParam);
  ok(aiOperationApiVersionParam);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams[0], aiApiVersionParam);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);

  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  strictEqual(biClient.clientInitialization.parameters.length, 2);
  strictEqual(biClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(biClient.clientInitialization.parameters[1].name, "apiVersion");
  const biApiVersionParam = biClient.clientInitialization.parameters[1];
  strictEqual(biApiVersionParam.isApiVersionParam, true);
  strictEqual(biApiVersionParam.onClient, true);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv2");

  // BI client should have bTest method with VersionsB api version
  const biMethod = biClient.methods[0];
  strictEqual(biMethod.name, "bTest");
  strictEqual(biMethod.parameters.length, 0);
  const biOperation = biMethod.operation;
  strictEqual(biOperation.parameters.length, 1);
  const biOperationApiVersionParam = biOperation.parameters.find((p) => p.isApiVersionParam);
  ok(biOperationApiVersionParam);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams[0], biApiVersionParam);
});

it("one client from multiple services with no versioning", async () => {
  await runner.compileWithCustomization(
    `
    @service
    namespace ServiceA {
      interface AI {
        @route("/aTest")
        aTest(): void;
      }
    }
    @service
    namespace ServiceB {
      interface BI {
        @route("/bTest")
        bTest(): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    namespace CombineClient;
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // For root client of multiple services, the `apiVersions` will be empty.
  strictEqual(client.apiVersions.length, 0);
  strictEqual(client.children!.length, 2);
  strictEqual(client.clientInitialization.parameters.length, 1);
  ok(client.clientInitialization.parameters.find((p) => p.name === "endpoint"));

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);

  // AI client should have no api versions
  strictEqual(aiClient.apiVersions.length, 0);
  strictEqual(aiClient.clientInitialization.parameters.length, 1);
  strictEqual(aiClient.clientInitialization.parameters[0].name, "endpoint");

  // AI client should have aTest method with no api version
  const aiMethod = aiClient.methods[0];
  strictEqual(aiMethod.name, "aTest");
  strictEqual(aiMethod.parameters.length, 0);
  const aiOperation = aiMethod.operation;
  strictEqual(aiOperation.parameters.length, 0);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);

  // BI client should have no api versions
  strictEqual(biClient.apiVersions.length, 0);
  strictEqual(biClient.clientInitialization.parameters.length, 1);
  strictEqual(biClient.clientInitialization.parameters[0].name, "endpoint");

  // BI client should have bTest method with no api version
  const biMethod = biClient.methods[0];
  strictEqual(biMethod.name, "bTest");
  strictEqual(biMethod.parameters.length, 0);
  const biOperation = biMethod.operation;
  strictEqual(biOperation.parameters.length, 0);
});

it("one client from multiple services without version dependency", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    namespace CombineClient;
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const aVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsA");
  ok(aVersionsEnum);
  const bVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsB");
  ok(bVersionsEnum);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // For root client of multiple services, the `apiVersions` will be empty.
  strictEqual(client.apiVersions.length, 0);
  strictEqual(client.children!.length, 2);
  strictEqual(client.clientInitialization.parameters.length, 2);
  ok(client.clientInitialization.parameters.find((p) => p.name === "endpoint"));
  const apiVersionParam = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );
  ok(apiVersionParam);
  strictEqual(apiVersionParam.apiVersions.length, 0);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);

  // AI client should have api versions from ServiceA
  strictEqual(aiClient.apiVersions.length, 2);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);
  strictEqual(aiClient.clientInitialization.parameters.length, 2);
  strictEqual(aiClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(aiClient.clientInitialization.parameters[1].name, "apiVersion");
  const aiApiVersionParam = aiClient.clientInitialization.parameters[1];
  strictEqual(aiApiVersionParam.isApiVersionParam, true);
  strictEqual(aiApiVersionParam.onClient, true);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av2");

  // AI client should have aTest method with VersionsA api version
  strictEqual(aiClient.methods.length, 1);
  const aiMethod = aiClient.methods[0];
  strictEqual(aiMethod.name, "aTest");
  strictEqual(aiMethod.parameters.length, 0);
  const aiOperation = aiMethod.operation;
  strictEqual(aiOperation.parameters.length, 1);
  const aiOperationApiVersionParam = aiOperation.parameters.find((p) => p.isApiVersionParam);
  ok(aiOperationApiVersionParam);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams[0], aiApiVersionParam);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);

  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  strictEqual(biClient.clientInitialization.parameters.length, 2);
  strictEqual(biClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(biClient.clientInitialization.parameters[1].name, "apiVersion");
  const biApiVersionParam = biClient.clientInitialization.parameters[1];
  strictEqual(biApiVersionParam.isApiVersionParam, true);
  strictEqual(biApiVersionParam.onClient, true);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv2");

  // BI client should have bTest method with VersionsB api version
  const biMethod = biClient.methods[0];
  strictEqual(biMethod.name, "bTest");
  strictEqual(biMethod.parameters.length, 0);
  const biOperation = biMethod.operation;
  strictEqual(biOperation.parameters.length, 1);
  const biOperationApiVersionParam = biOperation.parameters.find((p) => p.isApiVersionParam);
  ok(biOperationApiVersionParam);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams[0], biApiVersionParam);
});

it("one client from multiple services with `@clientLocation`", async () => {
  await runner.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }

      interface AI2 {
        @route("/aTest2")
        aTest2(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace CombineClient;

    @@clientLocation(ServiceA.AI2.aTest2, ServiceA.AI);
    @@clientLocation(ServiceB.BI.bTest, "BI2");
  `,
  );
  const sdkPackage = runner.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const aVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsA");
  ok(aVersionsEnum);
  const bVersionsEnum = sdkPackage.enums.find((e) => e.name === "VersionsB");
  ok(bVersionsEnum);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // For root client of multiple services, the `apiVersions` will be empty.
  strictEqual(client.apiVersions.length, 0);
  strictEqual(client.children!.length, 2);
  strictEqual(client.clientInitialization.parameters.length, 2);
  ok(client.clientInitialization.parameters.find((p) => p.name === "endpoint"));
  const apiVersionParam = client.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );
  ok(apiVersionParam);
  strictEqual(apiVersionParam.apiVersions.length, 0);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);

  // AI client should have api versions from ServiceA
  strictEqual(aiClient.apiVersions.length, 2);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);
  strictEqual(aiClient.clientInitialization.parameters.length, 2);
  strictEqual(aiClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(aiClient.clientInitialization.parameters[1].name, "apiVersion");
  const aiApiVersionParam = aiClient.clientInitialization.parameters[1];
  strictEqual(aiApiVersionParam.isApiVersionParam, true);
  strictEqual(aiApiVersionParam.onClient, true);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av2");

  // AI client should have aTest method with VersionsA api version
  strictEqual(aiClient.methods.length, 2);
  const aiMethod = aiClient.methods[0];
  strictEqual(aiMethod.name, "aTest");
  strictEqual(aiMethod.parameters.length, 0);
  const aiOperation = aiMethod.operation;
  strictEqual(aiOperation.parameters.length, 1);
  const aiOperationApiVersionParam = aiOperation.parameters.find((p) => p.isApiVersionParam);
  ok(aiOperationApiVersionParam);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(aiOperationApiVersionParam.correspondingMethodParams[0], aiApiVersionParam);

  // AI client should have aTest2 method with VersionsA api version
  const aiMethod2 = aiClient.methods[1];
  strictEqual(aiMethod2.name, "aTest2");
  strictEqual(aiMethod2.parameters.length, 0);
  const aiOperation2 = aiMethod2.operation;
  strictEqual(aiOperation2.parameters.length, 1);
  const aiOperation2ApiVersionParam = aiOperation2.parameters.find((p) => p.isApiVersionParam);
  ok(aiOperation2ApiVersionParam);
  strictEqual(aiOperation2ApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(aiOperation2ApiVersionParam.correspondingMethodParams[0], aiApiVersionParam);

  const biClient = client.children!.find((c) => c.name === "BI2");
  ok(biClient);

  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  strictEqual(biClient.clientInitialization.parameters.length, 2);
  strictEqual(biClient.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(biClient.clientInitialization.parameters[1].name, "apiVersion");
  const biApiVersionParam = biClient.clientInitialization.parameters[1];
  strictEqual(biApiVersionParam.isApiVersionParam, true);
  strictEqual(biApiVersionParam.onClient, true);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv2");

  // BI client should have bTest method with VersionsB api version
  const biMethod = biClient.methods[0];
  strictEqual(biMethod.name, "bTest");
  strictEqual(biMethod.parameters.length, 0);
  const biOperation = biMethod.operation;
  strictEqual(biOperation.parameters.length, 1);
  const biOperationApiVersionParam = biOperation.parameters.find((p) => p.isApiVersionParam);
  ok(biOperationApiVersionParam);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams.length, 1);
  strictEqual(biOperationApiVersionParam.correspondingMethodParams[0], biApiVersionParam);
});

it("one client from multiple services with api-version set to latest", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "latest",
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
        av3,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av3, ServiceB.VersionsB.bv2)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.apiVersions.length, 0);
  strictEqual(client.children!.length, 2);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  strictEqual(aiClient.apiVersions.length, 3);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2", "av3"]);
  const aiApiVersionParam = aiClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(aiApiVersionParam);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av3");

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  const biApiVersionParam = biClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(biApiVersionParam);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv2");
});

it("one client from multiple services with api-version set to specific version bv1", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "bv1",
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
        av3,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
        bv3,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;

        @route("/bTest2")
        @added(VersionsB.bv2)
        bTest2(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av3, ServiceB.VersionsB.bv1)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.apiVersions.length, 0);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  // ServiceA doesn't have bv1, so api-version="bv1" doesn't filter it
  // It falls back to useDependency which specifies av3
  strictEqual(aiClient.apiVersions.length, 0);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  // With api-version bv1, we should see only bv1 version
  strictEqual(biClient.apiVersions.length, 1);
  deepStrictEqual(biClient.apiVersions, ["bv1"]);
  const biApiVersionParam = biClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(biApiVersionParam);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv1");

  // bTest2 should not be included since it was added in bv2
  strictEqual(biClient.methods.length, 1);
  strictEqual(biClient.methods[0].name, "bTest");
});

it("one client from multiple services with api-version set to all", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "all",
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
        av3,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;

        @route("/aTest2")
        @added(VersionsA.av2)
        @removed(VersionsA.av3)
        aTest2(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;

        @route("/bTest2")
        @added(VersionsB.bv2)
        bTest2(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av3, ServiceB.VersionsB.bv2)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.apiVersions.length, 0);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  strictEqual(aiClient.apiVersions.length, 3);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2", "av3"]);
  const aiApiVersionParam = aiClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(aiApiVersionParam);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av3");

  // With api-version all, both aTest and aTest2 should be included
  strictEqual(aiClient.methods.length, 2);
  const aTest = aiClient.methods.find((m) => m.name === "aTest");
  ok(aTest);
  deepStrictEqual(aTest.apiVersions, ["av1", "av2", "av3"]);
  const aTest2 = aiClient.methods.find((m) => m.name === "aTest2");
  ok(aTest2);
  deepStrictEqual(aTest2.apiVersions, ["av2"]);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  const biApiVersionParam = biClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(biApiVersionParam);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv2");

  // Both bTest and bTest2 should be included
  strictEqual(biClient.methods.length, 2);
  const bTest = biClient.methods.find((m) => m.name === "bTest");
  ok(bTest);
  deepStrictEqual(bTest.apiVersions, ["bv1", "bv2"]);
  const bTest2 = biClient.methods.find((m) => m.name === "bTest2");
  ok(bTest2);
  deepStrictEqual(bTest2.apiVersions, ["bv2"]);
});

it("one client from multiple services with different useDependency versions", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
        av3,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
        bv3,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av1, ServiceB.VersionsB.bv3)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  strictEqual(client.apiVersions.length, 0);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  // useDependency specifies av1, so only av1 should be included
  strictEqual(aiClient.apiVersions.length, 1);
  deepStrictEqual(aiClient.apiVersions, ["av1"]);
  const aiApiVersionParam = aiClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(aiApiVersionParam);
  strictEqual(aiApiVersionParam.clientDefaultValue, "av1");

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  // useDependency specifies bv3, so all versions up to bv3 should be included
  strictEqual(biClient.apiVersions.length, 3);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2", "bv3"]);
  const biApiVersionParam = biClient.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(biApiVersionParam);
  strictEqual(biApiVersionParam.clientDefaultValue, "bv3");
});

it("one client from multiple services with models shared across services", async () => {
  const runnerWithVersion = await createSdkTestRunner({
    "api-version": "latest",
    emitterName: "@azure-tools/typespec-python",
  });
  await runnerWithVersion.compileWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }

      model SharedModel {
        name: string;
        @added(VersionsA.av2)
        description?: string;
      }

      interface AI {
        @route("/aTest")
        aTest(@body body: SharedModel, @query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }

      model SharedModel {
        id: int32;
        @added(VersionsB.bv2)
        value?: string;
      }

      interface BI {
        @route("/bTest")
        bTest(@body body: SharedModel, @query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace CombineClient;
  `,
  );
  const sdkPackage = runnerWithVersion.context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");

  // Both SharedModel types should exist - one from each service
  const models = sdkPackage.models;
  strictEqual(models.length, 2);

  const sharedModelA = models.find((m) => m.namespace === "ServiceA");
  ok(sharedModelA);
  strictEqual(sharedModelA.name, "SharedModel");
  strictEqual(sharedModelA.properties.length, 2);
  const nameProperty = sharedModelA.properties.find((p) => p.name === "name");
  ok(nameProperty);
  const descriptionProperty = sharedModelA.properties.find((p) => p.name === "description");
  ok(descriptionProperty);

  const sharedModelB = models.find((m) => m.namespace === "ServiceB");
  ok(sharedModelB);
  strictEqual(sharedModelB.name, "SharedModel");
  strictEqual(sharedModelB.properties.length, 2);
  const idProperty = sharedModelB.properties.find((p) => p.name === "id");
  ok(idProperty);
  const valueProperty = sharedModelB.properties.find((p) => p.name === "value");
  ok(valueProperty);

  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  strictEqual(aiClient.apiVersions.length, 2);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  strictEqual(biClient.apiVersions.length, 2);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
});

it("error: multiple explicit clients with multiple services", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface AI {
        @route("/aTest")
        aTest(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface BI {
        @route("/bTest")
        bTest(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
    `
    @client(
      {
        name: "ClientA",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace ClientA {}

    @client(
      {
        name: "ClientB",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace ClientB {}
  `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/multiple-explicit-clients-multiple-services",
      message: "Can not define multiple explicit clients with multiple services.",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/multiple-explicit-clients-multiple-services",
      message: "Can not define multiple explicit clients with multiple services.",
    },
  ]);
});

it("error: client location to new operation group with multiple services", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
    `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      @route("/aTest")
      op aTest(@query("api-version") apiVersion: VersionsA): void;
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      @route("/bTest")
      op bTest(@query("api-version") apiVersion: VersionsB): void;
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace CombineClient {}

    // Try to move operations from different services to a new operation group that doesn't exist
    @@clientLocation(ServiceA.aTest, "NewOperationGroup");
    @@clientLocation(ServiceB.bTest, "NewOperationGroup");
  `,
  );
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/client-location-new-operation-group-multi-service",
    message:
      "Cannot move operations from different services to a new operation group that doesn't exist.",
  });
});

it("error: inconsistent-multiple-service server", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
    `
    @service
    @server("https://servicea.example.com")
    namespace ServiceA {
    }
    @service
    @server("https://serviceb.example.com")
    namespace ServiceB {
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    namespace CombineClient {}
  `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service",
      message: "All services must have the same server and auth definitions.",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/multiple-services",
      message:
        "Multiple services found. Only the first service will be used; others will be ignored.",
    },
  ]);
});

it("error: inconsistent-multiple-service-servers auth", async () => {
  const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
    `
    @service
    @useAuth(BasicAuth)
    namespace ServiceA {
    }
    @service
    @useAuth(BearerAuth)
    namespace ServiceB {
    }`,
    `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
      }
    )
    namespace CombineClient {}
  `,
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service",
      message: "All services must have the same server and auth definitions.",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/multiple-services",
      message:
        "Multiple services found. Only the first service will be used; others will be ignored.",
    },
  ]);
});
