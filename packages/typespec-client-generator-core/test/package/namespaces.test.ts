import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  AzureCoreTesterWithService,
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
} from "../tester.js";

describe("no namespace flag", () => {
  it("two sub-clients", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
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
    const { program } = await SimpleTester.compile(`
      @server("http://localhost:3000", "endpoint")
      @service
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

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;

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
    const { program } = await SimpleTester.compile(`
      @service
      namespace A {
        interface AG {
        @route("/a")
          op func1(): void;
        }
        namespace AA {
          interface AAG {
            @route("/aa")
            op func2(): void;
          }
          namespace AAA{
            @route("/aaa")
            op func3(): void;
          };
          namespace AAB{
            interface AABGroup1 {
              @route("/aab1")
              op func4(): void;
            }
            interface AABGroup2 {
              @route("/aab2")
              op func5(): void;
            }
          }
        }
      }
    `);

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
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
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
        @service(#{
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
      ),
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    const foodClient = sdkPackage.clients.find((x) => x.name === "FoodClient");
    ok(foodClient);
    strictEqual(foodClient.namespace, "PetStoreRenamed");
    const petActionClient = sdkPackage.clients.find((x) => x.name === "PetActionClient");
    ok(petActionClient);
    strictEqual(petActionClient.namespace, "PetStoreRenamed.SubNamespace");
  });

  it("restructure client with namespace flag", async () => {
    const { program } = await SimpleTester.compile(
      `
        @service(#{
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
      await createSdkContextForTester(program, {
        namespace: "PetStoreRenamed",
      })
    ).sdkPackage;
    const foodClient = sdkPackage.clients.find((x) => x.name === "PetStoreClient");
    ok(foodClient);
    strictEqual(foodClient.namespace, "PetStoreRenamed");
  });
});

describe("namespace config flag", () => {
  it("replace single-segment namespace with multi-segment namespace", async () => {
    const { program } = await SimpleTester.compile(`
      @server("http://localhost:3000", "endpoint")
      @service
      namespace Foo {
        op get(): string;
      }
    `);
    const context = await createSdkContextForTester(program, {
      namespace: "Azure.Foo",
    });
    const sdkPackage = context.sdkPackage;

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
    const { program } = await SimpleTester.compile(`
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
    const context = await createSdkContextForTester(program, {
      namespace: "FooRenamed",
    });
    const sdkPackage = context.sdkPackage;
    const fooNamespace = sdkPackage.namespaces.find((x) => x.name === "Foo");
    ok(!fooNamespace);

    const fooRenamedNamespace = sdkPackage.namespaces.find((x) => x.name === "FooRenamed");
    ok(fooRenamedNamespace);
    strictEqual(fooRenamedNamespace.fullName, "FooRenamed");
    strictEqual(fooRenamedNamespace.clients.length, 3);
    const fooClient = fooRenamedNamespace.clients.find((x) => x.name === "FooClient");
    ok(fooClient);
    strictEqual(fooClient.namespace, "FooRenamed");
    const barClient = fooRenamedNamespace.clients.find((x) => x.name === "Bar");
    ok(barClient);
    strictEqual(barClient.namespace, "FooRenamed");
    const bazClient = fooRenamedNamespace.clients.find((x) => x.name === "Baz");
    ok(bazClient);
    strictEqual(bazClient.namespace, "FooRenamed");
    strictEqual(fooRenamedNamespace.models.length, 2);
    strictEqual(fooRenamedNamespace.enums.length, 0);
    strictEqual(fooRenamedNamespace.unions.length, 0);
    strictEqual(fooRenamedNamespace.namespaces.length, 0);
  });
  it("restructure client with namespace flag", async () => {
    const { program } = await SimpleTester.compile(
      `
        @service(#{
          title: "Pet Store",
        })
        namespace PetStore;
  
        @route("/feed")
        op feed(): void;
  
        @route("/op2")
        op pet(): void;
      `,
    );
    const context = await createSdkContextForTester(program, {
      namespace: "PetStoreRenamed",
    });
    const sdkPackage = context.sdkPackage;
    const foodClient = sdkPackage.clients.find((x) => x.name === "PetStoreClient");
    ok(foodClient);
    strictEqual(foodClient.namespace, "PetStoreRenamed");
  });
  it("use namespace config flag with an azure spec", async () => {
    const { program } = await AzureCoreTesterWithService.compile(`
      op get(): string;
    `);

    const context = await createSdkContextForTester(program, {
      namespace: "Azure.My.Service",
    });
    const sdkPackage = context.sdkPackage;

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
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
      @service(#{
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
      @clientNamespace("PetStore.SubNamespace") // use @clientNamespace to specify the namespace of the client
      interface Client2 {
        pet is PetStore.pet
      }
    `,
      ),
    );
    const context = await createSdkContextForTester(program, {
      namespace: "PetStoreFlagRenamed",
    });
    const sdkPackage = context.sdkPackage;
    const foodClient = sdkPackage.clients.find((x) => x.name === "FoodClient");
    ok(foodClient);
    strictEqual(foodClient.namespace, "PetStoreFlagRenamed");
    const petActionClient = sdkPackage.clients.find((x) => x.name === "PetActionClient");
    ok(petActionClient);
    strictEqual(petActionClient.namespace, "PetStoreFlagRenamed.SubNamespace");

    strictEqual(sdkPackage.namespaces.length, 1);
    const petStoreFlagRenamedNamespace = sdkPackage.namespaces[0];
    strictEqual(petStoreFlagRenamedNamespace.fullName, "PetStoreFlagRenamed");
    strictEqual(petStoreFlagRenamedNamespace.clients.length, 1);
    ok(petStoreFlagRenamedNamespace.clients.find((x) => x.name === "FoodClient"));
    strictEqual(petStoreFlagRenamedNamespace.namespaces.length, 1);
    const subNamespace = petStoreFlagRenamedNamespace.namespaces[0];
    strictEqual(subNamespace.fullName, "PetStoreFlagRenamed.SubNamespace");
    strictEqual(subNamespace.clients.length, 1);
    ok(subNamespace.clients.find((x) => x.name === "PetActionClient"));
    strictEqual(subNamespace.namespaces.length, 0);
  });

  it("restructure client hierarchy with namespace flag and nested client namespace", async () => {
    const { program } = await SimpleTester.compile(
      `
        @clientNamespace("PetStore.CustomNamespace")
        @service
        namespace PetStore {
          namespace Models {
            model Model1 {}
          }
          namespace Operations {
            interface Client {
              op feed(): void;
            }
          }
        }
      `,
    );
    const context = await createSdkContextForTester(program, {
      namespace: "PetStoreFlagRenamed",
    });
    const sdkPackage = context.sdkPackage;
    strictEqual(sdkPackage.namespaces.length, 1);
    const petStoreFlagRenamedNamespace = sdkPackage.namespaces[0];
    strictEqual(petStoreFlagRenamedNamespace.fullName, "PetStoreFlagRenamed");
    strictEqual(petStoreFlagRenamedNamespace.namespaces.length, 1);
    const customNamespace = petStoreFlagRenamedNamespace.namespaces[0];
    strictEqual(customNamespace.fullName, "PetStoreFlagRenamed.CustomNamespace");
    strictEqual(customNamespace.clients.length, 1);
    const client = customNamespace.clients[0];
    strictEqual(client.namespace, "PetStoreFlagRenamed.CustomNamespace");
  });

  it("complicated nested namespaces", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      namespace A {
        interface AG {
          @route("/a")
          op func1(): void;
        }
        namespace AA {
          interface AAG {
            @route("/aa")
            op func2(): void;
          }
          namespace AAA{
            @route("/aaa")
            op func3(): void;
          };
          namespace AAB{
            interface AABGroup1 {
              @route("/aab1")
              op func4(): void;
            }
            interface AABGroup2 {
              @route("/aab2")
              op func5(): void;
            }
          }
        }
      }
    `);

    const context = await createSdkContextForTester(program, {
      namespace: "Azure.A",
    });
    const sdkPackage = context.sdkPackage;
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
  it("Separate namespace references", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        `
      @service
      namespace Client.ClientNamespace;

      interface First {
        @route("/first")
        @get
        getFirst(): FirstModel.FirstClientResult;
      }

      namespace FirstModel {
        model FirstClientResult {
          name: string;
        }
      }

    `,
        `
      namespace ClientNameSpaceClient;

      @client({
        name: "ClientNamespaceFirstClient",
        service: Client.ClientNamespace,
      })
      @clientNamespace("client.clientnamespace.")
      interface ClientNamespaceFirstClient {
        getFirst is Client.ClientNamespace.First.getFirst;
      }

      @@clientNamespace(Client.ClientNamespace.FirstModel, "client.clientnamespace.first");
    `,
      ),
    );
    const context = await createSdkContextForTester(program, {
      namespace: "Azure.Foo",
    });
    const sdkPackage = context.sdkPackage;
    const models = sdkPackage.models;
    strictEqual(models.length, 1);
    const model = models[0];
    strictEqual(model.name, "FirstClientResult");
    strictEqual(model.namespace, "client.clientnamespace.first");
  });
});

it("customization with models from original namespace", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
      @service
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
    ),
  );
  const context = await createSdkContextForTester(program, {
    namespace: "Renamed",
  });
  const sdkPackage = context.sdkPackage;
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

it("@clientNamespace extending namespace flag should not duplicate", async () => {
  const { program } = await SimpleTester.compile(
    `
      @clientNamespace("Azure.Search.Documents.Indexes")
      @service
      namespace Search {
        op search(): string;
      }
    `,
  );
  const context = await createSdkContextForTester(program, {
    namespace: "Azure.Search.Documents",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.namespace, "Azure.Search.Documents.Indexes");
});

it("@clientNamespace with same value as namespace flag should not duplicate", async () => {
  const { program } = await SimpleTester.compile(
    `
      @clientNamespace("Azure.Search.Documents")
      @service
      namespace Azure.Search {
        op search(): string;
      }
    `,
  );
  const context = await createSdkContextForTester(program, {
    namespace: "Azure.Search.Documents",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.namespace, "Azure.Search.Documents");
});

it("@clientNamespace with partial overlap should still work correctly", async () => {
  const { program } = await SimpleTester.compile(
    `
      @clientNamespace("Azure.Search.Documents")
      @service
      namespace Azure.Search {
        model SearchResult {
          prop: string;
        }
        op search(): SearchResult;
      }
    `,
  );
  const context = await createSdkContextForTester(program, {
    namespace: "Azure.Search.Documents",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.namespace, "Azure.Search.Documents");
  strictEqual(sdkPackage.models[0].namespace, "Azure.Search.Documents");
});

it("@clientNamespace should work with nested namespaces and matching flag", async () => {
  const { program } = await SimpleTester.compile(
    `
      @clientNamespace("Azure.Search.Documents")
      @service
      namespace Azure.Search {
        namespace Models {
          model SearchResult {
            prop: string;
          }
        }
        op search(): Models.SearchResult;
      }
    `,
  );
  const context = await createSdkContextForTester(program, {
    namespace: "Azure.Search.Documents",
  });
  const sdkPackage = context.sdkPackage;
  const client = sdkPackage.clients[0];
  strictEqual(client.namespace, "Azure.Search.Documents");
  // Model should be in nested namespace under the override
  strictEqual(sdkPackage.models[0].namespace, "Azure.Search.Documents.Models");
});
