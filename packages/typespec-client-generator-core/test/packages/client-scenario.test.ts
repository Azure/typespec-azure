import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { InitializedByFlags } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: client scenario", () => {
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
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
    strictEqual(client.methods.length, 1); // client accessor methods which have already deprecated
    strictEqual(client.children?.length, 1);

    const tests = client.children?.find((c) => c.name === "Tests");
    ok(tests);
    strictEqual(tests.clientInitialization.initializedBy, InitializedByFlags.Parent);
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
    strictEqual(client.methods.length, 2); // client accessor methods which have already deprecated
    strictEqual(client.children?.length, 2);

    const pets = client.children?.find((c) => c.name === "Pets");
    ok(pets);
    strictEqual(pets.clientInitialization.initializedBy, InitializedByFlags.Parent);
    strictEqual(pets.clientInitialization.parameters.length, 1);
    strictEqual(pets.clientInitialization.parameters[0].name, "endpoint");
    strictEqual(pets?.methods.length, 2); // client accessor methods which have already deprecated
    strictEqual(pets?.children?.length, 2);

    const dogs = pets.children?.find((c) => c.name === "Dogs");
    ok(dogs);
    strictEqual(dogs.clientInitialization.initializedBy, InitializedByFlags.Parent);
    strictEqual(dogs.clientInitialization.parameters.length, 1);
    strictEqual(dogs.clientInitialization.parameters[0].name, "endpoint");
    strictEqual(dogs?.methods.length, 2);
    strictEqual(dogs?.methods[0].name, "feed");
    strictEqual(dogs?.methods[1].name, "pet");

    const cats = pets.children?.find((c) => c.name === "Cats");
    ok(cats);
    strictEqual(cats.clientInitialization.initializedBy, InitializedByFlags.Parent);
    strictEqual(cats.clientInitialization.parameters.length, 1);
    strictEqual(cats.clientInitialization.parameters[0].name, "endpoint");
    strictEqual(cats?.methods.length, 2);
    strictEqual(cats?.methods[0].name, "feed");
    strictEqual(cats?.methods[1].name, "pet");

    const actions = client.children?.find((c) => c.name === "Actions");
    ok(actions);
    strictEqual(actions.clientInitialization.initializedBy, InitializedByFlags.Parent);
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
    strictEqual(client.methods.length, 2); // client accessor methods which have already deprecated
    strictEqual(client.children?.length, 2);

    const largeFaceList = client.children?.find((c) => c.name === "LargeFaceList");
    ok(largeFaceList);
    strictEqual(largeFaceList.clientInitialization.initializedBy, InitializedByFlags.Parent);
    strictEqual(largeFaceList.clientInitialization.parameters.length, 2);
    strictEqual(largeFaceList.clientInitialization.parameters[0].name, "endpoint");
    strictEqual(largeFaceList.clientInitialization.parameters[1].name, "largeFaceListId");
    strictEqual(largeFaceList?.methods.length, 1);
    strictEqual(largeFaceList?.methods[0].name, "get");
    strictEqual(largeFaceList?.methods[0].parameters.length, 0);

    const largePersonGroup = client.children?.find((c) => c.name === "LargePersonGroup");
    ok(largePersonGroup);
    strictEqual(largePersonGroup.clientInitialization.initializedBy, InitializedByFlags.Parent);
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
    strictEqual(client.methods.length, 2); // client accessor methods which have already deprecated
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
    strictEqual(client.methods.length, 1); // client accessor methods which have already deprecated
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
});
