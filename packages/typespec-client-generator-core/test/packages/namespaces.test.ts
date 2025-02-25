import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkEmitterOptions } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkContextTestHelper, createSdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: namespaces", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("no namespace flag", () => {
    it("two sub-clients", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service
        namespace Foo {
          @route("/bar")
          namespace Bar {
            model BarResponse {
              prop: string;
            }
            op get(): BarResponse;
          }
  
          @route("/baz")
          namespace Baz {
            model BazResponse {
              prop: string;
            }
            op get(): BazResponse;
          }
        }
      `);

      const sdkPackage = runner.context.sdkPackage;
      const fooNamespace = sdkPackage.namespaces.find((x) => x.name === "Foo");
      ok(fooNamespace);
      strictEqual(fooNamespace.fullName, "Foo");
      strictEqual(fooNamespace.clients.length, 1);
      strictEqual(fooNamespace.models.length, 0);
      strictEqual(fooNamespace.enums.length, 0);
      strictEqual(fooNamespace.unions.length, 0);
      strictEqual(fooNamespace.namespaces.length, 2);

      const barNamespace = fooNamespace.namespaces.find((x) => x.name === "Bar");
      ok(barNamespace);
      strictEqual(barNamespace.fullName, "Foo.Bar");
      strictEqual(barNamespace.clients.length, 1);
      strictEqual(barNamespace.models.length, 1);
      strictEqual(barNamespace.enums.length, 0);
      strictEqual(barNamespace.unions.length, 0);
      strictEqual(barNamespace.namespaces.length, 0);

      const bazNamespace = fooNamespace.namespaces.find((x) => x.name === "Baz");
      ok(bazNamespace);
      strictEqual(bazNamespace.fullName, "Foo.Baz");
      strictEqual(bazNamespace.clients.length, 1);
      strictEqual(bazNamespace.models.length, 1);
      strictEqual(bazNamespace.enums.length, 0);
      strictEqual(bazNamespace.unions.length, 0);
      strictEqual(bazNamespace.namespaces.length, 0);
    });

    it("separate defined clients and operation groups", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service({})
        namespace Service {
          model BarResponse {
            prop: string;
          }
  
          @route("/bar")
          op getBar(): BarResponse;
  
          model BazResponse {
            prop: string;
          }
  
          @route("/baz")
          op getBaz(): BazResponse;
        }
        
        @client({
          name: "FooClient",
          service: Service,
        })
        namespace Foo {
          @operationGroup
          namespace Bar {
            op get is Service.getBar;
          }
  
          @operationGroup
          namespace Baz {
            op get is Service.getBaz;
          }
        }
      `);

      const sdkPackage = runner.context.sdkPackage;

      const serviceNamespace = sdkPackage.namespaces.find((x) => x.name === "Service");
      ok(serviceNamespace);
      strictEqual(serviceNamespace.fullName, "Service");
      strictEqual(serviceNamespace.clients.length, 0);
      strictEqual(serviceNamespace.models.length, 2);
      strictEqual(serviceNamespace.enums.length, 0);
      strictEqual(serviceNamespace.unions.length, 0);

      const fooNamespace = sdkPackage.namespaces.find((x) => x.name === "Foo");
      ok(fooNamespace);
      strictEqual(fooNamespace.fullName, "Foo");
      strictEqual(fooNamespace.clients.length, 1);
      strictEqual(fooNamespace.models.length, 0);
      strictEqual(fooNamespace.enums.length, 0);
      strictEqual(fooNamespace.unions.length, 0);
      strictEqual(fooNamespace.namespaces.length, 2);

      const barNamespace = fooNamespace.namespaces.find((x) => x.name === "Bar");
      ok(barNamespace);
      strictEqual(barNamespace.fullName, "Foo.Bar");
      strictEqual(barNamespace.clients.length, 1);
      strictEqual(barNamespace.models.length, 0);
      strictEqual(barNamespace.enums.length, 0);
      strictEqual(barNamespace.unions.length, 0);
      strictEqual(barNamespace.namespaces.length, 0);

      const bazNamespace = fooNamespace.namespaces.find((x) => x.name === "Baz");
      ok(bazNamespace);
      strictEqual(bazNamespace.fullName, "Foo.Baz");
      strictEqual(bazNamespace.clients.length, 1);
      strictEqual(bazNamespace.models.length, 0);
      strictEqual(bazNamespace.enums.length, 0);
      strictEqual(bazNamespace.unions.length, 0);
      strictEqual(bazNamespace.namespaces.length, 0);
    });

    it("complicated namespaces", async () => {
      await runner.compile(`
        @service({})
        @route("/a")
        namespace A {
          interface AG {
          }
          namespace AA {
            interface AAG {
            }
            namespace AAA{};
            namespace AAB{
              interface AABGroup1 {
              }
              interface AABGroup2 {
              }
            }
          }
        }
      `);

      const sdkPackage = runner.context.sdkPackage;
      const aNamespace = sdkPackage.namespaces.find((x) => x.name === "A");
      ok(aNamespace);
      strictEqual(aNamespace.fullName, "A");
      strictEqual(aNamespace.clients.length, 2); // A and AG
      strictEqual(aNamespace.models.length, 0);
      strictEqual(aNamespace.enums.length, 0);
      strictEqual(aNamespace.unions.length, 0);
      strictEqual(aNamespace.namespaces.length, 1); // AA

      const aaNamespace = aNamespace.namespaces.find((x) => x.name === "AA");
      ok(aaNamespace);
      strictEqual(aaNamespace.fullName, "A.AA");
      strictEqual(aaNamespace.clients.length, 2); // AA and AAG
      strictEqual(aaNamespace.models.length, 0);
      strictEqual(aaNamespace.enums.length, 0);
      strictEqual(aaNamespace.unions.length, 0);
      strictEqual(aaNamespace.namespaces.length, 2); // AAA and AAB

      const aaaNamespace = aaNamespace.namespaces.find((x) => x.name === "AAA");
      ok(aaaNamespace);
      strictEqual(aaaNamespace.fullName, "A.AA.AAA");
      strictEqual(aaaNamespace.clients.length, 1); // AAA
      strictEqual(aaaNamespace.models.length, 0);
      strictEqual(aaaNamespace.enums.length, 0);
      strictEqual(aaaNamespace.unions.length, 0);
      strictEqual(aaaNamespace.namespaces.length, 0);

      const aabNamespace = aaNamespace.namespaces.find((x) => x.name === "AAB");
      ok(aabNamespace);
      strictEqual(aabNamespace.fullName, "A.AA.AAB");
      strictEqual(aabNamespace.clients.length, 3); // AAB, AABGroup1 and AABGroup2
      strictEqual(aabNamespace.models.length, 0);
      strictEqual(aabNamespace.enums.length, 0);
      strictEqual(aabNamespace.unions.length, 0);
      strictEqual(aabNamespace.namespaces.length, 0);
    });

    it("restructure client hierarchy with renaming of client name and client namespace name", async () => {
      await runner.compileWithCustomization(
        `
        @service({
          title: "Pet Store",
        })
        namespace PetStore;
  
        @route("/feed")
        op feed(): void;
  
        @route("/op2")
        op pet(): void;
      `,
        `
        namespace PetStoreRenamed; // this namespace will be the namespace of the clients and operation groups defined in this customization file
  
        @client({
          name: "FoodClient",
          service: PetStore
        })
        interface Client1 {
          feed is PetStore.feed
        }
  
        @client({
          name: "PetActionClient",
          service: PetStore
        })
        @clientNamespace("PetStoreRenamed.SubNamespace") // use @clientNamespace to specify the namespace of the client
        interface Client2 {
          pet is PetStore.pet
        }
      `,
      );
      const sdkPackage = runner.context.sdkPackage;
      const foodClient = sdkPackage.clients.find((x) => x.name === "FoodClient");
      ok(foodClient);
      strictEqual(foodClient.clientNamespace, "PetStoreRenamed");
      const petActionClient = sdkPackage.clients.find((x) => x.name === "PetActionClient");
      ok(petActionClient);
      strictEqual(petActionClient.clientNamespace, "PetStoreRenamed.SubNamespace");
    });

    it("restructure client with namespace flag", async () => {
      await runner.compile(
        `
        @service({
          title: "Pet Store",
        })
        namespace PetStore;
  
        @route("/feed")
        op feed(): void;
  
        @route("/op2")
        op pet(): void;
      `,
      );
      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "PetStoreRenamed",
        })
      ).sdkPackage;
      const foodClient = sdkPackage.clients.find((x) => x.name === "PetStoreClient");
      ok(foodClient);
      strictEqual(foodClient.clientNamespace, "PetStoreRenamed");
    });
  });

  describe("namespace config flag", () => {
    it("replace single-segment namespace with multi-segment namespace", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service
        namespace Foo {
          op get(): string;
        }
      `);

      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "Azure.Foo",
        })
      ).sdkPackage;

      const fooNamespace = sdkPackage.namespaces.find((x) => x.name === "Foo");
      ok(!fooNamespace);
      strictEqual(sdkPackage.namespaces.length, 1);
      const azureNamespace = sdkPackage.namespaces[0];
      strictEqual(azureNamespace.fullName, "Azure");
      strictEqual(azureNamespace.clients.length, 0);
      strictEqual(azureNamespace.namespaces.length, 1);
      const fooAzureNamespace = azureNamespace.namespaces[0];
      strictEqual(fooAzureNamespace.fullName, "Azure.Foo");
      strictEqual(fooAzureNamespace.name, "Foo");
      strictEqual(fooAzureNamespace.clients.length, 1);
      strictEqual(fooAzureNamespace.clients[0].name, "FooClient");
    });
    it("two sub-clients with namespace flag", async () => {
      await runner.compile(`
        @server("http://localhost:3000", "endpoint")
        @service({})
        namespace Foo {
          @route("/bar")
          namespace Bar {
            model BarResponse {
              prop: string;
            }
            op get(): BarResponse;
          }
  
          @route("/baz")
          namespace Baz {
            model BazResponse {
              prop: string;
            }
            op get(): BazResponse;
          }
        }
      `);
      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "FooRenamed",
        })
      ).sdkPackage;
      const fooNamespace = sdkPackage.namespaces.find((x) => x.name === "Foo");
      ok(!fooNamespace);

      const fooRenamedNamespace = sdkPackage.namespaces.find((x) => x.name === "FooRenamed");
      ok(fooRenamedNamespace);
      strictEqual(fooRenamedNamespace.fullName, "FooRenamed");
      strictEqual(fooRenamedNamespace.clients.length, 3);
      const fooClient = fooRenamedNamespace.clients.find((x) => x.name === "FooClient");
      ok(fooClient);
      strictEqual(fooClient.clientNamespace, "FooRenamed");
      const barClient = fooRenamedNamespace.clients.find((x) => x.name === "Bar");
      ok(barClient);
      strictEqual(barClient.clientNamespace, "FooRenamed");
      const bazClient = fooRenamedNamespace.clients.find((x) => x.name === "Baz");
      ok(bazClient);
      strictEqual(bazClient.clientNamespace, "FooRenamed");
      strictEqual(fooRenamedNamespace.models.length, 2);
      strictEqual(fooRenamedNamespace.enums.length, 0);
      strictEqual(fooRenamedNamespace.unions.length, 0);
      strictEqual(fooRenamedNamespace.namespaces.length, 0);
    });
    it("restructure client with namespace flag", async () => {
      await runner.compile(
        `
        @service({
          title: "Pet Store",
        })
        namespace PetStore;
  
        @route("/feed")
        op feed(): void;
  
        @route("/op2")
        op pet(): void;
      `,
      );
      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "PetStoreRenamed",
        })
      ).sdkPackage;
      const foodClient = sdkPackage.clients.find((x) => x.name === "PetStoreClient");
      ok(foodClient);
      strictEqual(foodClient.clientNamespace, "PetStoreRenamed");
    });
    it("use namespace config flag with an azure spec", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithBuiltInAzureCoreService(`
      op get(): string;
    `);

      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runnerWithCore.context.program, {
          namespace: "Azure.My.Service",
        })
      ).sdkPackage;

      const myNamespace = sdkPackage.namespaces.find((x) => x.name === "My");
      ok(!myNamespace);
      strictEqual(sdkPackage.namespaces.length, 1);
      const azureNamespace = sdkPackage.namespaces[0];
      strictEqual(azureNamespace.fullName, "Azure");
      strictEqual(azureNamespace.clients.length, 0);
      strictEqual(azureNamespace.namespaces.length, 1);
      const myAzureNamespace = azureNamespace.namespaces[0];
      strictEqual(myAzureNamespace.fullName, "Azure.My");
      strictEqual(myAzureNamespace.name, "My");
      strictEqual(myAzureNamespace.clients.length, 0);
      strictEqual(myAzureNamespace.namespaces.length, 1);
      const myServiceAzureNamespace = myAzureNamespace.namespaces[0];
      strictEqual(myServiceAzureNamespace.fullName, "Azure.My.Service");
      strictEqual(myServiceAzureNamespace.name, "Service");
      strictEqual(myServiceAzureNamespace.clients[0].name, "ServiceClient");
    });
    it("restructure client hierarchy with namespace flag, renaming of client name, and client namespace name", async () => {
      await runner.compileWithCustomization(
        `
      @service({
        title: "Pet Store",
      })
      namespace PetStore;

      @route("/feed")
      op feed(): void;

      @route("/op2")
      op pet(): void;
    `,
        `
      namespace PetStoreRenamed;

      @client({
        name: "FoodClient",
        service: PetStore
      })
      interface Client1 {
        feed is PetStore.feed
      }

      @client({
        name: "PetActionClient",
        service: PetStore
      })
      @clientNamespace("PetStoreRenamed.SubNamespace") // use @clientNamespace to specify the namespace of the client
      interface Client2 {
        pet is PetStore.pet
      }
    `,
      );
      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "PetStoreFlagRenamed",
        })
      ).sdkPackage;
      const foodClient = sdkPackage.clients.find((x) => x.name === "FoodClient");
      ok(foodClient);
      strictEqual(foodClient.clientNamespace, "PetStoreFlagRenamed");
      const petActionClient = sdkPackage.clients.find((x) => x.name === "PetActionClient");
      ok(petActionClient);
      strictEqual(petActionClient.clientNamespace, "PetStoreFlagRenamed");

      strictEqual(sdkPackage.namespaces.length, 1);
      const petStoreFlagRenamedNamespace = sdkPackage.namespaces[0];
      strictEqual(petStoreFlagRenamedNamespace.fullName, "PetStoreFlagRenamed");
      strictEqual(petStoreFlagRenamedNamespace.clients.length, 2);
      ok(petStoreFlagRenamedNamespace.clients.find((x) => x.name === "FoodClient"));
      ok(petStoreFlagRenamedNamespace.clients.find((x) => x.name === "PetActionClient"));
      strictEqual(petStoreFlagRenamedNamespace.namespaces.length, 0);
    });

    it("complicated nested namespaces", async () => {
      await runner.compile(`
      @service
      @route("/a")
      namespace A {
        interface AG {
        }
        namespace AA {
          interface AAG {
          }
          namespace AAA{};
          namespace AAB{
            interface AABGroup1 {
            }
            interface AABGroup2 {
            }
          }
        }
      }
    `);

      const sdkPackage = (
        await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
          namespace: "Azure.A",
        })
      ).sdkPackage;
      strictEqual(sdkPackage.namespaces.length, 1);
      const azureNamespace = sdkPackage.namespaces.find((x) => x.name === "Azure");
      ok(azureNamespace);
      strictEqual(azureNamespace.namespaces.length, 1);
      const aNamespace = azureNamespace.namespaces.find((x) => x.name === "A");
      ok(aNamespace);
      strictEqual(aNamespace.fullName, "Azure.A");
      strictEqual(aNamespace.clients.length, 8); // all clients get flattened into Azure.A
      strictEqual(aNamespace.models.length, 0);
      strictEqual(aNamespace.enums.length, 0);
      strictEqual(aNamespace.unions.length, 0);
      strictEqual(aNamespace.namespaces.length, 0);
    });
  });

  it("customization with models from original namespace", async () => {
    await runner.compileWithCustomization(
      `
      @service({})
      namespace Original {
        model MyModel {
          prop: string;
        }
      }
    `,
      `
      @client({service: Original, name: "MyClient"})
      namespace Customization {
        op foo(): void;
      }
      @@usage(Original.MyModel, Usage.input | Usage.output);
    `,
    );

    const sdkPackage = (
      await createSdkContextTestHelper<SdkEmitterOptions>(runner.context.program, {
        namespace: "Renamed",
      })
    ).sdkPackage;
    strictEqual(sdkPackage.namespaces.length, 1);
    const ns = sdkPackage.namespaces[0];
    strictEqual(ns.fullName, "Renamed");
    strictEqual(ns.clients.length, 1);
    strictEqual(ns.clients[0].name, "MyClient");
    strictEqual(ns.models.length, 1);
    strictEqual(ns.models[0].name, "MyModel");
    strictEqual(ns.enums.length, 0);
    strictEqual(ns.namespaces.length, 0);
  });
});
