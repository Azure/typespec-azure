import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { ignoreDiagnostics, Interface, Namespace, Operation } from "@typespec/compiler";
import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import {
  getClient,
  getOperationGroup,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "../../src/decorators.js";
import { SdkClientType, SdkHttpOperation, SdkOperationGroup } from "../../src/interfaces.js";
import { getCrossLanguageDefinitionId, getCrossLanguagePackageId } from "../../src/public-utils.js";
import { requireClientSuffixRule } from "../../src/rules/require-client-suffix.rule.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
  tester = createLinterRuleTester(
    runner,
    requireClientSuffixRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("@client", () => {
  it("mark an namespace as a client", async () => {
    const { MyClient } = await runner.compile(`
        @client
        @service
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
        @service
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
    await tester
      .expect(
        `
        @client
        @service
        @test namespace MyService;
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MyService" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });

  it("emit diagnostic if the client explicit name doesn't ends with Client", async () => {
    await tester
      .expect(
        `
        @client({name: "MySDK"})
        @service
        @test namespace MyService;
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MySDK" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });

  it("@client with scope", async () => {
    const testCode = `
        @service(#{
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
        @service
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
        @service
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
        hasOperations: false,
      },
    ]);
  });

  it("mark an interface as an operationGroup", async () => {
    const { MyClient, MyGroup } = (await runner.compile(`
        @client
        @service
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
        hasOperations: false,
      },
    ]);
  });

  it("list operations at root of client outside of operation group", async () => {
    const { MyClient } = (await runner.compile(`
        @client
        @service
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
        @service
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
        @service
        @test namespace MyClient;

        @test op one(): void;
      `)) as { one: Operation };

    strictEqual(getCrossLanguageDefinitionId(runner.context, one), "MyClient.one");
  });

  it("crossLanguageDefinitionId with interface", async () => {
    const { one } = (await runner.compile(`
        @client
        @service
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
        @service
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
        @service
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
        @service
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
        @service(#{
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
        @service
        @test
        namespace MyService;
        op foo(): void;
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
    strictEqual(mainClient.methods.length, 0);

    const client = mainClient.children![0] as SdkClientType<SdkHttpOperation>;
    strictEqual(client.kind, "client");
    strictEqual(client.name, "ClientModel");
  });

  it("@operationGroup with diagnostics", async () => {
    const testCode = [
      `
        @service(#{
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

    // java should only have one root client
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-java" });
      const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
        testCode[0],
        testCode[1],
      );
      expectDiagnosticEmpty(diagnostics);
      const client = listClients(runner.context)[0];
      strictEqual(listOperationGroups(runner.context, client).length, 0);
    }

    // python should have one sub client
    {
      const runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
      const [_, diagnostics] = await runner.compileAndDiagnoseWithCustomization(
        testCode[0],
        testCode[1],
      );
      expectDiagnosticEmpty(diagnostics);
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
      expectDiagnosticEmpty(diagnostics);
      const client = listClients(runner.context)[0];
      strictEqual(listOperationGroups(runner.context, client).length, 0);
    }
  });
});

describe("listOperationGroups without @client and @operationGroup", () => {
  it("list operations in namespace or interface", async () => {
    await runner.compile(`
        @service
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
        @service
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
      hasOperations: true,
    };

    const aag: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AAG,
      groupPath: "AClient.AA.AAG",
      service: A,
      hasOperations: true,
    };

    const aabGroup1: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AABGroup1,
      groupPath: "AClient.AA.AAB.AABGroup1",
      service: A,
      hasOperations: true,
    };

    const aabGroup2: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AABGroup2,
      groupPath: "AClient.AA.AAB.AABGroup2",
      service: A,
      hasOperations: false,
    };

    const aaa: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AAA,
      groupPath: "AClient.AA.AAA",
      service: A,
      hasOperations: false,
    };

    const aab: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AAB,
      subOperationGroups: [aabGroup1, aabGroup2],
      groupPath: "AClient.AA.AAB",
      service: A,
      hasOperations: true,
    };

    const aa: SdkOperationGroup = {
      kind: "SdkOperationGroup",
      type: AA,
      subOperationGroups: [aaa, aab, aag],
      groupPath: "AClient.AA",
      service: A,
      hasOperations: true,
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
    deepStrictEqual(allOperationGroups, [aab, aag]);
    allOperationGroups = listOperationGroups(runner.context, aaa);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(runner.context, aab);
    deepStrictEqual(allOperationGroups, [aabGroup1]);
    allOperationGroups = listOperationGroups(runner.context, aag);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(runner.context, aabGroup1);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(runner.context, aabGroup2);
    deepStrictEqual(allOperationGroups, []);
    deepStrictEqual(listOperationGroups(runner.context, ag), []);

    allOperationGroups = listOperationGroups(runner.context, client, true);
    deepStrictEqual(allOperationGroups, [aa, ag, aab, aag, aabGroup1]);
    allOperationGroups = listOperationGroups(runner.context, aa, true);
    deepStrictEqual(allOperationGroups, [aab, aag, aabGroup1]);
    allOperationGroups = listOperationGroups(runner.context, aaa, true);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(runner.context, aab, true);
    deepStrictEqual(allOperationGroups, [aabGroup1]);
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
        @service
        @test namespace MyClient;

        @route("/root1") op atRoot1(): void;

        @test interface MyGroup {
          @route("/root2") op atRoot2(): void;
        }
      `)) as { MyGroup: Interface; MyClient: Namespace };

    deepStrictEqual(getOperationGroup(runner.context, MyGroup), {
      kind: "SdkOperationGroup",
      type: MyGroup,
      groupPath: "MyClient.MyGroup",
      service: MyClient,
      hasOperations: true,
    });

    const clients = listClients(runner.context);
    const ogs = listOperationGroups(runner.context, clients[0]);
    deepStrictEqual(ogs.length, 1);
  });

  it("empty namespaces and interfaces", async () => {
    await runner.compile(`
        @service
        @test
        namespace MyService {
          namespace A {
            namespace B {
              interface B1 {
                @route("/b1") op b1(): void;
              }
              interface B2 {
                @route("/b2") op b2(): void;
              }
            }

            interface A1 {
              @route("/a1") op a1(): void;
            }
            interface A2 {
              @route("/a2") op a2(): void;
            }
          }
          namespace C {
            interface C1 {
              @route("/c1") op c1(): void;
            }
          }
          namespace D {}
          namespace E {
            namespace F {
             @route("/f") op f(): void;
            }
          }
          namespace G {
            namespace H {
              interface H1 {
                @route("/h1") op h1(): void;
              }
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
    deepStrictEqual(countFromProperty, 13);
    deepStrictEqual(countFromList, 13);
  });
});

describe("client hierarchy", () => {
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
        @service
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
        @service
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
        @service
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
        @service
        namespace Test1Client {
          namespace B {
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
    strictEqual(listOperationsInOperationGroup(runner.context, b).length, 0);

    const c = b.subOperationGroups?.find((x) => x.type.name === "C");
    ok(c);
    strictEqual(c.subOperationGroups, undefined);
    strictEqual(listOperationGroups(runner.context, c).length, 0);
    strictEqual(c.groupPath, "Test1Client.B.C");
    strictEqual(listOperationsInOperationGroup(runner.context, c).length, 1);
  });

  it("rename client name", async () => {
    await runner.compileWithCustomization(
      `
        @service
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
        @service
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
        @service
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
        namespace Customizations;
        
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
        @service
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
        @service
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
        @service
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
        @service
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

  it("rearrange operations with scope", async () => {
    await runner.compile(`
        @service
        @server(
          "{endpoint}/face/{apiVersion}",
          "Azure AI Face API",
          {
            endpoint: url,
            @path
            apiVersion: Versions,
          }
        )
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

        enum Versions {
          v1,
          v2,
        }

        @client({
          name: "Test1Client",
          service: A
        }, "python")
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

  it("triple-nested with core and versioning", async () => {
    const runnerWithCore = await createSdkTestRunner({
      librariesToAdd: [AzureCoreTestLibrary],
      autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      emitterName: "@azure-tools/typespec-java",
    });
    await runnerWithCore.compile(
      `
      @service
      @versioned(StorageVersions)
      @clientName("BlobServiceClient")
      namespace Storage.Blob {
        enum StorageVersions {
          @doc("The 2025-01-05 version of the Azure.Storage.Blob service.")
          @useDependency(Azure.Core.Versions.v1_0_Preview_2)
          v2025_01_05: "2025-01-05",
        }

        op ServiceOperation<
          TParams extends TypeSpec.Reflection.Model = {},
          TResponse extends TypeSpec.Reflection.Model = {}
        > is Foundations.Operation<
          TParams,
          TResponse
        >;

        @route("storage/blob") op storageBlob is ServiceOperation;
        @clientName("ContainerClient")
        namespace Container {
          @route("storage/blob/container") op storageBlobContainer is ServiceOperation;
          @clientName("BlobClient")
          namespace Blob {
            @route("storage/blob/container/blob") op storageBlobContainerBlob is ServiceOperation;
          }
        }        
      }
      `,
    );

    const sdkPackage = runnerWithCore.context.sdkPackage;
    const containerClient = sdkPackage.clients[0].children?.[0];
    strictEqual(containerClient?.kind, "client");
    const blobClient = containerClient.children?.[0];
    strictEqual(blobClient?.kind, "client");
    const apiVersionParam = blobClient.clientInitialization.parameters.find(
      (x) => x.name === "apiVersion",
    );
    ok(apiVersionParam);
    deepStrictEqual(apiVersionParam.apiVersions, ["2025-01-05"]);
    strictEqual(apiVersionParam.clientDefaultValue, "2025-01-05");
  });
});
