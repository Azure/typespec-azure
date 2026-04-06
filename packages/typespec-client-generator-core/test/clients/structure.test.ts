import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { listClients, listSubClients } from "../../src/decorators.js";
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

it("arm client with sub clients", async () => {
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

          @client
          @clientInitialization(LargeFaceListClientOptions)
          interface LargeFaceList {
            get is Face.FaceListOperations.getLargeFaceList;
          }

          @client
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

it("customizeCode could not be combined with other values", async () => {
  const [, diagnostics] = await SimpleTesterWithService.compileAndDiagnose(
    `
    @route("/bump")
    @clientInitialization({initializedBy: InitializedBy.customizeCode | InitializedBy.parent})
    interface SubClient {
        op test(): void;
    }
    `,
  );
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/invalid-initialized-by",
    message:
      "Invalid 'initializedBy' value. `InitializedBy.customizeCode` cannot be combined with other values.",
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
    @client({service: Foo})
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
        autoMergeService: true,
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
            autoMergeService: true,
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
            autoMergeService: true,
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
        autoMergeService: true,
      }
    )
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
        autoMergeService: true,
      }
    )
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
        autoMergeService: true,
      }
    )
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

it("client location to new sub client with multiple services", async () => {
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
        autoMergeService: true,
      }
    )
    namespace CombineClient {}

    // Move operations from different services to a new sub client
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
  // For multi-service sub clients, the api version param type should be string
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

it("one client from multiple services with sub clients name conflict - merged", async () => {
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
        autoMergeService: true,
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
  // Should have only 1 merged sub client instead of 2 separate ones
  strictEqual(client.children!.length, 1);

  // The merged sub client should have operations from both services
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service sub client should have empty apiVersions
  strictEqual(operations.apiVersions.length, 0);
  strictEqual(operations.clientInitialization.parameters.length, 2);
  strictEqual(operations.clientInitialization.parameters[0].name, "endpoint");
  strictEqual(operations.clientInitialization.parameters[1].name, "apiVersion");
  const apiVersionParam = operations.clientInitialization.parameters[1];
  strictEqual(apiVersionParam.isApiVersionParam, true);
  strictEqual(apiVersionParam.onClient, true);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);
  // For multi-service sub clients, the api version param type should be string
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

it("client location to existing sub client from different service", async () => {
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
        autoMergeService: true,
      }
    )
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

  // Should have only 1 sub client
  strictEqual(client.children!.length, 1);

  // The sub client should now be multi-service (merged)
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service sub client should have empty apiVersions
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

it("merged sub clients with nested operations", async () => {
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
        autoMergeService: true,
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

  // Should have only 1 merged sub client
  strictEqual(client.children!.length, 1);

  // The merged sub client should have operations from both namespaces
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  // Multi-service sub client should have empty apiVersions
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

it("multiple merged sub clients in same client", async () => {
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
        autoMergeService: true,
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

  // Should have 2 merged sub clients
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

it("merged sub clients with @clientLocation targeting merged type should not lose operations", async () => {
  // Verifies that @clientLocation targeting a type that was merged away
  // correctly routes operations to the surviving sub-client, not an orphaned cache entry.
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      interface Operations {
        @route("/aTest")
        aTest(): void;
      }
    }
    @service
    namespace ServiceB {
      interface Operations {
        @route("/bTest")
        bTest(): void;
      }
      @route("/extra")
      op extraOp(): void;
    }`,
      `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
        autoMergeService: true,
      }
    )
    namespace CombineClient;

    // Move extraOp to the "Operations" sub-client (which got merged)
    @@clientLocation(ServiceB.extraOp, ServiceA.Operations);
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];

  // The merged Operations sub-client should contain all 3 operations
  strictEqual(client.children!.length, 1);
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);
  strictEqual(operations.methods.length, 3);
  ok(operations.methods.find((m) => m.name === "aTest"));
  ok(operations.methods.find((m) => m.name === "bTest"));
  ok(operations.methods.find((m) => m.name === "extraOp"));
});

it("@clientLocation targeting merged-away sub client type should resolve to surviving sub client", async () => {
  // Verifies the scenario from issue: @clientLocation targets an interface
  // in ServiceB that gets merged away into the surviving sub-client from ServiceA.
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      interface SubGroup {
        @route("/a")
        a(): void;
      }
    }
    @service
    namespace ServiceB {
      interface SubGroup {
        @route("/b")
        b(): void;
      }
      @route("/c")
      op c(): void;
    }`,
      `
    @client(
      {
        service: [ServiceA, ServiceB],
        autoMergeService: true,
      }
    )
    namespace Combined;

    @@clientLocation(ServiceB.c, ServiceB.SubGroup);
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.clients.length, 1);
  const client = sdkPackage.clients[0];
  strictEqual(client.name, "Combined");

  // Should have only 1 sub client (merged SubGroup)
  strictEqual(client.children!.length, 1);
  const subGroup = client.children!.find((c) => c.name === "SubGroup");
  ok(subGroup);
  // The merged SubGroup should contain all 3 operations: a, b, and c
  strictEqual(subGroup.methods.length, 3);
  ok(subGroup.methods.find((m) => m.name === "a"));
  ok(subGroup.methods.find((m) => m.name === "b"));
  ok(subGroup.methods.find((m) => m.name === "c"));
});

it("merged sub clients have correct parent pointers for moved children", async () => {
  // Verifies that when sub-clients are merged, the children of the
  // merged-away sub-client get re-parented to the surviving sub-client.
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      namespace Operations {
        @route("/aTest")
        op aTest(): void;

        namespace SubOps {
          @route("/aSubTest")
          op aSubTest(): void;
        }
      }
    }
    @service
    namespace ServiceB {
      namespace Operations {
        @route("/bTest")
        op bTest(): void;

        namespace SubOps {
          @route("/bSubTest")
          op bSubTest(): void;
        }
      }
    }`,
      `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
        autoMergeService: true,
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

  // Operations should be merged
  strictEqual(client.children!.length, 1);
  const operations = client.children!.find((c) => c.name === "Operations");
  ok(operations);

  // SubOps should be recursively merged too (Issue 3)
  strictEqual(operations.children!.length, 1);
  const subOps = operations.children!.find((c) => c.name === "SubOps");
  ok(subOps);
  strictEqual(subOps.methods.length, 2);
  ok(subOps.methods.find((m) => m.name === "aSubTest"));
  ok(subOps.methods.find((m) => m.name === "bSubTest"));

  // Verify parent chain is correct (Issue 2)
  strictEqual(subOps.parent, operations);
  strictEqual(operations.parent, client);
});

it("recursive merge of same-named grandchildren across services", async () => {
  // Verifies that when both services have same-named sub-clients
  // with same-named grandchildren, the grandchildren are recursively merged
  // instead of producing duplicates.
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      namespace Level1 {
        @route("/aOp")
        op aOp(): void;

        namespace Level2 {
          @route("/aDeepOp")
          op aDeepOp(): void;
        }
      }
    }
    @service
    namespace ServiceB {
      namespace Level1 {
        @route("/bOp")
        op bOp(): void;

        namespace Level2 {
          @route("/bDeepOp")
          op bDeepOp(): void;
        }
      }
    }`,
      `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
        autoMergeService: true,
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

  // Level1 should be merged (not duplicated)
  strictEqual(client.children!.length, 1);
  const level1 = client.children!.find((c) => c.name === "Level1");
  ok(level1);
  strictEqual(level1.methods.length, 2);
  ok(level1.methods.find((m) => m.name === "aOp"));
  ok(level1.methods.find((m) => m.name === "bOp"));

  // Level2 should also be merged (not duplicated)
  strictEqual(level1.children!.length, 1);
  const level2 = level1.children!.find((c) => c.name === "Level2");
  ok(level2);
  strictEqual(level2.methods.length, 2);
  ok(level2.methods.find((m) => m.name === "aDeepOp"));
  ok(level2.methods.find((m) => m.name === "bDeepOp"));

  // Verify parent chain
  strictEqual(level2.parent, level1);
  strictEqual(level1.parent, client);
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
            autoMergeService: true,
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
            autoMergeService: true,
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

it("multiple services without explicit @client creates separate root clients", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }

      interface Operations {
        @route("/aTest")
        opA(): void;
      }

      namespace SubNamespace {
        @route("/aSubTest")
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
        @route("/bTest")
        opB(): void;
      }

      namespace SubNamespace {
        @route("/bSubTest")
        op subOpB(): void;
      }
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Should create 2 separate root clients
  strictEqual(sdkPackage.clients.length, 2);

  // ServiceA client
  const clientA = sdkPackage.clients.find((c) => c.name === "ServiceAClient");
  ok(clientA);
  deepStrictEqual(clientA.apiVersions, ["av1", "av2"]);
  strictEqual(clientA.children!.length, 2);

  const opsA = clientA.children!.find((c) => c.name === "Operations");
  ok(opsA);
  strictEqual(opsA.methods.length, 1);
  strictEqual(opsA.methods[0].name, "opA");

  const subA = clientA.children!.find((c) => c.name === "SubNamespace");
  ok(subA);
  strictEqual(subA.methods.length, 1);
  strictEqual(subA.methods[0].name, "subOpA");

  // ServiceB client
  const clientB = sdkPackage.clients.find((c) => c.name === "ServiceBClient");
  ok(clientB);
  deepStrictEqual(clientB.apiVersions, ["bv1", "bv2"]);
  strictEqual(clientB.children!.length, 2);

  const opsB = clientB.children!.find((c) => c.name === "Operations");
  ok(opsB);
  strictEqual(opsB.methods.length, 1);
  strictEqual(opsB.methods[0].name, "opB");

  const subB = clientB.children!.find((c) => c.name === "SubNamespace");
  ok(subB);
  strictEqual(subB.methods.length, 1);
  strictEqual(subB.methods[0].name, "subOpB");
});

it("multiple unversioned services without explicit @client", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace ServiceA {
      @route("/a")
      op opA(): void;
    }

    @service
    namespace ServiceB {
      @route("/b")
      op opB(): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 2);

  const clientA = sdkPackage.clients.find((c) => c.name === "ServiceAClient");
  ok(clientA);
  strictEqual(clientA.methods.length, 1);
  strictEqual(clientA.methods[0].name, "opA");
  strictEqual(clientA.apiVersions.length, 0);

  const clientB = sdkPackage.clients.find((c) => c.name === "ServiceBClient");
  ok(clientB);
  strictEqual(clientB.methods.length, 1);
  strictEqual(clientB.methods[0].name, "opB");
  strictEqual(clientB.apiVersions.length, 0);
});

it("explicit client names for multiple services", async () => {
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
        @route("/aTest")
        opA(): void;
      }

      namespace SubNamespace {
        @route("/aSubTest")
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
        @route("/bTest")
        opB(): void;
      }

      namespace SubNamespace {
        @route("/bSubTest")
        op subOpB(): void;
      }
    }`,
      `
    @client({
      name: "MyServiceAClient",
      service: ServiceA,
      autoMergeService: true,
    })
    namespace MyServiceAClient {}

    @client({
      name: "MyServiceBClient",
      service: ServiceB,
      autoMergeService: true,
    })
    namespace MyServiceBClient {}
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 2);

  // ServiceA client with custom name
  const clientA = sdkPackage.clients.find((c) => c.name === "MyServiceAClient");
  ok(clientA);
  deepStrictEqual(clientA.apiVersions, ["av1", "av2"]);
  strictEqual(clientA.children!.length, 2);

  const opsA = clientA.children!.find((c) => c.name === "Operations");
  ok(opsA);
  strictEqual(opsA.methods.length, 1);
  strictEqual(opsA.methods[0].name, "opA");

  const subA = clientA.children!.find((c) => c.name === "SubNamespace");
  ok(subA);
  strictEqual(subA.methods.length, 1);
  strictEqual(subA.methods[0].name, "subOpA");

  // ServiceB client with custom name
  const clientB = sdkPackage.clients.find((c) => c.name === "MyServiceBClient");
  ok(clientB);
  deepStrictEqual(clientB.apiVersions, ["bv1", "bv2"]);
  strictEqual(clientB.children!.length, 2);

  const opsB = clientB.children!.find((c) => c.name === "Operations");
  ok(opsB);
  strictEqual(opsB.methods.length, 1);
  strictEqual(opsB.methods[0].name, "opB");

  const subB = clientB.children!.find((c) => c.name === "SubNamespace");
  ok(subB);
  strictEqual(subB.methods.length, 1);
  strictEqual(subB.methods[0].name, "subOpB");
});

it("mixing multi-service and single-service clients", async () => {
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
        @route("/aTest")
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
        @route("/bTest")
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
        @route("/cTest")
        opC(@query("api-version") apiVersion: VersionsC): void;
      }
    }`,
      `
    // Multi-service client combining ServiceA and ServiceB
    @client({
      name: "CombinedABClient",
      service: [ServiceA, ServiceB],
      autoMergeService: true,
    })
    namespace CombinedABClient {}

    // Single-service client for ServiceC
    @client({
      name: "ServiceCClient",
      service: ServiceC,
      autoMergeService: true,
    })
    namespace ServiceCClient {}
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 2);

  // Combined multi-service client
  const combinedClient = sdkPackage.clients.find((c) => c.name === "CombinedABClient");
  ok(combinedClient);
  strictEqual(combinedClient.apiVersions.length, 0); // empty for multi-service
  // Operations from both services merged (same name "Operations")
  ok(combinedClient.children);
  const mergedOps = combinedClient.children!.find((c) => c.name === "Operations");
  ok(mergedOps);
  strictEqual(mergedOps.apiVersions.length, 0); // empty for merged sub-client
  strictEqual(mergedOps.methods.length, 2);
  const opA = mergedOps.methods.find((m) => m.name === "opA");
  ok(opA);
  const opAVersionParam = opA.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opAVersionParam);
  deepStrictEqual(opAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(opAVersionParam.clientDefaultValue, "av2");
  const opB = mergedOps.methods.find((m) => m.name === "opB");
  ok(opB);
  const opBVersionParam = opB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opBVersionParam);
  deepStrictEqual(opBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(opBVersionParam.clientDefaultValue, "bv2");

  // Verify multi-service root client has string-type api version param
  const rootApiVersionParam = combinedClient.clientInitialization.parameters.find(
    (p) => p.name === "apiVersion",
  );
  ok(rootApiVersionParam);
  strictEqual(rootApiVersionParam.type.kind, "string");
  strictEqual(rootApiVersionParam.optional, true);

  // Single-service client for ServiceC
  const serviceCClient = sdkPackage.clients.find((c) => c.name === "ServiceCClient");
  ok(serviceCClient);
  deepStrictEqual(serviceCClient.apiVersions, ["cv1", "cv2"]);
  ok(serviceCClient.children);
  const cOps = serviceCClient.children!.find((c) => c.name === "Operations");
  ok(cOps);
  strictEqual(cOps.methods.length, 1);
  const opC = cOps.methods.find((m) => m.name === "opC");
  ok(opC);
  deepStrictEqual(opC.apiVersions, ["cv1", "cv2"]);
  const opCVersionParam = opC.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opCVersionParam);
  deepStrictEqual(opCVersionParam.apiVersions, ["cv1", "cv2"]);
  strictEqual(opCVersionParam.clientDefaultValue, "cv2");
});

it("services as direct children with nested @client", async () => {
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
        @route("/aTest")
        opA(@query("api-version") apiVersion: VersionsA): void;
      }
      namespace SubNamespace {
        @route("/aSubTest")
        op subOpA(@query("api-version") apiVersion: VersionsA): void;
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
        @route("/bTest")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }
      namespace SubNamespace {
        @route("/bSubTest")
        op subOpB(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
      `
    @client({
      name: "CombineClient",
      service: [ServiceA, ServiceB],
    })
    namespace CombineClient {
      @client({
        name: "ComputeClient",
        service: ServiceA,
        autoMergeService: true,
      })
      namespace Compute {}

      @client({
        name: "DiskClient",
        service: ServiceB,
        autoMergeService: true,
      })
      namespace Disk {}
    }
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 1);
  const root = sdkPackage.clients[0];
  strictEqual(root.name, "CombineClient");
  strictEqual(root.apiVersions.length, 0); // empty for multi-service

  // Root has 2 children: ComputeClient and DiskClient
  ok(root.children);
  strictEqual(root.children!.length, 2);

  // ComputeClient - from ServiceA
  const compute = root.children!.find((c) => c.name === "ComputeClient");
  ok(compute);
  deepStrictEqual(compute.apiVersions, ["av1", "av2"]);
  ok(compute.children);
  strictEqual(compute.children!.length, 2);

  const computeOps = compute.children!.find((c) => c.name === "Operations");
  ok(computeOps);
  strictEqual(computeOps.methods.length, 1);
  const computeOpA = computeOps.methods.find((m) => m.name === "opA");
  ok(computeOpA);
  deepStrictEqual(computeOpA.apiVersions, ["av1", "av2"]);
  const computeOpAVersionParam = computeOpA.operation.parameters.find((p) => p.isApiVersionParam);
  ok(computeOpAVersionParam);
  deepStrictEqual(computeOpAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(computeOpAVersionParam.clientDefaultValue, "av2");

  const computeSub = compute.children!.find((c) => c.name === "SubNamespace");
  ok(computeSub);
  strictEqual(computeSub.methods.length, 1);
  const computeSubOpA = computeSub.methods.find((m) => m.name === "subOpA");
  ok(computeSubOpA);
  deepStrictEqual(computeSubOpA.apiVersions, ["av1", "av2"]);
  const computeSubOpAVersionParam = computeSubOpA.operation.parameters.find(
    (p) => p.isApiVersionParam,
  );
  ok(computeSubOpAVersionParam);
  deepStrictEqual(computeSubOpAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(computeSubOpAVersionParam.clientDefaultValue, "av2");

  // DiskClient - from ServiceB
  const disk = root.children!.find((c) => c.name === "DiskClient");
  ok(disk);
  deepStrictEqual(disk.apiVersions, ["bv1", "bv2"]);
  ok(disk.children);
  strictEqual(disk.children!.length, 2);

  const diskOps = disk.children!.find((c) => c.name === "Operations");
  ok(diskOps);
  strictEqual(diskOps.methods.length, 1);
  const diskOpB = diskOps.methods.find((m) => m.name === "opB");
  ok(diskOpB);
  deepStrictEqual(diskOpB.apiVersions, ["bv1", "bv2"]);
  const diskOpBVersionParam = diskOpB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(diskOpBVersionParam);
  deepStrictEqual(diskOpBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(diskOpBVersionParam.clientDefaultValue, "bv2");

  const diskSub = disk.children!.find((c) => c.name === "SubNamespace");
  ok(diskSub);
  strictEqual(diskSub.methods.length, 1);
  const diskSubOpB = diskSub.methods.find((m) => m.name === "subOpB");
  ok(diskSubOpB);
  deepStrictEqual(diskSubOpB.apiVersions, ["bv1", "bv2"]);
  const diskSubOpBVersionParam = diskSubOpB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(diskSubOpBVersionParam);
  deepStrictEqual(diskSubOpBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(diskSubOpBVersionParam.clientDefaultValue, "bv2");
});

it("fully customized client hierarchy with interfaces", async () => {
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
        @route("/aTest")
        op opA(@query("api-version") apiVersion: VersionsA): void;
      }
      namespace SubNamespace {
        @route("/aSubTest")
        op subOpA(@query("api-version") apiVersion: VersionsA): void;
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
        @route("/bTest")
        op opB(@query("api-version") apiVersion: VersionsB): void;
      }
      namespace SubNamespace {
        @route("/bSubTest")
        op subOpB(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
      `
    @client({
      name: "CustomClient",
      service: [ServiceA, ServiceB],
    })
    namespace CustomClient {
      // Custom child client with operations from ServiceA only
      @client({
        name: "ServiceAOnly",
        service: ServiceA,
      })
      interface ServiceAOnly {
        opA is ServiceA.Operations.opA;
        subOpA is ServiceA.SubNamespace.subOpA;
      }

      // Custom child client with operations from ServiceB only
      @client({
        name: "ServiceBOnly",
        service: ServiceB,
      })
      interface ServiceBOnly {
        opB is ServiceB.Operations.opB;
        subOpB is ServiceB.SubNamespace.subOpB;
      }
    }
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 1);
  const root = sdkPackage.clients[0];
  strictEqual(root.name, "CustomClient");
  strictEqual(root.apiVersions.length, 0); // empty for multi-service

  ok(root.children);
  strictEqual(root.children!.length, 2);

  // ServiceAOnly - from ServiceA only
  const aOnly = root.children!.find((c) => c.name === "ServiceAOnly");
  ok(aOnly);
  deepStrictEqual(aOnly.apiVersions, ["av1", "av2"]);
  strictEqual(aOnly.methods.length, 2);
  const opA = aOnly.methods.find((m) => m.name === "opA");
  ok(opA);
  deepStrictEqual(opA.apiVersions, ["av1", "av2"]);
  const opAVersionParam = opA.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opAVersionParam);
  deepStrictEqual(opAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(opAVersionParam.clientDefaultValue, "av2");
  const subOpA = aOnly.methods.find((m) => m.name === "subOpA");
  ok(subOpA);
  deepStrictEqual(subOpA.apiVersions, ["av1", "av2"]);
  const subOpAVersionParam = subOpA.operation.parameters.find((p) => p.isApiVersionParam);
  ok(subOpAVersionParam);
  deepStrictEqual(subOpAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(subOpAVersionParam.clientDefaultValue, "av2");

  // ServiceBOnly - from ServiceB only
  const bOnly = root.children!.find((c) => c.name === "ServiceBOnly");
  ok(bOnly);
  deepStrictEqual(bOnly.apiVersions, ["bv1", "bv2"]);
  strictEqual(bOnly.methods.length, 2);
  const opB = bOnly.methods.find((m) => m.name === "opB");
  ok(opB);
  deepStrictEqual(opB.apiVersions, ["bv1", "bv2"]);
  const opBVersionParam = opB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opBVersionParam);
  deepStrictEqual(opBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(opBVersionParam.clientDefaultValue, "bv2");
  const subOpB = bOnly.methods.find((m) => m.name === "subOpB");
  ok(subOpB);
  deepStrictEqual(subOpB.apiVersions, ["bv1", "bv2"]);
  const subOpBVersionParam = subOpB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(subOpBVersionParam);
  deepStrictEqual(subOpBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(subOpBVersionParam.clientDefaultValue, "bv2");
});

it("validation: root client missing service", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      @route("/test")
      op test(): void;
    }`,
      `
    @client({
      name: "NoServiceClient",
    })
    namespace NoServiceClient {}
  `,
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(program.diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/root-client-missing-service",
    },
  ]);
});

it("validation: scoped @client with unscoped @operationGroup should not report root-client-missing-service", async () => {
  // When @client has a scope and @operationGroup has no scope, the operationGroup
  // should not trigger root-client-missing-service for scopes where @client doesn't apply.
  const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
      `
    @service
    namespace TestService {
      @route("/test")
      op test(): void;
    }`,
      `
    @client({name: "TestClient", service: TestService}, "python")
    namespace Customizations {
      @operationGroup
      interface MyGroup {
      }
    }
  `,
    ),
  );
  expectDiagnosticEmpty(diagnostics);

  // For python: @client matches, @operationGroup resolves → 1 root + 1 sub
  {
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const tcgcDiags = program.diagnostics.filter(
      (d) => d.code === "@azure-tools/typespec-client-generator-core/root-client-missing-service",
    );
    strictEqual(tcgcDiags.length, 0);
    const clients = listClients(context);
    strictEqual(clients.length, 1);
    strictEqual(listSubClients(context, clients[0]).length, 1);
  }
});

it("validation: multiple scoped @client with scoped @operationGroup should not report root-client-missing-service", async () => {
  // For scopes where @client doesn't match, orphaned @operationGroup sub-clients
  // should be silently excluded when an ancestor has @client data.
  const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
      `
    @service
    namespace TestService {
      @route("/test")
      op test(): void;
    }`,
      `
    @client({name: "TestClient", service: TestService}, "python")
    @client({name: "TestClient", service: TestService}, "java")
    namespace Customizations {
      @operationGroup("python")
      interface MyGroup {
      }
    }
  `,
    ),
  );
  expectDiagnosticEmpty(diagnostics);

  // For python: should have 1 root client with 1 sub client
  {
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const clients = listClients(context);
    strictEqual(clients.length, 1);
    strictEqual(listSubClients(context, clients[0]).length, 1);
  }
});

it("validation: nested client service not subset of parent", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      @route("/aTest")
      op opA(): void;
    }
    @service
    namespace ServiceB {
      @route("/bTest")
      op opB(): void;
    }
    @service
    namespace ServiceC {
      @route("/cTest")
      op opC(): void;
    }`,
      `
    @client({
      name: "ParentClient",
      service: [ServiceA, ServiceB],
    })
    namespace ParentClient {
      @client({
        name: "ChildClient",
        service: ServiceC,
      })
      namespace Child {}
    }
  `,
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(program.diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/nested-client-service-not-subset",
    },
  ]);
});

it("validation: auto-merge service conflict with nested client specifying services", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      @route("/aTest")
      op opA(): void;
    }
    @service
    namespace ServiceB {
      @route("/bTest")
      op opB(): void;
    }`,
      `
    @client({
      name: "ParentClient",
      service: [ServiceA, ServiceB],
      autoMergeService: true,
    })
    namespace ParentClient {
      @client({
        name: "ChildClient",
        service: ServiceA,
      })
      namespace Child {}
    }
  `,
    ),
  );
  await createSdkContextForTester(program);
  expectDiagnostics(program.diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/auto-merge-service-conflict",
    },
  ]);
});

it("validation: invalid-client-service-multiple on interface", async () => {
  const [, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
    createClientCustomizationInput(
      `
    @service
    namespace ServiceA {
      @route("/aTest")
      op opA(): void;
    }
    @service
    namespace ServiceB {
      @route("/bTest")
      op opB(): void;
    }`,
      `
    @client({
      name: "MultiInterface",
      service: [ServiceA, ServiceB],
    })
    interface MultiInterface {}
  `,
    ),
  );
  expectDiagnostics(diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-service-multiple",
    },
  ]);
});

it("interaction: @clientInitialization with multi-service client", async () => {
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
        @route("/aTest")
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
        @route("/bTest")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
      `
    @client(
      {
        name: "CombineClient",
        service: [ServiceA, ServiceB],
        autoMergeService: true,
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

  // Check that initialization has endpoint and apiVersion params
  const initParams = client.clientInitialization.parameters;
  ok(initParams.find((p) => p.name === "endpoint"));
  const apiVersionParam = initParams.find((p) => p.name === "apiVersion");
  ok(apiVersionParam);
  strictEqual(apiVersionParam.type.kind, "string");
  strictEqual(apiVersionParam.optional, true);
  strictEqual(apiVersionParam.clientDefaultValue, undefined);

  // Check operation-level api version params
  ok(client.children);
  const ops = client.children!.find((c) => c.name === "Operations");
  ok(ops);
  const opAMethod = ops.methods.find((m) => m.name === "opA");
  ok(opAMethod);
  const opAVersionParam = opAMethod.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opAVersionParam);
  deepStrictEqual(opAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(opAVersionParam.clientDefaultValue, "av2");
  const opBMethod = ops.methods.find((m) => m.name === "opB");
  ok(opBMethod);
  const opBVersionParam = opBMethod.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opBVersionParam);
  deepStrictEqual(opBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(opBVersionParam.clientDefaultValue, "bv2");
});

it("package metadata for multiple separate root clients", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @versioned(VersionsA)
    namespace ServiceA {
      enum VersionsA {
        av1,
        av2,
      }
      @route("/a")
      op opA(@query("api-version") apiVersion: VersionsA): void;
    }

    @service
    @versioned(VersionsB)
    namespace ServiceB {
      enum VersionsB {
        bv1,
        bv2,
      }
      @route("/b")
      op opB(@query("api-version") apiVersion: VersionsB): void;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Package metadata should have undefined apiVersion for multi-service
  strictEqual(sdkPackage.metadata.apiVersion, undefined);

  // apiVersions map should have entries for both services
  ok(sdkPackage.metadata.apiVersions);
  strictEqual(sdkPackage.metadata.apiVersions.size, 2);
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceA"), "av2");
  strictEqual(sdkPackage.metadata.apiVersions.get("ServiceB"), "bv2");
});

it("multiple services with same-named sub-namespaces stay independent", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace ServiceA {
      interface Operations {
        @route("/aOp")
        opA(): void;
      }
    }

    @service
    namespace ServiceB {
      interface Operations {
        @route("/bOp")
        opB(): void;
      }
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  // Should create 2 separate root clients (not merged)
  strictEqual(sdkPackage.clients.length, 2);

  const clientA = sdkPackage.clients.find((c) => c.name === "ServiceAClient");
  ok(clientA);
  ok(clientA.children);
  strictEqual(clientA.children!.length, 1);
  strictEqual(clientA.children![0].name, "Operations");
  strictEqual(clientA.children![0].methods.length, 1);
  strictEqual(clientA.children![0].methods[0].name, "opA");

  const clientB = sdkPackage.clients.find((c) => c.name === "ServiceBClient");
  ok(clientB);
  ok(clientB.children);
  strictEqual(clientB.children!.length, 1);
  strictEqual(clientB.children![0].name, "Operations");
  strictEqual(clientB.children![0].methods.length, 1);
  strictEqual(clientB.children![0].methods[0].name, "opB");
});

it("nested client inherits parent services when not specified", async () => {
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
        @route("/aTest")
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
        @route("/bTest")
        opB(@query("api-version") apiVersion: VersionsB): void;
      }
    }`,
      `
    @client({
      name: "CombineClient",
      service: [ServiceA, ServiceB],
    })
    namespace CombineClient {
      // Nested client without specifying service - inherits parent's services
      @client({
        name: "InheritedClient",
      })
      interface InheritedClient {
        opA is ServiceA.Operations.opA;
        opB is ServiceB.Operations.opB;
      }
    }
  `,
    ),
  );
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;

  strictEqual(sdkPackage.clients.length, 1);
  const root = sdkPackage.clients[0];
  ok(root.children);
  strictEqual(root.children!.length, 1);
  const inherited = root.children![0];
  strictEqual(inherited.name, "InheritedClient");
  strictEqual(inherited.methods.length, 2);
  const opA = inherited.methods.find((m) => m.name === "opA");
  ok(opA);
  const opAVersionParam = opA.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opAVersionParam);
  deepStrictEqual(opAVersionParam.apiVersions, ["av1", "av2"]);
  strictEqual(opAVersionParam.clientDefaultValue, "av2");
  const opB = inherited.methods.find((m) => m.name === "opB");
  ok(opB);
  const opBVersionParam = opB.operation.parameters.find((p) => p.isApiVersionParam);
  ok(opBVersionParam);
  deepStrictEqual(opBVersionParam.apiVersions, ["bv1", "bv2"]);
  strictEqual(opBVersionParam.clientDefaultValue, "bv2");
});

it("validation: @clientLocation string target with multiple separate root clients", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace ServiceA {
      @route("/aTest")
      op aTest(): void;
    }

    @service
    namespace ServiceB {
      @route("/bTest")
      op bTest(): void;
    }

    @@clientLocation(ServiceA.aTest, "SharedGroup");
  `);
  await createSdkContextForTester(program);
  expectDiagnostics(program.diagnostics, [
    {
      code: "@azure-tools/typespec-client-generator-core/client-location-conflict",
    },
    {
      code: "@azure-tools/typespec-client-generator-core/client-location-wrong-type",
    },
  ]);
});
