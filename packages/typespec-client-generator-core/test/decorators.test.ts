import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Interface, Model, Namespace, Operation, ignoreDiagnostics } from "@typespec/compiler";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  createSdkContext,
  getAccess,
  getClient,
  getClientNameOverride,
  getOperationGroup,
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
          crossLanguageDefinitionId: "MyService",
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
        getClient(runner.context, MyClient)!,
      );
      deepStrictEqual(
        operations.map((x) => x.name),
        ["atRoot1", "atRoot2"],
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
        ["inOpGroup1", "inOpGroup2"],
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
        "MyClient.SubNamespace.Widgets.one",
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
        "My.Package.Namespace",
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
          crossLanguageDefinitionId: "MyService",
        },
      ]);
    });

    it("with @clientName", async () => {
      await runner.compileWithBuiltInService(
        `
        @operationGroup
        @clientName("ClientModel")
        interface Model {
          op foo(): void;
        }
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const mainClient = sdkPackage.clients[0];
      strictEqual(mainClient.methods.length, 1);

      const clientAccessor = mainClient.methods[0];
      strictEqual(clientAccessor.kind, "clientaccessor");
      strictEqual(clientAccessor.response.kind, "client");
      strictEqual(clientAccessor.response.name, "ClientModel");
    });

    it("@operationGroup with diagnostics", async () => {
      const testCode = [
        `
        @service({
          title: "DeviceUpdateClient",
        })
        namespace Azure.IoT.DeviceUpdate;
      `,
        `
        @client({name: "DeviceUpdateClient", service: Azure.IoT.DeviceUpdate}, "python")
        namespace Customizations;

        @operationGroup("java")
        interface SubClientOnlyForJava {
        }

        @operationGroup("python")
        interface SubClientOnlyForPython {
        }
      `,
      ];

      // java should report disgnostics
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
        const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
          testCode[0],
          testCode[1],
        );
        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/client-service",
        });
      }

      // python should have one sub client
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
        const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
          testCode[0],
          testCode[1],
        );
        expectDiagnostics(diagnostics, {});
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 1);
      }

      // csharp should only have one root client
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
          testCode[0],
          testCode[1],
        );
        expectDiagnostics(diagnostics, {});
        const client = listClients(runner.context)[0];
        strictEqual(listOperationGroups(runner.context, client).length, 0);
      }
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
        ["atRoot1", "atRoot2"],
      );

      const ogs = listOperationGroups(runner.context, clients[0]);
      strictEqual(ogs.length, 1);
      strictEqual(ogs[0].subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, ogs[0]).length, 0);

      operations = listOperationsInOperationGroup(runner.context, ogs[0]);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["inOpGroup1", "inOpGroup2"],
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
        ["a_o1", "a_o2"],
      );

      let group = getOperationGroup(runner.context, AA);
      deepStrictEqual(group, aa);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aa_o1", "aa_o2"],
      );

      group = getOperationGroup(runner.context, AAA);
      deepStrictEqual(group, aaa);
      deepStrictEqual(listOperationsInOperationGroup(runner.context, group), []);

      group = getOperationGroup(runner.context, AAB);
      deepStrictEqual(group, aab);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aab_o1", "aab_o2"],
      );

      group = getOperationGroup(runner.context, AG);
      deepStrictEqual(group, ag);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["a_g_o1", "a_g_o2"],
      );

      group = getOperationGroup(runner.context, AAG);
      deepStrictEqual(group, aag);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aa_g_o1", "aa_g_o2"],
      );

      group = getOperationGroup(runner.context, AABGroup1);
      deepStrictEqual(group, aabGroup1);
      operations = listOperationsInOperationGroup(runner.context, group);
      deepStrictEqual(
        operations.map((x) => x.name),
        ["aab_g1_o1", "aab_g1_o2"],
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
        ],
      );
      allOperations = listOperationsInOperationGroup(runner.context, aa, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aa_o1", "aa_o2", "aab_o1", "aab_o2", "aab_g1_o1", "aab_g1_o2", "aa_g_o1", "aa_g_o2"],
      );
      allOperations = listOperationsInOperationGroup(runner.context, aaa, true);
      deepStrictEqual(allOperations, []);
      allOperations = listOperationsInOperationGroup(runner.context, aab, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aab_o1", "aab_o2", "aab_g1_o1", "aab_g1_o2"],
      );
      allOperations = listOperationsInOperationGroup(runner.context, aag, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aa_g_o1", "aa_g_o2"],
      );
      allOperations = listOperationsInOperationGroup(runner.context, aabGroup1, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["aab_g1_o1", "aab_g1_o2"],
      );
      allOperations = listOperationsInOperationGroup(runner.context, aabGroup2, true);
      deepStrictEqual(allOperations, []);
      allOperations = listOperationsInOperationGroup(runner.context, ag, true);
      deepStrictEqual(
        allOperations.map((x) => x.name),
        ["a_g_o1", "a_g_o2"],
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
        ["x"],
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);

      const client2 = clients.find((x) => x.name === "Test2Client");
      ok(client2);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client2).map((x) => x.name),
        ["y"],
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
        ["x"],
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
        ["x"],
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
        ["x"],
      );

      const c = b.subOperationGroups?.find((x) => x.type.name === "C");
      ok(c);
      strictEqual(c.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, c).length, 0);
      strictEqual(c.groupPath, "Test1Client.BRename.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, c).map((x) => x.name),
        ["y"],
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
      `,
      );

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 1);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"],
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
      `,
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
        ["x"],
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
      `,
      );

      const clients = listClients(runner.context);
      deepStrictEqual(clients.length, 2);

      const client1 = clients.find((x) => x.name === "Test1Client");
      ok(client1);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client1).map((x) => x.name),
        ["x"],
      );
      deepStrictEqual(listOperationGroups(runner.context, client1).length, 0);

      const client2 = clients.find((x) => x.name === "Test2Client");
      ok(client2);
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, client2).map((x) => x.name),
        ["y"],
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
      `,
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
        ["x"],
      );

      const og2 = clientOgs.find((x) => x.type.name === "C");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "AClient.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["y"],
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
      `,
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
        ["feed"],
      );

      const og2 = clientOgs.find((x) => x.type.name === "OpGrp2");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "PetStoreClient.OpGrp2");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["pet"],
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
      `,
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
        ["x"],
      );

      const og2 = clientOgs.find((x) => x.type.name === "C");
      ok(og2);
      strictEqual(og2.subOperationGroups, undefined);
      strictEqual(listOperationGroups(runner.context, og2).length, 0);
      strictEqual(og2.groupPath, "AClient.C");
      deepStrictEqual(
        listOperationsInOperationGroup(runner.context, og2).map((x) => x.name),
        ["y"],
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
        ["x", "y"],
      );
    });
  });

  async function protocolAPITestHelper(
    runner: SdkTestRunner,
    protocolValue: boolean,
    globalValue: boolean,
  ): Promise<void> {
    const testCode = `
          @protocolAPI(${protocolValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compileWithBuiltInService(testCode);

    const actual = shouldGenerateProtocol(
      await createSdkContextTestHelper(runner.context.program, {
        generateProtocolMethods: globalValue,
        generateConvenienceMethods: false,
      }),
      test as Operation,
    );

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(actual, protocolValue);
    strictEqual(method.generateProtocol, protocolValue);
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
    globalValue: boolean,
  ): Promise<void> {
    const testCode = `
          @convenientAPI(${convenientValue})
          @test
          op test(): void;
        `;
    const { test } = await runner.compileWithBuiltInService(testCode);

    const actual = shouldGenerateConvenient(
      await createSdkContextTestHelper(runner.program, {
        generateProtocolMethods: false,
        generateConvenienceMethods: globalValue,
      }),
      test as Operation,
    );
    strictEqual(actual, convenientValue);

    const method = runner.context.sdkPackage.clients[0].methods[0];
    strictEqual(method.name, "test");
    strictEqual(method.kind, "basic");
    strictEqual(method.generateConvenient, convenientValue);
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
      const { test } = await runner.compileWithBuiltInService(`
        @convenientAPI
        @test
        op test(): void;
      `);

      const actual = shouldGenerateConvenient(
        await createSdkContextTestHelper(runner.program, {
          generateProtocolMethods: false,
          generateConvenienceMethods: false,
        }),
        test as Operation,
      );
      strictEqual(actual, true);
      const method = runner.context.sdkPackage.clients[0].methods[0];
      strictEqual(method.name, "test");
      strictEqual(method.kind, "basic");
      strictEqual(method.generateConvenient, true);
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

        const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };

        const method = runner.context.sdkPackage.clients[0].methods[0];
        strictEqual(method.name, "test");
        strictEqual(method.kind, "basic");

        strictEqual(shouldGenerateProtocol(runner.context, test), true);
        strictEqual(method.generateProtocol, true);

        strictEqual(
          shouldGenerateConvenient(runner.context, test),
          false,
          "convenientAPI should be false for java",
        );
        strictEqual(method.generateConvenient, false, "convenientAPI should be false for java");
      }

      // csharp should get protocolAPI=false and convenientAPI=true
      {
        const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-csharp" });
        const { test } = (await runner.compileWithBuiltInService(testCode)) as { test: Operation };
        const method = runner.context.sdkPackage.clients[0].methods[0];
        strictEqual(method.name, "test");
        strictEqual(method.kind, "basic");

        strictEqual(
          shouldGenerateProtocol(runner.context, test),
          false,
          "protocolAPI should be false for csharp",
        );
        strictEqual(method.generateProtocol, false, "protocolAPI should be false for csharp");

        strictEqual(shouldGenerateConvenient(runner.context, test), true);
        strictEqual(method.generateConvenient, true);
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

    it("throws error when used on a polymorphism type", async () => {
      const diagnostics = await runner.diagnose(`
        @service
        @test namespace MyService {
          #suppress "deprecated" "@flattenProperty decorator is not recommended to use."
          @test
          model Model1{
            @flattenProperty
            child: Model2;
          }

          @test
          @discriminator("kind")
          model Model2{
            kind: string;
          }
        }
      `);

      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/flatten-polymorphism",
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
      `,
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

      strictEqual(runner.context.sdkPackage.clients[0].methods[0].parameters[0].name, "body");
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

    it("duplicate model client name with a random language scope", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      @clientName("Test", "random")
      model Widget {
        @key
        id: int32;
      }

      model Test {
        prop1: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "random"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "random"',
        },
      ]);
    });

    it("duplicate model, enum, union client name with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("B")
      enum A {
        one
      }

      model B {}

      @clientName("B")
      union C {}
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate operation with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("b")
      @route("/a")
      op a(): void;

      @route("/b")
      op b(): void;
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate operation in interface with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      interface C {
        @clientName("b")
        @route("/a")
        op a(): void;

        @route("/b")
        op b(): void;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate scalar with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
        
      @clientName("b")
      scalar a extends string;

      scalar b extends string;
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate interface with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      @clientName("B")
      @route("/a")
      interface A {
      }

      @route("/b")
      interface B {
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model property with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      model A {
        @clientName("prop2")
        prop1: string;
        prop2: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "prop2" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "prop2" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate enum member with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;

      enum A {
        @clientName("two")
        one,
        two
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "two" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "two" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate union variant with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace Contoso.WidgetManager;

        union Foo { 
          @clientName("b")
          a: {}, 
          b: {} 
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "b" is duplicated in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "b" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate namespace with all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace A{
          namespace B {}
          @clientName("B")
          namespace C {}
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate enum and model within nested namespace for all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        @service
        namespace A{
          namespace B {
            @clientName("B")
            enum A {
              one
            }

            model B {}
          }

          @clientName("B")
          model A {}
        }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "B" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "B" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model with model only generation for all language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
        model Foo {}

        @clientName("Foo")
        model Bar {}
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Foo" is defined somewhere causing nameing conflicts in language scope: "AllScopes"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Foo" is duplicated in language scope: "AllScopes"',
        },
      ]);
    });

    it("duplicate model client name with multiple language scopes", async () => {
      const diagnostics = await runner.diagnose(
        `
      @service
      namespace Contoso.WidgetManager;
      
      @clientName("Test", "csharp,python,java")
      model Widget {
        @key
        id: int32;
      }

      @clientName("Widget", "java")
      model Test {
        prop1: string;
      }
      `,
      );

      expectDiagnostics(diagnostics, [
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "csharp"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "csharp"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message: 'Client name: "Test" is duplicated in language scope: "python"',
        },
        {
          code: "@azure-tools/typespec-client-generator-core/duplicate-client-name",
          message:
            'Client name: "Test" is defined somewhere causing nameing conflicts in language scope: "python"',
        },
      ]);
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
        (x) => x.isApiVersionParam,
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
        ["v1", "v2", "v3"],
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
        (x) => x.isApiVersionParam,
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
        ["v1", "v2", "v3"],
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
        (x) => x.isApiVersionParam,
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
        ["v1", "v2", "v3"],
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
        (x) => x.isApiVersionParam,
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
        ["v1", "v2"],
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
        (x) => x.isApiVersionParam,
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
        ["v1"],
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
        (x) => x.isApiVersionParam,
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
        ["v1", "v2", "v3"],
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
        "previewFunctionality",
      );
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[1].name,
        "stableFunctionality",
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 2);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "PreviewModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
      strictEqual(runnerWithVersion.context.sdkPackage.models[1].name, "StableModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[1].access, "internal");

      runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);

      strictEqual(runnerWithVersion.context.sdkPackage.clients.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.clients[0].methods.length, 1);
      strictEqual(
        runnerWithVersion.context.sdkPackage.clients[0].methods[0].name,
        "stableFunctionality",
      );
      strictEqual(runnerWithVersion.context.sdkPackage.models.length, 1);
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].name, "StableModel");
      strictEqual(runnerWithVersion.context.sdkPackage.models[0].access, "internal");
      strictEqual(
        runnerWithVersion.context.sdkPackage.models[0].usage,
        UsageFlags.Spread | UsageFlags.Json,
      );
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
        `,
      );
      const sdkPackage = runner.context.sdkPackage;
      strictEqual(sdkPackage.clients.length, 1);
      const versioningClient = sdkPackage.clients.find((x) => x.name === "VersioningClient");
      ok(versioningClient);
      strictEqual(versioningClient.methods.length, 2);

      strictEqual(versioningClient.initialization.properties.length, 1);
      const versioningClientEndpoint = versioningClient.initialization.properties.find(
        (x) => x.kind === "endpoint",
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
        (x) => x.kind === "endpoint",
      );
      ok(interfaceV2Endpoint);
      deepStrictEqual(interfaceV2Endpoint.apiVersions, ["v2"]);

      strictEqual(interfaceV2.methods.length, 1);
      const test2Method = interfaceV2.methods.find((x) => x.kind === "basic");
      ok(test2Method);
      strictEqual(test2Method.name, "test2");
      deepStrictEqual(test2Method.apiVersions, ["v2"]);
    });
    it("default latest GA version with preview", async () => {
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
          v2022_10_01_preview: "2022-10-01-preview",
          v2024_10_01: "2024-10-01",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 1);
      strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
    });
    it("default latest preview version with GA", async () => {
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
          v2024_10_01: "2024-10-01",
          v2024_11_01_preview: "2024-11-01-preview",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runner.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 2);
      strictEqual(sdkVersionsEnum.values[0].value, "2024-10-01");
      strictEqual(sdkVersionsEnum.values[1].value, "2024-11-01-preview");
    });

    it("specify api version with preview filter", async () => {
      const runnerWithVersion = await createSdkTestRunner({
        "api-version": "2024-10-01",
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(
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
          v2023_10_01: "2023-10-01",
          v2023_11_01_preview: "2023-11-01-preview",
          v2024_10_01: "2024-10-01",
          v2024_11_01_preview: "2024-11-01-preview",
        }
        op test(): void;

        @route("/interface-v2")
        interface InterfaceV2 {
          @post
          @route("/v2")
          test2(): void;
        }
        `,
      );
      const sdkVersionsEnum = runnerWithVersion.context.sdkPackage.enums[0];
      strictEqual(sdkVersionsEnum.name, "Versions");
      strictEqual(sdkVersionsEnum.usage, UsageFlags.ApiVersionEnum);
      strictEqual(sdkVersionsEnum.values.length, 2);
      strictEqual(sdkVersionsEnum.values[0].value, "2023-10-01");
      strictEqual(sdkVersionsEnum.values[1].value, "2024-10-01");
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

  describe("createSdkContext", () => {
    it("multiple call with versioning", async () => {
      const tsp = `
        @service({
          title: "Contoso Widget Manager",
        })
        @versioned(Contoso.WidgetManager.Versions)
        namespace Contoso.WidgetManager;
        
        enum Versions {
          v1,
        }

        @client({name: "TestClient"})
        @test
        interface Test {}
      `;

      const runnerWithVersion = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-python",
      });

      await runnerWithVersion.compile(tsp);
      let clients = listClients(runnerWithVersion.context);
      strictEqual(clients.length, 1);
      ok(clients[0].type);

      const newSdkContext = await createSdkContext(runnerWithVersion.context.emitContext);
      clients = listClients(newSdkContext);
      strictEqual(clients.length, 1);
      ok(clients[0].type);
    });
  });

  describe("@override", () => {
    it("basic", async () => {
      await runner.compileWithCustomization(
        `
        @service
        namespace MyService;
        model Params {
          foo: string;
          bar: string;
        }

        op func(...Params): void;
        `,
        `
        namespace MyCustomizations;

        op func(params: MyService.Params): void;

        @@override(MyService.func, MyCustomizations.func);
        `,
      );
      const sdkPackage = runner.context.sdkPackage;

      const paramsModel = sdkPackage.models.find((x) => x.name === "Params");
      ok(paramsModel);

      const client = sdkPackage.clients[0];
      strictEqual(client.methods.length, 1);
      const method = client.methods[0];

      strictEqual(method.kind, "basic");
      strictEqual(method.name, "func");
      strictEqual(method.parameters.length, 2);
      const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeParam);
      const paramsParam = method.parameters.find((x) => x.name === "params");
      ok(paramsParam);
      strictEqual(paramsModel, paramsParam.type);

      ok(method.operation.bodyParam);
      strictEqual(method.operation.bodyParam.correspondingMethodParams.length, 1);
      strictEqual(method.operation.bodyParam.correspondingMethodParams[0], paramsParam);
    });

    it("basic with scope", async () => {
      const mainCode = `
        @service
        namespace MyService;
        model Params {
          foo: string;
          bar: string;
        }

        op func(...Params): void;
        `;

      const customizationCode = `
        namespace MyCustomizations;

        op func(params: MyService.Params): void;

        @@override(MyService.func, MyCustomizations.func, "csharp");
        `;
      await runner.compileWithCustomization(mainCode, customizationCode);
      // runner has python scope, so shouldn't be overridden

      ok(runner.context.sdkPackage.models.find((x) => x.name === "Params"));
      const sdkPackage = runner.context.sdkPackage;
      const client = sdkPackage.clients[0];
      strictEqual(client.methods.length, 1);
      const method = client.methods[0];
      strictEqual(method.kind, "basic");
      strictEqual(method.name, "func");
      strictEqual(method.parameters.length, 3);

      const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeParam);

      const fooParam = method.parameters.find((x) => x.name === "foo");
      ok(fooParam);

      const barParam = method.parameters.find((x) => x.name === "bar");
      ok(barParam);

      const httpOp = method.operation;
      strictEqual(httpOp.parameters.length, 1);
      strictEqual(httpOp.parameters[0].correspondingMethodParams[0], contentTypeParam);

      ok(httpOp.bodyParam);
      strictEqual(httpOp.bodyParam.correspondingMethodParams.length, 2);
      strictEqual(httpOp.bodyParam.correspondingMethodParams[0], fooParam);
      strictEqual(httpOp.bodyParam.correspondingMethodParams[1], barParam);

      const runnerWithCsharp = await createSdkTestRunner({
        emitterName: "@azure-tools/typespec-csharp",
      });
      await runnerWithCsharp.compileWithCustomization(mainCode, customizationCode);
      ok(runnerWithCsharp.context.sdkPackage.models.find((x) => x.name === "Params"));

      const sdkPackageWithCsharp = runnerWithCsharp.context.sdkPackage;
      strictEqual(sdkPackageWithCsharp.clients.length, 1);

      strictEqual(sdkPackageWithCsharp.clients[0].methods.length, 1);
      const methodWithCsharp = sdkPackageWithCsharp.clients[0].methods[0];
      strictEqual(methodWithCsharp.kind, "basic");
      strictEqual(methodWithCsharp.name, "func");
      strictEqual(methodWithCsharp.parameters.length, 2);
      const contentTypeParamWithCsharp = methodWithCsharp.parameters.find(
        (x) => x.name === "contentType",
      );
      ok(contentTypeParamWithCsharp);

      const paramsParamWithCsharp = methodWithCsharp.parameters.find((x) => x.name === "params");
      ok(paramsParamWithCsharp);
      strictEqual(
        sdkPackageWithCsharp.models.find((x) => x.name === "Params"),
        paramsParamWithCsharp.type,
      );

      const httpOpWithCsharp = methodWithCsharp.operation;
      strictEqual(httpOpWithCsharp.parameters.length, 1);
      strictEqual(
        httpOpWithCsharp.parameters[0].correspondingMethodParams[0],
        contentTypeParamWithCsharp,
      );
      ok(httpOpWithCsharp.bodyParam);
      strictEqual(httpOpWithCsharp.bodyParam.correspondingMethodParams.length, 1);
      strictEqual(httpOpWithCsharp.bodyParam.correspondingMethodParams[0], paramsParamWithCsharp);
    });

    it("regrouping", async () => {
      const mainCode = `
        @service
        namespace MyService;
        model Params {
          foo: string;
          bar: string;
          fooBar: string;
        }

        op func(...Params): void;
        `;

      const customizationCode = `
        namespace MyCustomizations;

        model ParamsCustomized {
          ...PickProperties<MyService.Params, "foo" | "bar">;
        }

        op func(params: MyCustomizations.ParamsCustomized, ...PickProperties<MyService.Params, "fooBar">): void;

        @@override(MyService.func, MyCustomizations.func);
        `;
      await runner.compileWithCustomization(mainCode, customizationCode);
      // runner has python scope, so shouldn't be overridden

      ok(!runner.context.sdkPackage.models.find((x) => x.name === "Params"));
      const sdkPackage = runner.context.sdkPackage;
      const client = sdkPackage.clients[0];
      strictEqual(client.methods.length, 1);
      const method = client.methods[0];
      strictEqual(method.kind, "basic");
      strictEqual(method.name, "func");
      strictEqual(method.parameters.length, 3);

      const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeParam);

      const paramsParam = method.parameters.find((x) => x.name === "params");
      ok(paramsParam);

      const fooBarParam = method.parameters.find((x) => x.name === "fooBar");
      ok(fooBarParam);

      const httpOp = method.operation;
      strictEqual(httpOp.parameters.length, 1);
      strictEqual(httpOp.parameters[0].correspondingMethodParams[0], contentTypeParam);

      ok(httpOp.bodyParam);
      strictEqual(httpOp.bodyParam.correspondingMethodParams.length, 2);
      strictEqual(httpOp.bodyParam.correspondingMethodParams[0], paramsParam);
      strictEqual(httpOp.bodyParam.correspondingMethodParams[1], fooBarParam);
    });

    it("params mismatch", async () => {
      const mainCode = `
        @service
        namespace MyService;
        model Params {
          foo: string;
          bar: string;
        }

        op func(...Params): void;
        `;

      const customizationCode = `
        namespace MyCustomizations;

        model ParamsCustomized {
          foo: string;
          bar: string;
        }

        op func(params: MyCustomizations.ParamsCustomized): void;

        @@override(MyService.func, MyCustomizations.func);
        `;
      const diagnostics = (
        await runner.compileAndDiagnoseWithCustomization(mainCode, customizationCode)
      )[1];
      expectDiagnostics(diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/override-method-parameters-mismatch",
      });
    });

    it("recursive params", async () => {
      await runner.compileWithCustomization(
        `
        @service
        namespace MyService;
        model Params {
          foo: string;
          params: Params[];
        }

        op func(...Params): void;
        `,
        `
        namespace MyCustomizations;

        op func(input: MyService.Params): void;

        @@override(MyService.func, MyCustomizations.func);
        `,
      );
      const sdkPackage = runner.context.sdkPackage;

      const paramsModel = sdkPackage.models.find((x) => x.name === "Params");
      ok(paramsModel);

      const client = sdkPackage.clients[0];
      strictEqual(client.methods.length, 1);
      const method = client.methods[0];

      strictEqual(method.kind, "basic");
      strictEqual(method.name, "func");
      strictEqual(method.parameters.length, 2);
      const contentTypeParam = method.parameters.find((x) => x.name === "contentType");
      ok(contentTypeParam);
      const inputParam = method.parameters.find((x) => x.name === "input");
      ok(inputParam);
      strictEqual(paramsModel, inputParam.type);

      ok(method.operation.bodyParam);
      strictEqual(method.operation.bodyParam.correspondingMethodParams.length, 1);
      strictEqual(method.operation.bodyParam.correspondingMethodParams[0], inputParam);
    });

    it("core template", async () => {
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithCustomization(
        `
        @useDependency(Versions.v1_0_Preview_2)
        @server("http://localhost:3000", "endpoint")
        @service()
        namespace My.Service;

        model Params {
          foo: string;
          params: Params[];
        }

        @route("/template")
        op templateOp is Azure.Core.RpcOperation<
          Params,
          Params
        >;
        `,
        `
        namespace My.Customizations;

        op templateOp(params: My.Service.Params): My.Service.Params;

        @@override(My.Service.templateOp, My.Customizations.templateOp);
        `,
      );
      const sdkPackage = runnerWithCore.context.sdkPackage;
      const method = sdkPackage.clients[0].methods[0];
      strictEqual(method.parameters.length, 3);
      ok(method.parameters.find((x) => x.name === "contentType"));
      ok(method.parameters.find((x) => x.name === "accept"));

      const paramsParam = method.parameters.find((x) => x.name === "params");
      ok(paramsParam);
      strictEqual(paramsParam.type.kind, "model");
      strictEqual(paramsParam.type.name, "Params");
    });
  });
  describe("@clientInitialization", () => {
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
      strictEqual(client.initialization.properties.length, 2);
      const endpoint = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpoint);
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
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
      strictEqual(client.initialization.properties.length, 2);
      ok(client.initialization.properties.find((x) => x.kind === "endpoint"));
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
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
      strictEqual(blobClient.initialization.properties.length, 2);

      ok(blobClient.initialization.properties.find((x) => x.kind === "endpoint"));
      const blobClientBlobInitializationProp = blobClient.initialization.properties.find(
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
      strictEqual(client.initialization.properties.length, 2);
      const endpoint = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpoint);
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
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
      strictEqual(client.initialization.properties.length, 3);
      const endpoint = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpoint);
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
      ok(blobName);
      strictEqual(blobName.clientDefaultValue, undefined);
      strictEqual(blobName.onClient, true);
      strictEqual(blobName.optional, false);

      const containerName = client.initialization.properties.find(
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
      strictEqual(client.initialization.properties.length, 3);
      ok(client.initialization.properties.find((x) => x.kind === "endpoint"));
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
      ok(blobName);
      strictEqual(blobName.clientDefaultValue, undefined);
      strictEqual(blobName.onClient, true);

      const containerName = client.initialization.properties.find(
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
      strictEqual(og.initialization.properties.length, 3);
      ok(og.initialization.properties.find((x) => x.kind === "endpoint"));
      ok(og.initialization.properties.find((x) => x === blobName));
      ok(og.initialization.properties.find((x) => x === containerName));

      const download = og.methods[0];
      strictEqual(download.name, "download");
      strictEqual(download.kind, "basic");
      strictEqual(download.parameters.length, 0);

      const op = download.operation;
      strictEqual(op.parameters.length, 2);
      strictEqual(op.parameters[0].correspondingMethodParams[0], blobName);
      strictEqual(op.parameters[1].correspondingMethodParams[0], containerName);
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
      strictEqual(containerClient.initialization.properties.length, 2);
      ok(containerClient.initialization.properties.find((x) => x.kind === "endpoint"));

      const containerName = containerClient.initialization.properties.find(
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
      strictEqual(blobClient.initialization.properties.length, 3);
      ok(blobClient.initialization.properties.find((x) => x.kind === "endpoint"));

      const containerNameOnBlobClient = blobClient.initialization.properties.find(
        (x) => x.name === "containerName",
      );
      ok(containerNameOnBlobClient);

      const blobName = blobClient.initialization.properties.find((x) => x.name === "blobName");
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
      strictEqual(client.initialization.properties.length, 2);
      const endpoint = client.initialization.properties.find((x) => x.kind === "endpoint");
      ok(endpoint);
      const blobName = client.initialization.properties.find((x) => x.name === "blobName");
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
  });
});
