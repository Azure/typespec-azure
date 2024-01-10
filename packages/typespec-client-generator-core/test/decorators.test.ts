import {
  Enum,
  Interface,
  Model,
  ModelProperty,
  Namespace,
  Operation,
  UsageFlags,
} from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, notStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getAccess,
  getClient,
  getOperationGroup,
  getUsage,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
  shouldFlattenProperty,
  shouldGenerateConvenient,
  shouldGenerateProtocol,
} from "../src/decorators.js";
import { SdkOperationGroup } from "../src/interfaces.js";
import { getCrossLanguageDefinitionId } from "../src/public-utils.js";
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
        { kind: "SdkOperationGroup", type: MyGroup, groupPath: "MyClient.MyGroup" },
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
        { kind: "SdkOperationGroup", type: MyGroup, groupPath: "MyClient.MyGroup" },
      ]);
    });

    it("list operations at root of client outside of operation group", async () => {
      const { MyClient } = (await runner.compile(`
        @client
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;        @route("/root2") op atRoot2(): void;

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

      strictEqual(getCrossLanguageDefinitionId(one), "MyClient.one");
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

      strictEqual(getCrossLanguageDefinitionId(one), "MyClient.Widgets.one");
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

      strictEqual(getCrossLanguageDefinitionId(one), "MyClient.Widgets.one");
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

      strictEqual(getCrossLanguageDefinitionId(one), "MyClient.SubNamespace.Widgets.one");
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
      };

      const aag: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAG,
        groupPath: "AClient.AA.AAG",
      };

      const aabGroup1: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AABGroup1,
        groupPath: "AClient.AA.AAB.AABGroup1",
      };

      const aabGroup2: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AABGroup2,
        groupPath: "AClient.AA.AAB.AABGroup2",
      };

      const aaa: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAA,
        groupPath: "AClient.AA.AAA",
      };

      const aab: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AAB,
        subOperationGroups: [aabGroup1, aabGroup2],
        groupPath: "AClient.AA.AAB",
      };

      const aa: SdkOperationGroup = {
        kind: "SdkOperationGroup",
        type: AA,
        subOperationGroups: [aaa, aab, aag],
        groupPath: "AClient.AA",
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
      const { MyGroup } = (await runner.compile(`
        @service({})
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;

        @test interface MyGroup {
        }
      `)) as { MyGroup: Interface };

      deepStrictEqual(getOperationGroup(runner.context, MyGroup), {
        kind: "SdkOperationGroup",
        type: MyGroup,
        groupPath: "MyClient.MyGroup",
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

    it("nested namespace and interface", async () => {
      await runner.compile(`
        @service({})
        namespace Test1Client {
          @route("/b")
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
      strictEqual(b.groupPath, "Test1Client.B");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, b).map((x) => x.name),
        ["x"]
      );

      const c = b.subOperationGroups?.find((x) => x.type.name === "C");
      ok(c);
      strictEqual(c.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, c).length, 0);
      strictEqual(c.groupPath, "Test1Client.B.C");
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

        @@projectedName(A, "client", "Test1Client");
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

  describe("@protocolAPI", () => {
    for (const protocolValue of [true, false]) {
      for (const globalValue of [true, false]) {
        const testDescription = `mark an operation as protocol ${protocolValue}, pass in sdkContext with generateProtocolMethods ${globalValue}`;
        const testCode = `
          @protocolAPI(${protocolValue})
          @test
          op test(): void;
        `;

        it(testDescription, async () => {
          const { test } = await runner.compile(testCode);

          const actual = shouldGenerateProtocol(
            createSdkContextTestHelper(runner.context.program, {
              generateProtocolMethods: globalValue,
              generateConvenienceMethods: false,
            }),
            test as Operation
          );
          strictEqual(actual, protocolValue);
        });
      }
    }
  });

  describe("@convenientAPI", () => {
    for (const convenientValue of [true, false]) {
      for (const globalValue of [true, false]) {
        const testDescription = `mark an operation as convenient ${convenientValue}, pass in sdkContext with generateConvenienceMethods ${globalValue}`;
        const testCode = `
          @convenientAPI(${convenientValue})
          @test
          op test(): void;
        `;

        it(testDescription, async () => {
          const { test } = await runner.compile(testCode);

          const actual = shouldGenerateConvenient(
            createSdkContextTestHelper(runner.program, {
              generateProtocolMethods: false,
              generateConvenienceMethods: globalValue,
            }),
            test as Operation
          );
          strictEqual(actual, convenientValue);
        });
      }
    }

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
      const { func } = (await runner.compile(`
        @test
        @access(Access.internal, "csharp")
        op func(
          @query("createdAt")
          createdAt: utcDateTime;
        ): void;
      `)) as { func: Operation };

      const actual = getAccess(runner.context, func);
      strictEqual(actual, undefined);
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
      strictEqual(actual, undefined);
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
  });

  describe("@access", () => {
    it("mark an operation as internal", async () => {
      const { test } = (await runner.compile(`
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

      let actual = getAccess(runner.context, test);
      strictEqual(actual, undefined);
      actual = getAccess(runner.context, Test);
      strictEqual(actual, undefined);
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

      let actual = getAccess(runner.context, Test);
      strictEqual(actual, "internal");
      actual = getAccess(runner.context, func);
      strictEqual(actual, undefined);
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

      const func1Actual = getAccess(runner.context, func1);
      strictEqual(func1Actual, "internal");
      const func2Actual = getAccess(runner.context, func2);
      strictEqual(func2Actual, "internal");
      const func3Actual = getAccess(runner.context, func3);
      strictEqual(func3Actual, undefined);
      const func4Actual = getAccess(runner.context, func4);
      strictEqual(func4Actual, "internal");
      const func5Actual = getAccess(runner.context, func5);
      strictEqual(func5Actual, undefined);

      const test1Actual = getAccess(runner.context, Test1);
      strictEqual(test1Actual, "internal");
      const test2Actual = getAccess(runner.context, Test2);
      strictEqual(test2Actual, "internal");
      const test3Actual = getAccess(runner.context, Test3);
      strictEqual(test3Actual, undefined);
      const test4Actual = getAccess(runner.context, Test4);
      strictEqual(test4Actual, "internal");
      const test5Actual = getAccess(runner.context, Test5);
      strictEqual(test5Actual, "internal");
      const test6Actual = getAccess(runner.context, Test6);
      strictEqual(test6Actual, undefined);
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
      strictEqual(getAccess(runner.context, func2), undefined);
      strictEqual(getAccess(runner.context, func3), "internal");
      strictEqual(getAccess(runner.context, func4), undefined);

      strictEqual(getAccess(runner.context, Fish), undefined);
      strictEqual(getAccess(runner.context, Salmon), undefined);
      strictEqual(getAccess(runner.context, Origin), undefined);
      strictEqual(getAccess(runner.context, BaseModel), undefined);
      strictEqual(getAccess(runner.context, ModelA), undefined);
      strictEqual(getAccess(runner.context, ModelB), undefined);
      strictEqual(getAccess(runner.context, ModelC), undefined);
      strictEqual(getAccess(runner.context, ModelD), undefined);
      strictEqual(getAccess(runner.context, ModelE), undefined);
      strictEqual(getAccess(runner.context, ModelF), undefined);
      strictEqual(getAccess(runner.context, EnumA), undefined);

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

      const func1Actual = getAccess(runner.context, func1);
      strictEqual(func1Actual, "internal");
      const func2Actual = getAccess(runner.context, func2);
      strictEqual(func2Actual, undefined);
      const func3Actual = getAccess(runner.context, func3);
      strictEqual(func3Actual, "public");
      const func4Actual = getAccess(runner.context, func4);
      strictEqual(func4Actual, "internal");
      const func5Actual = getAccess(runner.context, func5);
      strictEqual(func5Actual, undefined);
      const func6Actual = getAccess(runner.context, func6);
      strictEqual(func6Actual, "internal");
      const func7Actual = getAccess(runner.context, func7);
      strictEqual(func7Actual, undefined);
      const func8Actual = getAccess(runner.context, func8);
      strictEqual(func8Actual, "public");

      const test1Actual = getAccess(runner.context, Test1);
      strictEqual(test1Actual, "internal");
      const test2Actual = getAccess(runner.context, Test2);
      strictEqual(test2Actual, undefined);
      const test3Actual = getAccess(runner.context, Test3);
      strictEqual(test3Actual, "public");
      const test4Actual = getAccess(runner.context, Test4);
      strictEqual(test4Actual, undefined);
      const test5Actual = getAccess(runner.context, Test5);
      strictEqual(test5Actual, "public");
    });
  });

  describe("@usage", () => {
    it("defaults calculated usage", async () => {
      const { Model1, Model2, Model3, Model4 } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
          model Model1{}

          @test
          model Model2{}

          @test
          model Model3{}

          @test
          model Model4{}

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
          model Model1{}

          @test
          model Model4{}

          @test
          @usage(Usage.output)
          model Model2{}

          @test
          @usage(Usage.input)
          model Model3{}

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
  });

  describe("@flattenProperty", () => {
    it("marks a model property to be flattened with suppression of deprecation warning", async () => {
      const { Model1 } = (await runner.compile(`
        @service({})
        @test namespace MyService {
          @test
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
        }
      `)) as { Model1: Model };

      const childProperty = Model1.properties.get("child");
      notStrictEqual(childProperty, undefined);
      strictEqual(shouldFlattenProperty(runner.context, childProperty as ModelProperty), true);
    });

    it("doesn't mark a un-flattened model property", async () => {
      const { Model1 } = (await runner.compile(`
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
      `)) as { Model1: Model };

      const childProperty = Model1.properties.get("child");
      notStrictEqual(childProperty, undefined);
      strictEqual(shouldFlattenProperty(runner.context, childProperty as ModelProperty), false);
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
});
