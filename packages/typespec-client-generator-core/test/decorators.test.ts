import {
  Enum,
  Interface,
  Model,
  Namespace,
  Operation,
  ignoreDiagnostics,
} from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getAccess,
  getClient,
  getClientNameOverride,
  getOperationGroup,
  getUsage,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "../src/decorators.js";
import {
  SdkClientType,
  SdkHttpOperation,
  SdkMethodResponse,
  SdkOperationGroup,
  UsageFlags,
} from "../src/interfaces.js";
import { getCrossLanguageDefinitionId, getCrossLanguagePackageId } from "../src/public-utils.js";
import { getAllModels } from "../src/types.js";
import { SdkTestRunner, createSdkContextTestHelper, createSdkTestRunner } from "./test-host.js";

describe("typespec-client-generator-core: decorators", () => {
  let runner: SdkTestRunner;

  beforeEach(async () => {
    runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  });

  describe("@client", () => {
    it("mark an namespace as a client", async () => {
      const { MyClient } = await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients, [
        {
          kind: "SdkClient",
          name: "MyClient",
          service: MyClient,
          type: MyClient,
          arm: false,
          crossLanguageDefinitionId: "MyClient.MyClient",
        },
      ]);
    });

    it("mark an interface as a client", async () => {
      const { MyService, MyClient } = await runner.compile(`
        @service({})
        @test namespace MyService;
        @client({service: MyService})
        @test interface MyClient {}
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients, [
        {
          kind: "SdkClient",
          name: "MyClient",
          service: MyService,
          type: MyClient,
          arm: false,
          crossLanguageDefinitionId: "MyService.MyClient",
        },
      ]);
    });
    it("emit diagnostic if the client namespace doesn't ends with client", async () => {
      const diagnostics = await runner.diagnose(`
        @client
        @service({})
        @test namespace MyService;
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/client-name",
      });
    });

    it("emit diagnostic if the client explicit name doesn't ends with Client", async () => {
      const diagnostics = await runner.diagnose(`
        @client({name: "MySDK"})
        @service({})
        @test namespace MyService;
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/client-name",
      });
    });

    it("@client with scope", async () => {
      const testCode = `
        @service({
          title: "DeviceUpdateClient",
        })
        namespace Azure.IoT.DeviceUpdate;
        
        @client({name: "DeviceUpdateClient"}, "java")
        @client({name: "DeviceUpdateClient"}, "csharp")
        @client({name: "DeviceUpdateClient"}, "javascript")
        interface DeviceUpdateOperations {
        }
        
        @client({name: "DeviceManagementClient"}, "java")
        @client({name: "DeviceManagementClient"}, "csharp")
        @client({name: "DeviceManagementClient"}, "javascript")
        interface DeviceManagementOperations {
        }
        
        @client({name: "InstanceManagementClient"}, "java")
        @client({name: "InstanceManagementClient"}, "csharp")
        @client({name: "InstanceManagementClient"}, "javascript")
        interface InstanceManagementOperations {
        }
      `;

      // java should get three clients
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compile(testCode);
        strictEqual(listClients(runner.context).length, 3);
      }

      // csharp should get three clients
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compile(testCode);
        strictEqual(listClients(runner.context).length, 3);
      }

      // python should get one client
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compile(testCode);
        strictEqual(listClients(runner.context).length, 1);
      }

      // typescript should get three clients
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-ts" });
        await runner.compile(testCode);
        strictEqual(listClients(runner.context).length, 3);
      }
    });
  });

  describe("listClients without @client", () => {
    it("use service namespace if there is not clients and append Client to service name", async () => {
      const { MyService } = await runner.compile(`
        @service({})
        @test
        namespace MyService;
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients, [
        {
          kind: "SdkClient",
          name: "MyServiceClient",
          service: MyService,
          type: MyService,
          arm: false,
          crossLanguageDefinitionId: "MyService.MyServiceClient",
        },
      ]);
    });
  });

  describe("@operationGroup", () => {
    it("mark an namespace as an operation group", async () => {
      const { MyClient, MyGroup } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        @operationGroup
        @test namespace MyGroup {}
      `)) as { MyClient: Namespace; MyGroup: Namespace };

      const groups = listOperationGroups(runner.context, getClient(runner.context, MyClient)!);
      deepStrictEqual(groups, [
        {
          kind: "SdkOperationGroup",
          type: MyGroup,
          groupPath: "MyClient.MyGroup",
          service: MyClient,
        },
      ]);
    });

    it("mark an interface as an operationGroup", async () => {
      const { MyClient, MyGroup } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;
        @operationGroup
        @test
        interface MyGroup {}
      `)) as { MyClient: Namespace; MyGroup: Interface };

      const groups = listOperationGroups(runner.context, getClient(runner.context, MyClient)!);
      deepStrictEqual(groups, [
        {
          kind: "SdkOperationGroup",
          type: MyGroup,
          groupPath: "MyClient.MyGroup",
          service: MyClient,
        },
      ]);
    });

    it("list operations at root of client outside of operation group", async () => {
      const { MyClient } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;       
        @route("/root2") op atRoot2(): void;

        @operationGroup
        @test interface MyGroup {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `)) as { MyClient: Namespace };

      const operations = listOperationsInOperationGroup(
        runner.context,
        getClient(runner.context, MyClient)!
      );
      deepStrictEqual(
        operations.map((x) => x.name),
        ["atRoot1", "atRoot2"]
      );
    });

    it("list operations in an operation group", async () => {
      const { MyGroup } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;
        @route("/root2") op atRoot2(): void;

        @operationGroup
        @test interface MyGroup {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `)) as { MyGroup: Interface };

      const group = getOperationGroup(runner.context, MyGroup);
      ok(group);
      const operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["inOpGroup1", "inOpGroup2"]
      );
    });

    it("crossLanguageDefinitionId basic", async () => {
      const { one } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        @test op one(): void;
      `)) as { one: Operation };

      strictEqual(getCrossLanguageDefinitionId(runner.context, one), "MyClient.one");
    });

    it("crossLanguageDefinitionId with interface", async () => {
      const { one } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        interface Widgets {
          @test op one(): void;
        }
      `)) as { one: Operation };

      strictEqual(getCrossLanguageDefinitionId(runner.context, one), "MyClient.Widgets.one");
    });

    it("crossLanguageDefinitionId with subnamespace", async () => {
      const { one } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        namespace Widgets {
          @test op one(): void;
        }
      `)) as { one: Operation };

      strictEqual(getCrossLanguageDefinitionId(runner.context, one), "MyClient.Widgets.one");
    });

    it("crossLanguageDefinitionId with subnamespace and interface", async () => {
      const { one } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        namespace SubNamespace {
          interface Widgets {
            @test op one(): void;
          }
        }
      `)) as { one: Operation };

      strictEqual(
        getCrossLanguageDefinitionId(runner.context, one),
        "MyClient.SubNamespace.Widgets.one"
      );
    });

    it("crossLanguagePackageId", async () => {
      await runner.compile(`
        @client({name: "MyPackageClient"})
        @service({})
        namespace My.Package.Namespace;

        namespace SubNamespace {
          interface Widgets {
            @test op one(): void;
          }
        }
      `);
      strictEqual(
        ignoreDiagnostics(getCrossLanguagePackageId(runner.context)),
        "My.Package.Namespace"
      );
    });

    it("@operationGroup with scope", async () => {
      const testCode = `
        @service({
          title: "DeviceUpdateClient",
        })
        namespace Azure.IoT.DeviceUpdate;
        
        @operationGroup("java")
        @operationGroup("csharp")
        @operationGroup("javascript")
        interface DeviceUpdateOperations {
        }
        
        @operationGroup("java")
        @operationGroup("csharp")
        @operationGroup("javascript")
        interface DeviceManagementOperations {
        }
        
        @operationGroup("java")
        @operationGroup("csharp")
        @operationGroup("javascript")
        interface InstanceManagementOperations {
        }

        @client({name: "DeviceUpdateClient", service: Azure.IoT.DeviceUpdate}, "python")
        namespace Customizations{}
      `;

      // java should get three operation groups
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compile(testCode);
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 3);
      }

      // csharp should get three operation groups
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compile(testCode);
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 3);
      }

      // python should get three operation groups
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compile(testCode);
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 0);
      }

      // typescript should get three operation groups
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-ts" });
        await runner.compile(testCode);
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 3);
      }
    });

    it("use service namespace if there is not clients and append Client to service name", async () => {
      const { MyService } = await runner.compile(`
        @service({})
        @test
        namespace MyService;
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients, [
        {
          kind: "SdkClient",
          name: "MyServiceClient",
          service: MyService,
          type: MyService,
          arm: false,
          crossLanguageDefinitionId: "MyService.MyServiceClient",
        },
      ]);
    });
  });

  describe("listOperationGroups without @client and @operationGroup", () => {
    it("list operations in namespace or interface", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;
        @route("/root2") op atRoot2(): void;

        @test interface MyGroup {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `);
      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      let operations = listOperationsInOperationGroup(runner.context, clients[0]);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["atRoot1", "atRoot2"]
      );

      const ogs = listOperationGroups(runner.context, clients[0]);
      strictEqual(ogs.length, 1);
      strictEqual(ogs[0].subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, ogs[0]).length, 0);

      operations = listOperationsInOperationGroup(runner.context, ogs[0]);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["inOpGroup1", "inOpGroup2"]
      );
    });

    it("namespace and interface hierarchy", async () => {
      const { A, AA, AAA, AAB, AG, AAG, AABGroup1, AABGroup2 } = (await runner.compile(`
        @service({})
        @route("/a")
        @test namespace A {
          @route("/o1") op a_o1(): void;
          @route("/o2") op a_o2(): void;

          @route("/g")
          @test interface AG {
            @route("/o1") a_g_o1(): void;
            @route("/o2") a_g_o2(): void;
          }

          @route("/a")
          @test namespace AA {
            @route("/o1") op aa_o1(): void;
            @route("/o2") op aa_o2(): void;

            @route("/g")
            @test interface AAG {
              @route("/o1") aa_g_o1(): void;
              @route("/o2") aa_g_o2(): void;
            }

            @route("/a")
            @test namespace AAA{};

            @route("/b")
            @test namespace AAB{
              @route("/o1") op aab_o1(): void;
              @route("/o2") op aab_o2(): void;

              @route("/g1")
              @test interface AABGroup1 {
                @route("/o1") aab_g1_o1(): void;
                @route("/o2") aab_g1_o2(): void;
              }

              @route("/g2")
              @test interface AABGroup2 {
              }
            };
          }
        };
      `)) as {
        A: Namespace;
        AA: Namespace;
        AAA: Namespace;
        AAB: Namespace;
        AG: Interface;
        AAG: Interface;
        AABGroup1: Interface;
        AABGroup2: Interface;
      };

      const ag: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AG,
        groupPath: "AClient.AG",
        service: A,
      };

      const aag: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAG,
        groupPath: "AClient.AA.AAG",
        service: A,
      };

      const aabGroup1: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AABGroup1,
        groupPath: "AClient.AA.AAB.AABGroup1",
        service: A,
      };

      const aabGroup2: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AABGroup2,
        groupPath: "AClient.AA.AAB.AABGroup2",
        service: A,
      };

      const aaa: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAA,
        groupPath: "AClient.AA.AAA",
        service: A,
      };

      const aab: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAB,
        subOperationGroups: [aabGroup1, aabGroup2],
        groupPath: "AClient.AA.AAB",
        service: A,
      };

      const aa: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AA,
        subOperationGroups: [aaa, aab, aag],
        groupPath: "AClient.AA",
        service: A,
      };

      const client = getClient(runner.context, A);
      ok(client);
      let operations = listOperationsInOperationGroup(runner.context, client);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["a_o1", "a_o2"]
      );

      let group = getOperationGroup(runner.context, AA);
      deepStrictEqual(group, aa);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aa_o1", "aa_o2"]
      );

      group = getOperationGroup(runner.context, AAA);
      deepStrictEqual(group, aaa);
      deepStrictEqual(listOperationsInOperationGroup(runner.context, group), []);

      group = getOperationGroup(runner.context, AAB);
      deepStrictEqual(group, aab);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aab_o1", "aab_o2"]
      );

      group = getOperationGroup(runner.context, AG);
      deepStrictEqual(group, ag);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["a_g_o1", "a_g_o2"]
      );

      group = getOperationGroup(runner.context, AAG);
      deepStrictEqual(group, aag);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aa_g_o1", "aa_g_o2"]
      );

      group = getOperationGroup(runner.context, AABGroup1);
      deepStrictEqual(group, aabGroup1);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aab_g1_o1", "aab_g1_o2"]
      );

      group = getOperationGroup(runner.context, AABGroup2);
      deepStrictEqual(group, aabGroup2);
      deepStrictEqual(listOperationsInOperationGroup(runner.context, group), []);

      let allOperationGroups = listOperationGroups(runner.context, client);
      deepStrictEqual(allOperationGroups, [aa, ag]);
      allOperationGroups = listOperationGroups(runner.context, aa);
      deepStrictEqual(allOperationGroups, [aaa, aab, aag]);
      allOperationGroups = listOperationGroups(runner.context, aaa);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aab);
      deepStrictEqual(allOperationGroups, [aabGroup1, aabGroup2]);
      allOperationGroups = listOperationGroups(runner.context, aag);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aabGroup1);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aabGroup2);
      deepStrictEqual(allOperationGroups, []);
      deepStrictEqual(listOperationGroups(runner.context, ag), []);

      allOperationGroups = listOperationGroups(runner.context, client, true);
      deepStrictEqual(allOperationGroups, [aa, aaa, aab, aabGroup1, aabGroup2, aag, ag]);
      allOperationGroups = listOperationGroups(runner.context, aa, true);
      deepStrictEqual(allOperationGroups, [aaa, aab, aabGroup1, aabGroup2, aag]);
      allOperationGroups = listOperationGroups(runner.context, aaa, true);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aab, true);
      deepStrictEqual(allOperationGroups, [aabGroup1, aabGroup2]);
      allOperationGroups = listOperationGroups(runner.context, aag, true);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aabGroup1, true);
      deepStrictEqual(allOperationGroups, []);
      allOperationGroups = listOperationGroups(runner.context, aabGroup2, true);
      deepStrictEqual(allOperationGroups, []);
      deepStrictEqual(listOperationGroups(runner.context, ag, true), []);

      let allOperations = listOperationsInOperationGroup(runner.context, client, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        [
          "a_o1",
          "a_o2",
          "aa_o1",
          "aa_o2",
          "aab_o1",
          "aab_o2",
          "aab_g1_o1",
          "aab_g1_o2",
          "aa_g_o1",
          "aa_g_o2",
          "a_g_o1",
          "a_g_o2",
        ]
      );
      allOperations = listOperationsInOperationGroup(runner.context, aa, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aa_o1", "aa_o2", "aab_o1", "aab_o2", "aab_g1_o1", "aab_g1_o2", "aa_g_o1", "aa_g_o2"]
      );
      allOperations = listOperationsInOperationGroup(runner.context, aaa, true);
      deepStrictEqual(allOperations, []);
      allOperations = listOperationsInOperationGroup(runner.context, aab, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aab_o1", "aab_o2", "aab_g1_o1", "aab_g1_o2"]
      );
      allOperations = listOperationsInOperationGroup(runner.context, aag, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aa_g_o1", "aa_g_o2"]
      );
      allOperations = listOperationsInOperationGroup(runner.context, aabGroup1, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aab_g1_o1", "aab_g1_o2"]
      );
      allOperations = listOperationsInOperationGroup(runner.context, aabGroup2, true);
      deepStrictEqual(allOperations, []);
      allOperations = listOperationsInOperationGroup(runner.context, ag, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["a_g_o1", "a_g_o2"]
      );
    });

    it("interface without operation", async () => {
      const { MyGroup, MyClient } = (await runner.compile(`
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;

        @test interface MyGroup {
        }
      `)) as { MyGroup: Interface; MyClient: Namespace };

      deepStrictEqual(getOperationGroup(runner.context, MyGroup), {
        kind: "SdkOperationGroup",
        type: MyGroup,
        groupPath: "MyClient.MyGroup",
        service: MyClient,
      });

      const clients = listClients(runner.context);
      const ogs = listOperationGroups(runner.context, clients[0]);
      deepStrictEqual(ogs.length, 1);
    });

    it("empty namespaces and interfaces", async () => {
      await runner.compile(`
        @service({})
        @test
        namespace MyService {
          namespace A {
            namespace B {
              interface B1 {}
              interface B2 {}
            }

            interface A1 {}
            interface A2 {}
          }
          namespace C {
            interface C1 {}
          }
          namespace D {}
          namespace E {
            namespace F {}
          }
          namespace G {
            namespace H {
              interface H1 {}
            }
          }
        };
      `);

      const clients = listClients(runner.context);
      const ogs = listOperationGroups(runner.context, clients[0]);
      let countFromProperty = ogs.length;
      let countFromList = ogs.length;
      const q = [...ogs];
      while (q.length > 0) {
        const og = q.pop()!;
        countFromProperty += og.subOperationGroups?.length ?? 0;
        countFromList += listOperationGroups(runner.context, og).length;
        q.push(...(og.subOperationGroups ?? []));
      }
      deepStrictEqual(countFromProperty, 14);
      deepStrictEqual(countFromList, 14);
    });
  });

  describe("client hierarchy", () => {
    it("multi clients ", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          op x(): void;
        }
        @service({})
        namespace Test2Client {
          op y(): void;
        }
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 2);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);

      const client2 = clients.find((x) => x.name === "Test2Client");
      ok(client2);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client2).map((x) => x.name),
        ["y"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client2).length, 0);
    });

    it("no client", async () => {
      await runner.compile(`
        namespace Test1Client {
          op x(): void;
        }
      `);

      deepStrictEqual(listClients(runner.context).length, 0);
    });

    it("omit one namespace", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          op x(): void;
        }
        
        namespace Test2 {
          op y(): void;
        }
      `);

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);
    });

    it("nested namespace", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          namespace B {
            op x(): void;
          }
        }
      `);

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      strictEqual(listOperationsInOperationGroup(runner.context, client1).length, 0);

      const client1Ogs = listOperationGroups(runner.context, client1);
      strictEqual(client1Ogs.length, 1);
      const b = client1Ogs.find((x) => x.type.name === "B");
      ok(b);
      strictEqual(b.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, b).length, 0);
      strictEqual(b.groupPath, "Test1Client.B");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, b).map((x) => x.name),
        ["x"]
      );
    });

    it("nested namespace and interface with naming change", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          @route("/b")
          @clientName("BRename")
          namespace B {
            op x(): void;

            @route("/c")
            interface C {
              op y(): void;
            }
          }
        }
      `);

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      strictEqual(listOperationsInOperationGroup(runner.context, client1).length, 0);

      const client1Ogs = listOperationGroups(runner.context, client1);
      strictEqual(client1Ogs.length, 1);
      const b = client1Ogs.find((x) => x.type.name === "B");
      ok(b);
      strictEqual(b.subOperationGroups?.length, 1);
      strictEqual(listOperationGroups(runner.context, b).length, 1);
      strictEqual(b.groupPath, "Test1Client.BRename");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, b).map((x) => x.name),
        ["x"]
      );

      const c = b.subOperationGroups?.find((x) => x.type.name === "C");
      ok(c);
      strictEqual(c.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, c).length, 0);
      strictEqual(c.groupPath, "Test1Client.BRename.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, c).map((x) => x.name),
        ["y"]
      );
    });

    it("nested empty namespace and interface", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          namespace B {
            interface C {
            }
          }
        }
      `);

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      strictEqual(listOperationsInOperationGroup(runner.context, client1).length, 0);

      const client1Ogs = listOperationGroups(runner.context, client1);
      strictEqual(client1Ogs.length, 1);
      const b = client1Ogs.find((x) => x.type.name === "B");
      ok(b);
      strictEqual(b.subOperationGroups?.length, 1);
      strictEqual(listOperationGroups(runner.context, b).length, 1);
      strictEqual(b.groupPath, "Test1Client.B");
      strictEqual(listOperationsInOperationGroup(runner.context, b).length, 0);

      const c = b.subOperationGroups?.find((x) => x.type.name === "C");
      ok(c);
      strictEqual(c.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, c).length, 0);
      strictEqual(c.groupPath, "Test1Client.B.C");
      strictEqual(listOperationsInOperationGroup(runner.context, c).length, 0);
    });

    it("rename client name", async () => {
      await runner.compileWithCustomization(
        `
        @service({})
        namespace A {
          op x(): void;
        }
      `,
        `
        namespace Customizations;

        @@clientName(A, "Test1Client");
      `
      );

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);
    });

    it("rename client name - diagnostics", async () => {
      const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
        `
        @service({})
        namespace A {
          op x(): void;
        }
      `,
        `
        @@client(A, {
          name: "Test1Client",
          service: A
        });
      `
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
      });

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "AClient");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);
    });

    it("split into two clients", async () => {
      await runner.compileWithCustomization(
        `
        @service({})
        namespace A {
          @route("/b")
          interface B {
            op x(): void;
          }

          @route("/c")
          interface C {
            op y(): void;
          }
        }`,
        `
        @client({name: "Test1Client", service: A})
        interface Test1Client {
          x is A.B.x;
        }
        
        @client({name: "Test2Client", service: A})
        interface Test2Client {
          y is A.C.y;
        }
      `
      );

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 2);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);

      const client2 = clients.find((x) => x.name === "Test2Client");
      ok(client2);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client2).map((x) => x.name),
        ["y"]
      );
      deepStrictEqual(listOperationGroups(runner.context, client2).length, 0);
    });

    it("split into two clients - diagnostics", async () => {
      const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
        `
        @service({})
        namespace A {
          @route("/b")
          namespace B {
            op x(): void;
          }

          @route("/c")
          namespace C {
            op y(): void;
          }
        }`,
        `
        @@client(A.B, {
          name: "Test1Client",
        });

        @@client(A.C, {
          name: "Test2Client",
        });
      `
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
        },
        {
          code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
        },
      ]);

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client = clients.find((x) => x.name === "AClient");
      ok(client);
      strictEqual(listOperationsInOperationGroup(runner.context, client).length, 0);

      const clientOgs = listOperationGroups(runner.context, client);
      strictEqual(clientOgs.length, 2);

      const og1 = clientOgs.find((x) => x.type.name === "B");
      ok(og1);
      strictEqual(og1.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og1).length, 0);
      strictEqual(og1.groupPath, "AClient.B");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og1).map((x) => x.name),
        ["x"]
      );

      const og2 = clientOgs.find((x) => x.type.name === "C");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "AClient.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["y"]
      );
    });

    it("one client and two operation groups", async () => {
      await runner.compileWithCustomization(
        `
        @service({})
        namespace PetStore {
          @route("/feed")
          op feed(): void;

          @route("/pet")
          op pet(): void;
        }`,
        `
        @client({
          name: "PetStoreClient",
          service: PetStore
        })
        namespace Customizations;
        
        @operationGroup
        interface OpGrp1{
          feed is PetStore.feed
        }
        
        @operationGroup
        interface OpGrp2 {
          pet is PetStore.pet
        }
      `
      );

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client = clients.find((x) => x.name === "PetStoreClient");
      ok(client);
      strictEqual(listOperationsInOperationGroup(runner.context, client).length, 0);

      const clientOgs = listOperationGroups(runner.context, client);
      strictEqual(clientOgs.length, 2);

      const og1 = clientOgs.find((x) => x.type.name === "OpGrp1");
      ok(og1);
      strictEqual(og1.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og1).length, 0);
      strictEqual(og1.groupPath, "PetStoreClient.OpGrp1");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og1).map((x) => x.name),
        ["feed"]
      );

      const og2 = clientOgs.find((x) => x.type.name === "OpGrp2");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "PetStoreClient.OpGrp2");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["pet"]
      );
    });

    it("operation group - diagnostics", async () => {
      const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
        `
        @service({})
        namespace A {
          @route("/b")
          namespace B {
            op x(): void;
          }

          @route("/c")
          namespace C {
            op y(): void;
          }
        }`,
        `
        @@operationGroup(A.B);
      `
      );

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
      });

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client = clients.find((x) => x.name === "AClient");
      ok(client);
      strictEqual(listOperationsInOperationGroup(runner.context, client).length, 0);

      const clientOgs = listOperationGroups(runner.context, client);
      strictEqual(clientOgs.length, 2);

      const og1 = clientOgs.find((x) => x.type.name === "B");
      ok(og1);
      strictEqual(og1.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og1).length, 0);
      strictEqual(og1.groupPath, "AClient.B");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og1).map((x) => x.name),
        ["x"]
      );

      const og2 = clientOgs.find((x) => x.type.name === "C");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "AClient.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["y"]
      );
    });

    it("rearrange operations", async () => {
      await runner.compile(`
        @service({})
        namespace A {
          @route("/b")
          namespace B {
            op x(): void;

            @route("/c")
            interface C {
              op y(): void;
            }
          }
        }

        @client({
          name: "Test1Client",
          service: A
        })
        namespace Customization {
          @operationGroup
          namespace B {
            op x is A.B.x;
            op y is A.B.C.y;
          }
        }
      `);

      const clients = listClients(runner.context);
      strictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      strictEqual(listOperationsInOperationGroup(runner.context, client1).length, 0);

      const client1Ogs = listOperationGroups(runner.context, client1);
      strictEqual(client1Ogs.length, 1);
      const b = client1Ogs.find((x) => x.type.name === "B");
      ok(b);
      strictEqual(b.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, b).length, 0);
      strictEqual(b.groupPath, "Test1Client.B");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, b).map((x) => x.name),
        ["x", "y"]
      );
    });
  });

  async function protocolAPITestHelper(
    runner: SdkTestRunner,
    protocolValue: boolean,
    globalValue: boolean
  ): Promise<void> {
    const testCode = `
          @protocolAPI(${protocolValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compile(testCode);

    const actual = shouldGenerateProtocol(
      createSdkContextTestHelper(runner.context.program, {
        generateProtocolMethods: globalValue,
        generateConvenienceMethods: false,
      }),
      test as Operation
    );
    strictEqual(actual, protocolValue);
  }
  describe("@protocolAPI", () => {
    it("generateProtocolMethodsTrue, operation marked protocolAPI true", async () => {
      await protocolAPITestHelper(runner, true, true);
    });
    it("generateProtocolMethodsTrue, operation marked protocolAPI false", async () => {
      await protocolAPITestHelper(runner, false, true);
    });
    it("generateProtocolMethodsFalse, operation marked protocolAPI true", async () => {
      await protocolAPITestHelper(runner, true, false);
    });
    it("generateProtocolMethodsFalse, operation marked protocolAPI false", async () => {
      await protocolAPITestHelper(runner, false, false);
    });
  });

  async function convenientAPITestHelper(
    runner: SdkTestRunner,
    convenientValue: boolean,
    globalValue: boolean
  ): Promise<void> {
    const testCode = `
          @convenientAPI(${convenientValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compile(testCode);

    const actual = shouldGenerateConvenient(
      createSdkContextTestHelper(runner.program, {
        generateProtocolMethods: false,
        generateConvenienceMethods: globalValue,
      }),
      test as Operation
    );
    strictEqual(actual, convenientValue);
  }

  describe("@convenientAPI", () => {
    it("generateConvenienceMethodsTrue, operation marked convenientAPI true", async () => {
      await convenientAPITestHelper(runner, true, true);
    });
    it("generateConvenienceMethodsTrue, operation marked convenientAPI false", async () => {
      await convenientAPITestHelper(runner, false, true);
    });
    it("generateConvenienceMethodsFalse, operation marked convenientAPI true", async () => {
      await convenientAPITestHelper(runner, true, false);
    });
    it("generateConvenienceMethodsFalse, operation marked convenientAPI false", async () => {
      await convenientAPITestHelper(runner, false, false);
    });

    it("mark an operation as convenientAPI default, pass in sdkContext with generateConvenienceMethods false", async () => {
      const { test } = await runner.compile(`
        @convenientAPI
        @test
        op test(): void;
      `);

      const actual = shouldGenerateConvenient(
        createSdkContextTestHelper(runner.program, {
          generateProtocolMethods: false,
          generateConvenienceMethods: false,
        }),
        test as Operation
      );
      strictEqual(actual, true);
    });
  });

  describe("@protocolAPI and @convenientAPI with scope", () => {
    it("mark an operation as protocolAPI false for csharp and convenientAPI false for java, pass in default sdkContext", async () => {
      const testCode = `
        @protocolAPI(false, "csharp")
        @convenientAPI(false, "java")
        @test
        op test(): void;
      `;

      // java should get protocolAPI=true and convenientAPI=false
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        const { test } = (await runner.compile(testCode)) as { test: Operation };
        strictEqual(shouldGenerateProtocol(runner.context, test), true);
        strictEqual(
          shouldGenerateConvenient(runner.context, test),
          false,
          "convenientAPI should be false for java"
        );
      }

      // csharp should get protocolAPI=false and convenientAPI=true
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        const { test } = (await runner.compile(testCode)) as { test: Operation };
        strictEqual(
          shouldGenerateProtocol(runner.context, test),
          false,
          "protocolAPI should be false for csharp"
        );
        strictEqual(shouldGenerateConvenient(runner.context, test), true);
      }
    });
  });

  describe("scope", () => {
    it("emitter with same scope as decorator", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter different scope from decorator", async () => {
      const code = `
      @test
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
    `;
      const { func } = (await runner.compile(code)) as { func: Operation };
      strictEqual(getAccess(runner.context, func), "public");

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      const { func: funcCsharp } = (await runnerWithCsharp.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithCsharp.context, funcCsharp), "internal");
    });

    it("emitter first in decorator scope list", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "java")
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter second in decorator scope list", async () => {
      runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "java")
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("emitter excluded from decorator scope list", async () => {
      const code = `
      @test
      @access(Access.internal, "java")
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
    `;
      const { func } = (await runner.compile(code)) as { func: Operation };

      strictEqual(getAccess(runner.context, func), "public");
      const runnerWithJava = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-java",
      });
      const { func: funcJava } = (await runnerWithJava.compile(code)) as { func: Operation };
      strictEqual(getAccess(runnerWithJava.context, funcJava), "internal");
    });

    it("duplicate-decorator diagnostic for first non-scoped decorator then scoped decorator", async () => {
      const diagnostics = await runner.diagnose(`
      @test
      @access(Access.internal)
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
      `);

      expectDiagnostics(diagnostics, {
        code: "duplicate-decorator",
      });
    });

    it("duplicate-decorator diagnostic for first scoped decorator then non-scoped decorator", async () => {
      const diagnostics = await runner.diagnose(`
      @test
      @access(Access.internal, "csharp")
      @access(Access.internal)
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
      `);

      expectDiagnostics(diagnostics, {
        code: "duplicate-decorator",
      });
    });

    it("duplicate-decorator diagnostic for multiple same scope", async () => {
      const diagnostics = await runner.diagnose(`
      @test
      @access(Access.internal, "csharp")
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
      `);

      expectDiagnostics(diagnostics, {
        code: "duplicate-decorator",
      });
    });

    it("csv scope list", async () => {
      function getCodeTemplate(language: string) {
        return `
          @test
          @access(Access.internal, "${language}")
          model Test {
            prop: string;
          }
          `;
      }
      const pythonRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });
      const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const csharpRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });

      const testCode = getCodeTemplate("python,csharp");
      const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

      const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

      const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(javaRunner.context, TestJava), "public");
    });

    it("csv scope list augment", async () => {
      function getCodeTemplate(language: string) {
        return `
          @test
          model Test {
            prop: string;
          }

          @@access(Test, Access.public, "java, ts");
          @@access(Test, Access.internal, "${language}");
          `;
      }
      const pythonRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });
      const javaRunner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const csharpRunner = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });

      const testCode = getCodeTemplate("python,csharp");
      const { Test: TestPython } = (await pythonRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(pythonRunner.context, TestPython), "internal");

      const { Test: TestCSharp } = (await csharpRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(csharpRunner.context, TestCSharp), "internal");

      const { Test: TestJava } = (await javaRunner.compile(testCode)) as { Test: Model };
      strictEqual(getAccess(javaRunner.context, TestJava), "public");
    });

    it("duplicate-decorator diagnostic for csv scope list", async () => {
      const diagnostics = await runner.diagnose(`
      @test
      @access(Access.internal, "csharp,ts")
      @access(Access.internal, "csharp")
      op func(
        @query("createdAt")
        createdAt: utcDateTime;
      ): void;
      `);

      expectDiagnostics(diagnostics, {
        code: "duplicate-decorator",
      });
    });
  });

  describe("@access", () => {
    it("mark an operation as internal", async () => {
      const { test } = (await runner.compile(`
        @service({title: "Test Service"}) namespace TestService;
        @test
        @access(Access.internal)
        op test(): void;
      `)) as { test: Operation };

      const actual = getAccess(runner.context, test);
      strictEqual(actual, "internal");
    });

    it("default calculated value of operation is undefined, default value of calculated model is undefined", async () => {
      const { test, Test } = (await runner.compile(`
        @test
        model Test{}

        @test
        op test(): void;
      `)) as { test: Operation; Test: Model };

      strictEqual(getAccess(runner.context, test), "public");
      strictEqual(getAccess(runner.context, Test), "public");
    });

    it("model access calculated by operation", async () => {
      const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `)) as { Test: Model; func: Operation };

      let actual = getAccess(runner.context, Test);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("override calculated model with public access", async () => {
      const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @access(Access.public)
          model Test {
            prop: string;
          }
          @test
          @access(Access.internal)
          op func(
            @body body: Test
          ): void;
        }
      `)) as { Test: Model; func: Operation };

      let actual = getAccess(runner.context, Test);
      strictEqual(actual, "public");
      actual = getAccess(runner.context, func);
      strictEqual(actual, "internal");
    });

    it("override calculated model with internal access", async () => {
      const { Test, func } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @access(Access.internal) // This is an incorrect usage. We will have linter to ban.
          model Test {
            prop: string;
          }
          @test
          op func(
            @body body: Test
          ): void;
        }
        `)) as { Test: Model; func: Operation };

      strictEqual(getAccess(runner.context, Test), "internal");
      strictEqual(getAccess(runner.context, func), "public");
    });

    it("access propagation", async () => {
      const { Fish, Shark, Salmon, SawShark, Origin } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @discriminator("kind")
          @test
          model Fish {
            age: int32;
          }

          @discriminator("sharktype")
          @test
          model Shark extends Fish {
            kind: "shark";
            origin: Origin;
          }

          @test
          model Salmon extends Fish {
            kind: "salmon";
          }

          @test
          model SawShark extends Shark {
            sharktype: "saw";
          }

          @test
          model Origin {
            country: string;
            city: string;
            manufacture: string;
          }

          @get
          @access(Access.internal)
          op getModel(): Fish;
        }
      `)) as { Fish: Model; Shark: Model; Salmon: Model; SawShark: Model; Origin: Model };

      let actual = getAccess(runner.context, Fish);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, Shark);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, Salmon);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, SawShark);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, Origin);
      strictEqual(actual, "internal");
    });

    it("complicated access propagation", async () => {
      const { Test1, Test2, Test3, Test4, Test5, Test6, func1, func2, func3, func4, func5 } =
        (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test1 {
            prop: Test2;
          }
          @test
          model Test2 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Test1
          ): void;

          @test
          model Test3 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func2")
          op func2(
            @body body: Test3
          ): void;
          @test
          @route("/func3")
          op func3(
            @body body: Test3
          ): void;

          @test
          model Test4 {
            prop: Test5;
          }
          @test
          model Test5 {
            prop: Test6;
          }
          @test
          model Test6 {
            prop: string;
          }
          @test
          @access(Access.internal)
          @route("/func4")
          op func4(
            @body body: Test4
          ): void;
          @test
          @route("/func5")
          op func5(
            @body body: Test6
          ): void;
        }
      `)) as {
          Test1: Model;
          Test2: Model;
          Test3: Model;
          Test4: Model;
          Test5: Model;
          Test6: Model;
          func1: Operation;
          func2: Operation;
          func3: Operation;
          func4: Operation;
          func5: Operation;
        };

      strictEqual(getAccess(runner.context, func1), "internal");
      strictEqual(getAccess(runner.context, func2), "internal");
      strictEqual(getAccess(runner.context, func3), "public");
      strictEqual(getAccess(runner.context, func4), "internal");
      strictEqual(getAccess(runner.context, func5), "public");

      strictEqual(getAccess(runner.context, Test1), "internal");
      strictEqual(getAccess(runner.context, Test2), "internal");
      strictEqual(getAccess(runner.context, Test3), "public");
      strictEqual(getAccess(runner.context, Test4), "internal");
      strictEqual(getAccess(runner.context, Test5), "internal");
      strictEqual(getAccess(runner.context, Test6), "public");
    });

    it("access propagation for properties, base models and sub models", async () => {
      const {
        Fish,
        Salmon,
        Origin,
        BaseModel,
        ModelA,
        ModelB,
        ModelC,
        ModelD,
        ModelE,
        ModelF,
        EnumA,
        func1,
        func2,
        func3,
        func4,
      } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @discriminator("kind")
          @test
          model Fish {
            age: int32;
          }

          @test
          model Origin {
            country: string;
            city: string;
            manufacture: string;
          }

          @test
          model Salmon extends Fish {
            kind: "salmon";
            origin: Origin;
          }

          @test
          model BaseModel {
            base: string;
          }

          @test
          model ModelA extends BaseModel {
            prop1: ModelB;
            prop2: ModelC[];
            prop3: Record<ModelD>;
            prop4: EnumA;
            prop5: ModelE | ModelF;
          }

          @test
          model ModelB {
            prop: string;
          }

          @test
          model ModelC {
            prop: string;
          }

          @test
          model ModelD {
            prop: string;
          }

          @test
          model ModelE {
            prop: string;
          }

          @test
          model ModelF {
            prop: string;
          }

          @test
          enum EnumA {
            one,
            two,
            three,
          }

          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Fish
          ): void;
          @test
          @route("/func2")
          op func2(
            @body body: Fish
          ): void;

          @test
          @access(Access.internal)
          @route("/func3")
          op func3(
            @body body: ModelA
          ): void;
          @test
          @route("/func4")
          op func4(
            @body body: ModelA
          ): void;
        }
      `)) as {
        Fish: Model;
        Salmon: Model;
        Origin: Model;
        BaseModel: Model;
        ModelA: Model;
        ModelB: Model;
        ModelC: Model;
        ModelD: Model;
        ModelE: Model;
        ModelF: Model;
        EnumA: Model;
        func1: Operation;
        func2: Operation;
        func3: Operation;
        func4: Operation;
      };

      strictEqual(getAccess(runner.context, func1), "internal");
      strictEqual(getAccess(runner.context, func2), "public");
      strictEqual(getAccess(runner.context, func3), "internal");
      strictEqual(getAccess(runner.context, func4), "public");

      strictEqual(getAccess(runner.context, Fish), "public");
      strictEqual(getAccess(runner.context, Salmon), "public");
      strictEqual(getAccess(runner.context, Origin), "public");
      strictEqual(getAccess(runner.context, BaseModel), "public");
      strictEqual(getAccess(runner.context, ModelA), "public");
      strictEqual(getAccess(runner.context, ModelB), "public");
      strictEqual(getAccess(runner.context, ModelC), "public");
      strictEqual(getAccess(runner.context, ModelD), "public");
      strictEqual(getAccess(runner.context, ModelE), "public");
      strictEqual(getAccess(runner.context, ModelF), "public");
      strictEqual(getAccess(runner.context, EnumA), "public");

      strictEqual(runner.context.operationModelsMap?.get(func1)?.size, 3);
      strictEqual(runner.context.operationModelsMap?.get(func2)?.size, 3);
      strictEqual(runner.context.operationModelsMap?.get(func3)?.size, 8);
      strictEqual(runner.context.operationModelsMap?.get(func4)?.size, 8);
    });

    it("access propagation with override", async () => {
      const {
        Test1,
        Test2,
        Test3,
        Test4,
        Test5,
        func1,
        func2,
        func3,
        func4,
        func5,
        func6,
        func7,
        func8,
      } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Test1 {
          }
          @test
          @access(Access.internal)
          @route("/func1")
          op func1(
            @body body: Test1
          ): void;

          @test
          model Test2 {
          }
          @test
          @route("/func2")
          op func2(
            @body body: Test2
          ): void;

          @test
          model Test3 {
          }
          @test
          @access(Access.public)
          @route("/func3")
          op func3(
            @body body: Test3
          ): void;


          @test
          model Test4 {
          }
          @test
          @access(Access.internal)
          @route("/func4")
          op func4(
            @body body: Test4
          ): void;
          @test
          @route("/func5")
          op func5(
            @body body: Test4
          ): void;

          @test
          model Test5 {
          }
          @test
          @access(Access.internal)
          @route("/func6")
          op func6(
            @body body: Test5
          ): void;
          @test
          @route("/func7")
          op func7(
            @body body: Test5
          ): void;
          @test
          @access(Access.public)
          @route("/func8")
          op func8(
            @body body: Test5
          ): void;
        }
      `)) as {
        Test1: Model;
        Test2: Model;
        Test3: Model;
        Test4: Model;
        Test5: Model;
        func1: Operation;
        func2: Operation;
        func3: Operation;
        func4: Operation;
        func5: Operation;
        func6: Operation;
        func7: Operation;
        func8: Operation;
      };

      strictEqual(getAccess(runner.context, func1), "internal");
      strictEqual(getAccess(runner.context, func2), "public");
      strictEqual(getAccess(runner.context, func3), "public");
      strictEqual(getAccess(runner.context, func4), "internal");
      strictEqual(getAccess(runner.context, func5), "public");
      strictEqual(getAccess(runner.context, func6), "internal");
      strictEqual(getAccess(runner.context, func7), "public");
      strictEqual(getAccess(runner.context, func8), "public");

      strictEqual(getAccess(runner.context, Test1), "internal");
      strictEqual(getAccess(runner.context, Test2), "public");
      strictEqual(getAccess(runner.context, Test3), "public");
      strictEqual(getAccess(runner.context, Test4), "public");
      strictEqual(getAccess(runner.context, Test5), "public");
    });

    it("access propagation with nullable", async () => {
      await runner.compileWithBuiltInService(
        `
        model RunStep {
          id: string;
          lastError: RunStepError | null;
        }

        model RunStepError {
          code: string;
          message: string;
        }

        @get
        @route("/threads/{threadId}/runs/{runId}/steps/{stepId}")
        op getRunStep(
          @path threadId: string,
          @path runId: string,
          @path stepId: string,
        ): RunStep;

        @get
        @route("/threads/{threadId}/runs/{runId}/steps")
        op listRunSteps(
          @path threadId: string,
          @path runId: string,
        ): RunStep[];
        @@access(listRunSteps, Access.internal);
        `
      );
      const models = runner.context.sdkPackage.models;
      strictEqual(models.length, 2);
      strictEqual(models[0].access, "public");
      strictEqual(models[1].access, "public");
    });
  });

  describe("@usage", () => {
    it("defaults calculated usage", async () => {
      const { Model1, Model2, Model3, Model4 } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Model1{ prop: string }

          @test
          model Model2{ prop: string }

          @test
          model Model3{ prop: string }

          @test
          model Model4 { prop: string }

          @test
          @route("/func1")
          op func1(@body body: Model1): void;

          @test
          @route("/func2")
          op func2(): Model2;

          @test
          @route("/func3")
          op func3(@body body: Model3): Model3;
        }
      `)) as { Model1: Model; Model2: Model; Model3: Model; Model4: Model };

      strictEqual(getUsage(runner.context, Model1), UsageFlags.Input);
      strictEqual(getUsage(runner.context, Model2), UsageFlags.Output);
      strictEqual(getUsage(runner.context, Model3), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Model4), UsageFlags.None);
    });

    it("usage override", async () => {
      const { Model1, Model2, Model3, Model4, Enum1, Enum2 } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          enum Enum1{
            one,
            two,
            three
          }

          @test
          enum Enum2{
            one,
            two,
            three
          }

          @test
          @usage(Usage.input | Usage.output)
          @access(Access.public)
          model Model1{ prop: string }

          @test
          model Model4{ prop: string }

          @test
          @usage(Usage.output)
          model Model2{ prop: string }

          @test
          @usage(Usage.input)
          model Model3{ prop: string }

          @test
          @route("/func1")
          op func1(@body body: Model2): void;

          @test
          @route("/func2")
          op func2(): Model3;
        }
      `)) as {
        Model1: Model;
        Model2: Model;
        Model3: Model;
        Model4: Model;
        Enum1: Enum;
        Enum2: Enum;
      };

      strictEqual(getUsage(runner.context, Model1), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Model2), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Model3), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Model4), UsageFlags.None);
      strictEqual(getUsage(runner.context, Enum1), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Enum2), UsageFlags.None);
    });

    it("wrong usage value", async () => {
      const diagnostics = await runner.diagnose(`
        @test
        @usage(1)
        model Model1{}
      `);

      expectDiagnostics(diagnostics, {
        code: "invalid-argument",
      });
    });

    it("usage propagation", async () => {
      const { Fish, Shark, Salmon, SawShark, Origin } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @discriminator("kind")
          @test
          model Fish {
            age: int32;
          }

          @discriminator("sharktype")
          @test
          @usage(Usage.input)
          model Shark extends Fish {
            kind: "shark";
            origin: Origin;
          }

          @test
          model Salmon extends Fish {
            kind: "salmon";
          }

          @test
          model SawShark extends Shark {
            sharktype: "saw";
          }

          @test
          model Origin {
            country: string;
            city: string;
            manufacture: string;
          }

          @get
          op getModel(): Fish;
        }
      `)) as { Fish: Model; Shark: Model; Salmon: Model; SawShark: Model; Origin: Model };

      strictEqual(getUsage(runner.context, Fish), UsageFlags.Output);
      strictEqual(getUsage(runner.context, Shark), UsageFlags.Input | UsageFlags.Output);
      strictEqual(getUsage(runner.context, Salmon), UsageFlags.Output);
      strictEqual(getUsage(runner.context, SawShark), UsageFlags.Output);
      strictEqual(getUsage(runner.context, Origin), UsageFlags.Output);
    });

    it("usage and convenience", async () => {
      const { Fish } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Fish {
            age: int32;
          }

          @put
          @convenientAPI(true)
          op putModel(@body body: Fish): void;

          @get
          @convenientAPI(false)
          op getModel(): Fish;
        }
      `)) as { Fish: Model };

      strictEqual(getUsage(runner.context, Fish), UsageFlags.Input);

      const { Dog } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Dog {
            age: int32;
          }

          @put
          @convenientAPI(false)
          op putModel(@body body: Dog): void;

          @get
          @convenientAPI(true)
          op getModel(): Dog;
        }
      `)) as { Dog: Model };

      strictEqual(getUsage(runner.context, Dog), UsageFlags.Output);
    });

    it("patch usage", async () => {
      const { PatchModel, JsonMergePatchModel } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model PatchModel {
            age: int32;
          }

          @test
          model JsonMergePatchModel {
            prop: string
          }

          @patch
          @route("/patch")
          op patchModel(@body body: PatchModel): void;

          @patch
          @route("/jsonMergePatch")
          op jsonMergePatchModel(@body body: JsonMergePatchModel, @header contentType: "application/merge-patch+json"): void;
        }
      `)) as { PatchModel: Model; JsonMergePatchModel: Model };

      strictEqual(getUsage(runner.context, PatchModel), UsageFlags.Input);
      strictEqual(
        getUsage(runner.context, JsonMergePatchModel),
        UsageFlags.JsonMergePatch | UsageFlags.Input
      );
    });
  });

  describe("@flattenProperty", () => {
    it("marks a model property to be flattened with suppression of deprecation warning", async () => {
      await runner.compileWithBuiltInService(`
        model Model1{
          #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
          @flattenProperty
          child: Model2;
        }

        @test
        model Model2{}

        @test
        @route("/func1")
        op func1(@body body: Model1): void;
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 2);
      const model1 = models.find((x) => x.name === "Model1")!;
      strictEqual(model1.kind, "model");
      strictEqual(model1.properties.length, 1);
      const childProperty = model1.properties[0];
      strictEqual(childProperty.kind, "property");
      strictEqual(childProperty.flatten, true);
    });

    it("doesn't mark a un-flattened model property", async () => {
      await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Model1{
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);
      const models = getAllModels(runner.context);
      strictEqual(models.length, 2);
      const model1 = models.find((x) => x.name === "Model1")!;
      strictEqual(model1.kind, "model");
      strictEqual(model1.properties.length, 1);
      const childProperty = model1.properties[0];
      strictEqual(childProperty.kind, "property");
      strictEqual(childProperty.flatten, false);
    });

    it("throws deprecation warning if not suppressed", async () => {
      const diagnostics = await runner.diagnose(`
        @service({})
        @test namespace MyService {
          @test
          model Model1{
            @flattenProperty
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "deprecated",
      });
    });

    it("throws error when used on other targets", async () => {
      const diagnostics = await runner.diagnose(`
        @service({})
        @test namespace MyService {
          @test
          @flattenProperty
          model Model1{
            child: Model2;
          }

          @test
          model Model2{}

          @test
          @route("/func1")
          op func1(@body body: Model1): void;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "decorator-wrong-target",
      });
    });
  });

  describe("@clientName", () => {
    it("carry over", async () => {
      const { Test1, Test2, func1, func2 } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          @clientName("Test1Rename")
          model Test1{}

          @test
          model Test2 is Test1{}

          @test
          @route("/func1")
          @clientName("func1Rename")
          op func1(): void;

          @test
          @route("/func2")
          op func2 is func1;
        }
      `)) as { Test1: Model; Test2: Model; func1: Operation; func2: Operation };

      strictEqual(getClientNameOverride(runner.context, Test1), "Test1Rename");
      strictEqual(getClientNameOverride(runner.context, Test2), undefined);
      strictEqual(getClientNameOverride(runner.context, func1), "func1Rename");
      strictEqual(getClientNameOverride(runner.context, func2), undefined);
    });

    it("augment carry over", async () => {
      const { Test1, Test2, func1, func2 } = (await runner.compileWithCustomization(
        `
        @service({})
        @test namespace MyService {
          @test
          model Test1{}

          @test
          model Test2 is Test1{}

          @test
          @route("/func1")
          op func1(): void;

          @test
          @route("/func2")
          op func2 is func1;
        }
      `,
        `
        namespace Customizations;

        @@clientName(MyService.Test1, "Test1Rename");
        @@clientName(MyService.func1, "func1Rename");
      `
      )) as { Test1: Model; Test2: Model; func1: Operation; func2: Operation };

      strictEqual(getClientNameOverride(runner.context, Test1), "Test1Rename");
      strictEqual(getClientNameOverride(runner.context, Test2), undefined);
      strictEqual(getClientNameOverride(runner.context, func1), "func1Rename");
      strictEqual(getClientNameOverride(runner.context, func2), undefined);
    });

    it("@clientName with scope of versioning", async () => {
      const testCode = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
        }
        
        @clientName("TestJava", "java")
        @clientName("TestCSharp", "csharp")
        model Test {}
        op test(@body body: Test): void;
      `;

      // java
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestJava");
      }

      // csharp
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestCSharp");
      }

      // python
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compile(testCode);
        strictEqual(runner.context.sdkPackage.models[0].name, "Test");
      }
    });

    it("augmented @clientName with scope of versioning", async () => {
      const testCode = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
        }
        
        
        model Test {}
        op test(@body body: Test): void;
      `;

      const customization = `
        namespace Customizations;

        @@clientName(Contoso.WidgetManager.Test, "TestCSharp", "csharp");
        @@clientName(Contoso.WidgetManager.Test, "TestJava", "java");
      `;

      // java
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestJava");
      }

      // csharp
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "TestCSharp");
      }

      // python
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        await runner.compileWithCustomization(testCode, customization);
        strictEqual(runner.context.sdkPackage.models[0].name, "Test");
      }
    });

    it("decorator on template parameter", async function () {
      await runner.compileAndDiagnose(`
        @service({})
        namespace MyService;
        
        model ResourceBody<Resource> {
          @body
          resource: Resource;
        }
        
        @post
        op do<Resource extends {}>(...ResourceBody<Resource>): void;
        
        @@clientName(ResourceBody.resource, "body");
        
        model Test {
          id: string;
          prop: string;
        }
        
        op test is do<Test>;
        
      `);

      strictEqual(
        runner.context.sdkPackage.clients[0].methods[0].parameters[0].name,
        "body"
      );
    });
    it("empty client name", async () => {
      const diagnostics = await runner.diagnose(`
        @service({})
        namespace MyService;
        
        @clientName(" ")
        model Test {
          id: string;
          prop: string;
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/empty-client-name",
      });
    });
  });

  describe("versioning projection", () => {
    it("basic default version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(sdkPackage.enums.length, 1);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"]
      );
    });

    it("basic latest version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "latest",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"]
      );
    });

    it("basic v3 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"]
      );
    });

    it("basic v2 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
      `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v2");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type?.kind, "model");
      strictEqual(sdkPackage.models.length, 3);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2"]);
      const name = widget?.properties.find((x) => x.name === "name");
      ok(name);
      deepStrictEqual(name.apiVersions, ["v1", "v2"]);
      strictEqual(name.optional, false);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2"]);
      const testModel = sdkPackage.models.find((x) => x.name === "Test");
      ok(testModel);
      deepStrictEqual(testModel.apiVersions, ["v2"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2"]
      );
    });

    it("basic v1 version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
    `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v1");

      strictEqual(sdkPackage.clients[0].methods.length, 1);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1"]);
      strictEqual(sdkPackage.models.length, 2);
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1"]);
      const name = widget?.properties.find((x) => x.name === "name");
      ok(name);
      deepStrictEqual(name.apiVersions, ["v1"]);
      strictEqual(name.optional, false);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1"]
      );
    });

    it("basic all version", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "all",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(`
      @service({
        title: "Contoso Widget Manager",
      })
      @versioned(Contoso.WidgetManager.Versions)
      namespace Contoso.WidgetManager;
      
      enum Versions {
        v1,
        v2,
        v3,
      }
      
      @error
      model Error {
        code: string;
        message?: string;
      }
      
      model Widget {
        @key
        @typeChangedFrom(Versions.v3, string)
        id: int32;
      
        @renamedFrom(Versions.v3, "name")
        @madeOptional(Versions.v3)
        description?: string;
      }

      @added(Versions.v2)
      @removed(Versions.v3)
      model Test {
        prop1: string;
      }

      @route("/test")
      @added(Versions.v2)
      @returnTypeChangedFrom(Versions.v3, Test)
      op test(): void | Error;

      op list(@query apiVersion: string): Widget[] | Error;
      
      @added(Versions.v2)
      @route("/widget/{id}")
      op get(...Resource.KeysOf<Widget>): Widget | Error;
    `);

      const sdkPackage = runnerWithVersion.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);

      const apiVersionParam = sdkPackage.clients[0].initialization.properties.find(
        (x) => x.isApiVersionParam
      );
      ok(apiVersionParam);
      strictEqual(apiVersionParam.clientDefaultValue, "v3");

      strictEqual(sdkPackage.clients[0].methods.length, 3);
      const list = sdkPackage.clients[0].methods.find((x) => x.name === "list");
      ok(list);
      deepStrictEqual(list.apiVersions, ["v1", "v2", "v3"]);
      const get = sdkPackage.clients[0].methods.find((x) => x.name === "get");
      ok(get);
      deepStrictEqual(get.apiVersions, ["v2", "v3"]);
      const test = sdkPackage.clients[0].methods.find((x) => x.name === "test");
      ok(test);
      deepStrictEqual(test.apiVersions, ["v2", "v3"]);
      const returnValue = test.response;
      ok(returnValue);
      strictEqual((returnValue as SdkMethodResponse).type, undefined);
      strictEqual(sdkPackage.models.length, 2); // TODO: since Test model has no usage, we could not get it, need to fix
      const widget = sdkPackage.models.find((x) => x.name === "Widget");
      ok(widget);
      deepStrictEqual(widget.apiVersions, ["v1", "v2", "v3"]);
      strictEqual(widget?.properties.length, 2);
      const id = widget?.properties.find((x) => x.name === "id");
      ok(id);
      deepStrictEqual(id.apiVersions, ["v1", "v2", "v3"]);
      const description = widget?.properties.find((x) => x.name === "description");
      ok(description);
      deepStrictEqual(description.apiVersions, ["v1", "v2", "v3"]); // rename or change type will not change the apiVersions
      strictEqual(description.optional, true);
      const error = sdkPackage.models.find((x) => x.name === "Error");
      ok(error);
      deepStrictEqual(error.apiVersions, ["v1", "v2", "v3"]);
      // const testModel = sdkPackage.models.find(x => x.name === "Test");
      // ok(testModel);
      // deepStrictEqual(testModel.apiVersions, ["v2"]);
      const versions = sdkPackage.enums.find((x) => x.name === "Versions");
      ok(versions);
      deepStrictEqual(
        versions.values.map((v) => v.value),
        ["v1", "v2", "v3"]
      );
    });

    it("model only used in new version", async () => {
      const tsp = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v2023_11_01_preview: "2023-11-01-preview",
          v2023_11_01: "2023-11-01",
        }
        
        model PreviewModel {
          betaFeature: string;
        }
        
        model StableModel {
          stableFeature: string;
        }
        
        @added(Versions.v2023_11_01_preview)
        @removed(Versions.v2023_11_01)
        @route("/preview")
        op previewFunctionality(...PreviewModel): void;
        
        @route("/stable")
        op stableFunctionality(...StableModel): void;
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "2023-11-01-preview",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 2);
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
        "previewFunctionality"
      );
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[1].name,
        "stableFunctionality"
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 2);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "PreviewModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[1].name, "StableModel");

      runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 1);
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
        "stableFunctionality"
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "StableModel");
    });
    it("add client", async () => {
      await runner.compile(
        `
        @service
        @versioned(Versions)
        @server(
          "{endpoint}",
          "Testserver endpoint",
          {
            endpoint: url,
          }
        )
        namespace Versioning;
        enum Versions {
          v1: "v1",
          v2: "v2",
        }
        op test(): void;

        @added(Versions.v2)
        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `
      );
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const versioningClient = sdkPackage.clients.find((x) => x.name === "VersioningClient");
      ok(versioningClient);
      strictEqual(versioningClient.methods.length, 2);

      strictEqual(versioningClient.initialization.properties.length, 1);
      const versioningClientEndpoint = versioningClient.initialization.properties.find(
        (x) => x.kind === "endpoint"
      );
      ok(versioningClientEndpoint);
      deepStrictEqual(versioningClientEndpoint.apiVersions, ["v1", "v2"]);

      const serviceMethod = versioningClient.methods.find((x) => x.kind === "basic");
      ok(serviceMethod);
      strictEqual(serviceMethod.name, "test");
      deepStrictEqual(serviceMethod.apiVersions, ["v1", "v2"]);

      const clientAccessor = versioningClient.methods.find((x) => x.kind === "clientaccessor");
      ok(clientAccessor);
      strictEqual(clientAccessor.name, "getInterfaceV2");
      deepStrictEqual(clientAccessor.apiVersions, ["v2"]);

      const interfaceV2 = versioningClient.methods.find((x) => x.kind === "clientaccessor")
        ?.response as SdkClientType<SdkHttpOperation>;
      ok(interfaceV2);
      strictEqual(interfaceV2.methods.length, 1);

      strictEqual(interfaceV2.initialization.properties.length, 1);
      const interfaceV2Endpoint = interfaceV2.initialization.properties.find(
        (x) => x.kind === "endpoint"
      );
      ok(interfaceV2Endpoint);
      deepStrictEqual(interfaceV2Endpoint.apiVersions, ["v2"]);

      strictEqual(interfaceV2.methods.length, 1);
      const test2Method = interfaceV2.methods.find((x) => x.kind === "basic");
      ok(test2Method);
      strictEqual(test2Method.name, "test2");
      deepStrictEqual(test2Method.apiVersions, ["v2"]);
    });
  });

  describe("versioning impact for apis", () => {
    it("multiple clients", async () => {
      const tsp = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
          v3,
        }
        
        @client({name: "AClient"})
        @test
        interface A {
          @route("/aa")
          op aa(): void;

          @added(Versions.v2)
          @removed(Versions.v3)
          @route("/ab")
          op ab(): void;
        }

        @client({name: "BClient"})
        @added(Versions.v2)
        @test
        interface B {
          @route("/ba")
          op ba(): void;

          @route("/bb")
          op bb(): void;
        }
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      let { A, B } = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      ok(getClient(runnerWithVersion.context, A));
      strictEqual(getClient(runnerWithVersion.context, B), undefined);

      let clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      let aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 1);
      let aa = aOps.find((x) => x.name === "aa");
      ok(aa);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      let result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      A = result.A;
      B = result.B;
      ok(getClient(runnerWithVersion.context, A));
      ok(getClient(runnerWithVersion.context, B));

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 2);
      aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 2);
      aa = aOps.find((x) => x.name === "aa");
      ok(aa);
      const ab = aOps.find((x) => x.name === "ab");
      ok(ab);
      let bClient = clients.find((x) => x.name === "BClient");
      ok(bClient);
      let bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
      strictEqual(bOps.length, 2);
      let ba = bOps.find((x) => x.name === "ba");
      ok(ba);
      let bb = bOps.find((x) => x.name === "bb");
      ok(bb);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      result = (await runnerWithVersion.compile(tsp)) as { A: Interface; B: Interface };
      A = result.A;
      B = result.B;
      ok(getClient(runnerWithVersion.context, A));
      ok(getClient(runnerWithVersion.context, B));

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 2);
      aClient = clients.find((x) => x.name === "AClient");
      ok(aClient);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aClient);
      strictEqual(aOps.length, 1);
      aa = aOps.find((x) => x.name === "aa");
      ok(aa);
      bClient = clients.find((x) => x.name === "BClient");
      ok(bClient);
      bOps = listOperationsInOperationGroup(runnerWithVersion.context, bClient);
      strictEqual(bOps.length, 2);
      ba = bOps.find((x) => x.name === "ba");
      ok(ba);
      bb = bOps.find((x) => x.name === "bb");
      ok(bb);
    });

    it("multiple operation groups", async () => {
      const tsp = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
          v2,
          v3,
        }
        
        namespace A {
          @route("/a")
          op a(): void;
        }

        @added(Versions.v2)
        @removed(Versions.v3)
        interface B {
          @route("/b")
          op b(): void;
        }
      `;

      let runnerWithVersion = await createSdkTestRunner({
        "api-version": "v1",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      let clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      let client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      let ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 1);
      let aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      let aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      let a = aOps.find((x) => x.name === "a");
      ok(a);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v2",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 2);
      aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      a = aOps.find((x) => x.name === "a");
      ok(a);
      const bOp = ops.find((x) => x.type.name === "B");
      ok(bOp);
      const bOps = listOperationsInOperationGroup(runnerWithVersion.context, bOp);
      strictEqual(bOps.length, 1);
      const b = bOps.find((x) => x.name === "b");
      ok(b);

      runnerWithVersion = await createSdkTestRunner({
        "api-version": "v3",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      client = clients.find((x) => x.name === "WidgetManagerClient");
      ok(client);
      ops = listOperationGroups(runnerWithVersion.context, client);
      strictEqual(ops.length, 1);
      aOp = ops.find((x) => x.type.name === "A");
      ok(aOp);
      aOps = listOperationsInOperationGroup(runnerWithVersion.context, aOp);
      strictEqual(aOps.length, 1);
      a = aOps.find((x) => x.name === "a");
      ok(a);
    });
  });
});
