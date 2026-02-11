import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { InitializedByFlags } from "../../src/interfaces.js";
import {
  ArmTester,
  AzureCoreTester,
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
  SimpleTesterWithService,
} from "../tester.js";

it("normal client", async () => {
  const { program } = await SimpleTester.compile(
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await ArmTester.compile(`
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

  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTester.compile(
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
        @service
        namespace MyService;

        op download(@path blobName: string): void;
      `,
      `
        namespace MyCustomizations;

        @@clientInitialization(MyService, {initializedBy: InitializedBy.parent});
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-initialized-by",
    message:
      "Invalid 'initializedBy' value. First level client must have `InitializedBy.individually` specified in `initializedBy`.",
  });
});

it("sub client could not only be initialized individually", async () => {
  const { program } = await SimpleTesterWithService.compile(
    `
    @route("/bump")
    @clientInitialization({initializedBy: InitializedBy.individually})
    interface SubClient {
        op test(): void;
    }
    `,
  );
  const context = await createSdkContextForTester(program);
  expectDiagnostics(context.diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-initialized-by",
    message:
      "Invalid 'initializedBy' value. Sub client must have `InitializedBy.parent` or `InitializedBy.individually | InitializedBy.parent` specified in `initializedBy`.",
  });
});

it("single with core", async () => {
  const { program } = await AzureCoreTester.compile(`
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  strictEqual(apiVersionParam.optional, true);
  strictEqual(apiVersionParam.kind, "method");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01-preview");
});

it("multiple with core", async () => {
  const { program } = await AzureCoreTester.compile(`
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  strictEqual(apiVersionParam.optional, true);
  strictEqual(apiVersionParam.kind, "method");
  strictEqual(apiVersionParam.clientDefaultValue, "2022-12-01");
});

it("namespace", async () => {
  const { program } = await AzureCoreTester.compile(`
    @server("http://localhost:3000", "endpoint")
    @useAuth(ApiKeyAuth<ApiKeyLocation.header, "x-ms-api-key">)
    @service
    namespace My.Service;
    op func(): void;
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const clientOne = sdkPackage.clients.filter((c) => c.name === "ServiceClient")[0];
  strictEqual(clientOne.namespace, "My.Service");
});

it("model-only namespace should be filtered out", async () => {
  const { program } = await AzureCoreTester.compile(`
    @service
    namespace Foo {
      @usage(Usage.input)
      model B {}
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 0);
  strictEqual(sdkPackage.models.length, 1);
});

it("empty namespace with empty subclient", async () => {
  const { program } = await AzureCoreTester.compile(`
    @service
    namespace Foo {
      model B {}
      namespace Bar {
        model A {}
      }
      interface Baz {}
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 0);
});

it("explicit clients with only models should not be filtered out", async () => {
  const { program } = await AzureCoreTester.compile(`
    @client
    @service
    namespace Foo {
      model B {}
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
});

it("operationGroup", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @operationGroup
    namespace MyOperationGroup {
      op func(): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleTesterWithService.compile(`
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
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  await createSdkContextForTester(program);
});

it("one client from multiple services", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  // For multi-service clients, the api version param type should be string
  strictEqual(apiVersionParam.type.kind, "string");
  // For multi-service clients, the API version parameter should always be optional
  strictEqual(apiVersionParam.optional, true);
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  // For multi-service clients, the api version param type should be string
  strictEqual(apiVersionParam.type.kind, "string");
  // For multi-service clients, the API version parameter should always be optional
  strictEqual(apiVersionParam.optional, true);

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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  // For multi-service clients, the api version param type should be string
  strictEqual(apiVersionParam.type.kind, "string");
  // For multi-service clients, the API version parameter should always be optional
  strictEqual(apiVersionParam.optional, true);

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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program, {
    "api-version": "latest",
  });
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program, {
    "api-version": "bv1",
  });
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program, {
    "api-version": "all",
  });
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
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
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program, {
    "api-version": "latest",
  });
  const sdkPackage = context.sdkPackage;
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
  const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
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
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/multiple-explicit-clients-multiple-services",
      message: "Can not define multiple explicit clients with multiple services.",
    },
  ]);
});

it("client location to new operation group with multiple services", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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

    // Move operations from different services to a new operation group
    @@clientLocation(ServiceA.aTest, "NewOperationGroup");
    @@clientLocation(ServiceB.bTest, "NewOperationGroup");
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // Root client of multiple services has empty apiVersions
  strictEqual(client.apiVersions.length, 0);

  // Find the NewOperationGroup sub-client
  const newOpGroup = client.children!.find((c) => c.name === "NewOperationGroup");
  ok(newOpGroup);

  // Sub-client with operations from multiple services should have empty apiVersions
  strictEqual(newOpGroup.apiVersions.length, 0);
  strictEqual(newOpGroup.clientInitialization.parameters.length, 2);
  strictEqual(newOpGroup.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(newOpGroup.clientInitialization.parameters[1].name, "apiVersion");
  const apiVersionParam = newOpGroup.clientInitialization.parameters[1];
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);
  // For multi-service operation groups, the api version param type should be string
  strictEqual(apiVersionParam.type.kind, "string");

  // NewOperationGroup should have both operations
  strictEqual(newOpGroup.methods.length, 2);
  const aTestMethod = newOpGroup.methods.find((m) => m.name === "aTest");
  ok(aTestMethod);
  const bTestMethod = newOpGroup.methods.find((m) => m.name === "bTest");
  ok(bTestMethod);

  // Check operation-level api version parameters have correct clientDefaultValue
  // This is the fix for the bug - previously these were undefined
  strictEqual(aTestMethod.kind, "basic");
  const aOperation = aTestMethod.operation;
  const aOperationApiVersionParam = aOperation.parameters.find((p) => p.isApiVersionParam);
  ok(aOperationApiVersionParam);
  // Operation from ServiceA should have ServiceA's latest api version as default
  strictEqual(aOperationApiVersionParam.clientDefaultValue, "av2");

  strictEqual(bTestMethod.kind, "basic");
  const bOperation = bTestMethod.operation;
  const bOperationApiVersionParam = bOperation.parameters.find((p) => p.isApiVersionParam);
  ok(bOperationApiVersionParam);
  // Operation from ServiceB should have ServiceB's latest api version as default
  strictEqual(bOperationApiVersionParam.clientDefaultValue, "bv2");
});

it("one client from multiple services with operation group name conflict - merged", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      // Interface with same name in both services
      interface Operations {
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
      // Interface with same name in both services
      interface Operations {
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");
  // Should have only 1 merged operation group instead of 2 separate ones
  strictEqual(client.children!.length, 1);

  // The merged operation group should have operations from both services
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service operation group should have empty apiVersions
  strictEqual(operations.apiVersions.length, 0);
  strictEqual(operations.clientInitialization.parameters.length, 2);
  strictEqual(operations.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(operations.clientInitialization.parameters[1].name, "apiVersion");
  const apiVersionParam = operations.clientInitialization.parameters[1];
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);
  // For multi-service operation groups, the api version param type should be string
  strictEqual(apiVersionParam.type.kind, "string");

  // Should have both methods from both services
  strictEqual(operations.methods.length, 2);
  const aTestMethod = operations.methods.find((m) => m.name === "aTest");
  ok(aTestMethod);
  const bTestMethod = operations.methods.find((m) => m.name === "bTest");
  ok(bTestMethod);

  // Check operation-level api version parameters have correct clientDefaultValue
  strictEqual(aTestMethod.kind, "basic");
  const aOperation = aTestMethod.operation;
  const aOperationApiVersionParam = aOperation.parameters.find((p) => p.isApiVersionParam);
  ok(aOperationApiVersionParam);
  // Operation from ServiceA should have ServiceA's latest api version as default
  strictEqual(aOperationApiVersionParam.clientDefaultValue, "av2");

  strictEqual(bTestMethod.kind, "basic");
  const bOperation = bTestMethod.operation;
  const bOperationApiVersionParam = bOperation.parameters.find((p) => p.isApiVersionParam);
  ok(bOperationApiVersionParam);
  // Operation from ServiceB should have ServiceB's latest api version as default
  strictEqual(bOperationApiVersionParam.clientDefaultValue, "bv2");
});

it("client location to existing operation group from different service", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      // Interface that will be the target for @clientLocation
      interface Operations {
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

    // Move operation from ServiceB to existing Operations group from ServiceA
    @@clientLocation(ServiceB.bTest, "Operations");
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");

  // Should have only 1 operation group
  strictEqual(client.children!.length, 1);

  // The operation group should now be multi-service (merged)
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service operation group should have empty apiVersions
  strictEqual(operations.apiVersions.length, 0);
  const apiVersionParam = operations.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(apiVersionParam);
  strictEqual(apiVersionParam.type.kind, "string");

  // Should have both methods from both services
  strictEqual(operations.methods.length, 2);
  const aTestMethod = operations.methods.find((m) => m.name === "aTest");
  ok(aTestMethod);
  const bTestMethod = operations.methods.find((m) => m.name === "bTest");
  ok(bTestMethod);
});

it("merged operation groups with nested operations", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      namespace Operations {
        @route("/aTest1")
        op aTest1(@query("api-version") apiVersion: VersionsA): void;
        @route("/aTest2")
        op aTest2(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      namespace Operations {
        @route("/bTest1")
        op bTest1(@query("api-version") apiVersion: VersionsB): void;
        @route("/bTest2")
        op bTest2(@query("api-version") apiVersion: VersionsB): void;
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");

  // Should have only 1 merged operation group
  strictEqual(client.children!.length, 1);

  // The merged operation group should have operations from both namespaces
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service operation group should have empty apiVersions
  strictEqual(operations.apiVersions.length, 0);
  const apiVersionParam = operations.clientInitialization.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(apiVersionParam);
  strictEqual(apiVersionParam.type.kind, "string");

  // Should have all 4 methods from both services
  strictEqual(operations.methods.length, 4);
  ok(operations.methods.find((m) => m.name === "aTest1"));
  ok(operations.methods.find((m) => m.name === "aTest2"));
  ok(operations.methods.find((m) => m.name === "bTest1"));
  ok(operations.methods.find((m) => m.name === "bTest2"));
});

it("multiple merged operation groups in same client", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface Group1 {
        @route("/a1")
        opA1(@query("api-version") apiVersion: VersionsA): void;
      }
      interface Group2 {
        @route("/a2")
        opA2(@query("api-version") apiVersion: VersionsA): void;
      }
    }
    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface Group1 {
        @route("/b1")
        opB1(@query("api-version") apiVersion: VersionsB): void;
      }
      interface Group2 {
        @route("/b2")
        opB2(@query("api-version") apiVersion: VersionsB): void;
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");

  // Should have 2 merged operation groups
  strictEqual(client.children!.length, 2);

  // Check first merged group
  const group1 = client.children!.find((c) => c.name === "Group1");
  ok(group1);
  strictEqual(group1.apiVersions.length, 0);
  strictEqual(group1.methods.length, 2);
  ok(group1.methods.find((m) => m.name === "opA1"));
  ok(group1.methods.find((m) => m.name === "opB1"));

  // Check second merged group
  const group2 = client.children!.find((c) => c.name === "Group2");
  ok(group2);
  strictEqual(group2.apiVersions.length, 0);
  strictEqual(group2.methods.length, 2);
  ok(group2.methods.find((m) => m.name === "opA2"));
  ok(group2.methods.find((m) => m.name === "opB2"));
});

it("error: inconsistent-multiple-service server", async () => {
  const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
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
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service",
      message: "All services must have the same server and auth definitions.",
    },
  ]);
});

it("error: inconsistent-multiple-service-servers auth", async () => {
  const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
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
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/inconsistent-multiple-service",
      message: "All services must have the same server and auth definitions.",
    },
  ]);
});

it("multiple clients from single service", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
        @service
        @versioned(Versions)
        namespace TestService;

        enum Versions {
          v2022_11_01: "2022-11-01",
          v2023_04_01_preview: "2023-04-01-preview",
        }

        @route("/foo")
        op foo(): void;

        @route("/bar")
        op bar(): void;
      `,
      `
        @client(
          {
            name: "ClientA",
            service: TestService,
          }
        )
        namespace ClientA{
          op foo is TestService.foo;
        }

        @client(
          {
            name: "ClientB",
            service: TestService,
          }
        )
        namespace ClientB{
          op bar is TestService.bar;
        }
      `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 2);
  const clientA = sdkPackage.clients.find((c) => c.name === "ClientA");
  ok(clientA);
  const clientB = sdkPackage.clients.find((c) => c.name === "ClientB");
  ok(clientB);
  const versionsEnum = sdkPackage.enums.find((e) => e.name === "Versions");
  ok(versionsEnum);
  strictEqual(versionsEnum.values.length, 2);
});

// ========================================================================
// Scenario 0: Multiple services without explicit @client
// ========================================================================

it("scenario 0: multiple versioned services without explicit @client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }

      interface Operations {
        @route("/opA")
        opA(@query("api-version") apiVersion: VersionsA): void;
      }

      namespace SubNamespace {
        @route("/subOpA")
        op subOpA(): void;
      }
    }

    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }

      interface Operations {
        @route("/opB")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }

      namespace SubNamespace {
        @route("/subOpB")
        op subOpB(): void;
      }
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Two independent root clients
  strictEqual(sdkPackage.clients.length, 2);

  const clientA = sdkPackage.clients.find((c) => c.name === "ServiceAClient");
  ok(clientA);
  deepStrictEqual(clientA.apiVersions, ["av1", "av2"]);
  deepStrictEqual(clientA.apiVersionsMap, {});
  ok(clientA.children);
  strictEqual(clientA.children.length, 2);

  const opsA = clientA.children.find((c) => c.name === "Operations");
  ok(opsA);
  strictEqual(opsA.methods.length, 1);
  strictEqual(opsA.methods[0].name, "opA");

  const subNsA = clientA.children.find((c) => c.name === "SubNamespace");
  ok(subNsA);
  strictEqual(subNsA.methods.length, 1);
  strictEqual(subNsA.methods[0].name, "subOpA");

  const clientB = sdkPackage.clients.find((c) => c.name === "ServiceBClient");
  ok(clientB);
  deepStrictEqual(clientB.apiVersions, ["bv1", "bv2"]);
  deepStrictEqual(clientB.apiVersionsMap, {});
  ok(clientB.children);
  strictEqual(clientB.children.length, 2);

  const opsB = clientB.children.find((c) => c.name === "Operations");
  ok(opsB);
  strictEqual(opsB.methods.length, 1);
  strictEqual(opsB.methods[0].name, "opB");

  const subNsB = clientB.children.find((c) => c.name === "SubNamespace");
  ok(subNsB);
  strictEqual(subNsB.methods.length, 1);
  strictEqual(subNsB.methods[0].name, "subOpB");
});

it("scenario 0: multiple unversioned services without explicit @client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace ServiceA {
      @route("/opA")
      op opA(): void;
    }

    @service
    namespace ServiceB {
      @route("/opB")
      op opB(): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Two independent root clients
  strictEqual(sdkPackage.clients.length, 2);

  const clientA = sdkPackage.clients.find((c) => c.name === "ServiceAClient");
  ok(clientA);
  strictEqual(clientA.apiVersions.length, 0);
  deepStrictEqual(clientA.apiVersionsMap, {});
  strictEqual(clientA.methods.length, 1);
  strictEqual(clientA.methods[0].name, "opA");

  const clientB = sdkPackage.clients.find((c) => c.name === "ServiceBClient");
  ok(clientB);
  strictEqual(clientB.apiVersions.length, 0);
  deepStrictEqual(clientB.apiVersionsMap, {});
  strictEqual(clientB.methods.length, 1);
  strictEqual(clientB.methods[0].name, "opB");
});

// ========================================================================
// Scenario 1: Explicit client names for multiple services
// ========================================================================

it("scenario 1: explicit client names for multiple services", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface Operations {
        @route("/opA")
        opA(@query("api-version") apiVersion: VersionsA): void;
      }
    }

    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface Operations {
        @route("/opB")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
      `
    @client({
      name: "MyServiceAClient",
      service: ServiceA,
    })
    namespace MyServiceAClient {}

    @client({
      name: "MyServiceBClient",
      service: ServiceB,
    })
    namespace MyServiceBClient {}
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 2);

  const clientA = sdkPackage.clients.find((c) => c.name === "MyServiceAClient");
  ok(clientA);
  deepStrictEqual(clientA.apiVersions, ["av1", "av2"]);
  deepStrictEqual(clientA.apiVersionsMap, {});
  ok(clientA.children);
  const opsA = clientA.children.find((c) => c.name === "Operations");
  ok(opsA);
  strictEqual(opsA.methods.length, 1);
  strictEqual(opsA.methods[0].name, "opA");

  const clientB = sdkPackage.clients.find((c) => c.name === "MyServiceBClient");
  ok(clientB);
  deepStrictEqual(clientB.apiVersions, ["bv1", "bv2"]);
  deepStrictEqual(clientB.apiVersionsMap, {});
  ok(clientB.children);
  const opsB = clientB.children.find((c) => c.name === "Operations");
  ok(opsB);
  strictEqual(opsB.methods.length, 1);
  strictEqual(opsB.methods[0].name, "opB");
});

// ========================================================================
// Scenario 1.5: Mixing multi-service and single-service clients
// ========================================================================

it("scenario 1.5: mixing multi-service and single-service clients", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      interface Operations {
        @route("/opA")
        opA(@query("api-version") apiVersion: VersionsA): void;
      }
    }

    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      interface Operations {
        @route("/opB")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }
    }

    @service
    @versioned(VersionsC)
    namespace ServiceC {
      enum VersionsC {
        cv1,
        cv2,
      }
      interface Operations {
        @route("/opC")
        opC(@query("api-version") apiVersion: VersionsC): void;
      }
    }`,
      `
    @client({
      name: "CombinedABClient",
      service: [ServiceA, ServiceB],
    })
    @useDependency(ServiceA.VersionsA.av2, ServiceB.VersionsB.bv2)
    namespace CombinedABClient {}

    @client({
      name: "ServiceCClient",
      service: ServiceC,
    })
    namespace ServiceCClient {}
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 2);

  // Multi-service client
  const combinedClient = sdkPackage.clients.find((c) => c.name === "CombinedABClient");
  ok(combinedClient);
  strictEqual(combinedClient.apiVersions.length, 0); // Empty for cross-service
  deepStrictEqual(combinedClient.apiVersionsMap, {
    ServiceA: ["av1", "av2"],
    ServiceB: ["bv1", "bv2"],
  });
  ok(combinedClient.children);
  // Merged Operations from ServiceA and ServiceB
  const mergedOps = combinedClient.children.find((c) => c.name === "Operations");
  ok(mergedOps);
  strictEqual(mergedOps.apiVersions.length, 0);
  strictEqual(mergedOps.methods.length, 2);
  ok(mergedOps.methods.find((m) => m.name === "opA"));
  ok(mergedOps.methods.find((m) => m.name === "opB"));

  // Single-service client
  const serviceCClient = sdkPackage.clients.find((c) => c.name === "ServiceCClient");
  ok(serviceCClient);
  deepStrictEqual(serviceCClient.apiVersions, ["cv1", "cv2"]);
  deepStrictEqual(serviceCClient.apiVersionsMap, {});
  ok(serviceCClient.children);
  const opsC = serviceCClient.children.find((c) => c.name === "Operations");
  ok(opsC);
  strictEqual(opsC.methods.length, 1);
  strictEqual(opsC.methods[0].name, "opC");
});

// ========================================================================
// apiVersionsMap tests
// ========================================================================

it("apiVersionsMap populated for multi-service client", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
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
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  const client = sdkPackage.clients[0];
  strictEqual(client.name, "CombineClient");

  // Root client has empty apiVersions but populated apiVersionsMap
  strictEqual(client.apiVersions.length, 0);
  deepStrictEqual(client.apiVersionsMap, {
    ServiceA: ["av1", "av2"],
    ServiceB: ["bv1", "bv2"],
  });

  // Sub-clients have their own apiVersions and empty apiVersionsMap
  const aiClient = client.children!.find((c) => c.name === "AI");
  ok(aiClient);
  deepStrictEqual(aiClient.apiVersions, ["av1", "av2"]);
  deepStrictEqual(aiClient.apiVersionsMap, {});

  const biClient = client.children!.find((c) => c.name === "BI");
  ok(biClient);
  deepStrictEqual(biClient.apiVersions, ["bv1", "bv2"]);
  deepStrictEqual(biClient.apiVersionsMap, {});
});

it("apiVersionsMap empty for single-service client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(Versions)
    namespace TestService {
      enum Versions { v1, v2 }
      @route("/test")
      op test(@query("api-version") apiVersion: Versions): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  deepStrictEqual(client.apiVersionsMap, {});
  deepStrictEqual(client.apiVersions, ["v1", "v2"]);
});
