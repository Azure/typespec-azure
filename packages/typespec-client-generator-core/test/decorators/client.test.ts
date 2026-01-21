import { ignoreDiagnostics } from "@typespec/compiler";
import {
  createLinterRuleTester,
  expectDiagnosticEmpty,
  expectDiagnostics,
  t,
} from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  getClient,
  getOperationGroup,
  listClients,
  listOperationGroups,
  listOperationsInOperationGroup,
} from "../../src/decorators.js";
import { SdkClientType, SdkHttpOperation } from "../../src/interfaces.js";
import { getCrossLanguageDefinitionId, getCrossLanguagePackageId } from "../../src/public-utils.js";
import { requireClientSuffixRule } from "../../src/rules/require-client-suffix.rule.js";
import {
  AzureCoreTester,
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTester,
  SimpleTesterWithService,
} from "../tester.js";

describe("@client", () => {
  it("mark an namespace as a client", async () => {
    const { program, MyClient } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace ${t.namespace("MyClient")};
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients, [
      {
        kind: "SdkClient",
        name: "MyClient",
        services: [MyClient],
        service: MyClient,
        type: MyClient,
        subOperationGroups: [],
      },
    ]);
  });

  it("mark an interface as a client", async () => {
    const { program, MyService, MyClient } = await SimpleTester.compile(t.code`
        @service
        namespace ${t.namespace("MyService")};
        @client({service: MyService})
        interface ${t.interface("MyClient")} {}
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients, [
      {
        kind: "SdkClient",
        name: "MyClient",
        services: [MyService],
        service: MyService,
        type: MyClient,
        subOperationGroups: [],
      },
    ]);
  });

  it("emit diagnostic if the client namespace doesn't ends with client", async () => {
    const instance = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      instance,
      requireClientSuffixRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester
      .expect(
        `
        @client
        @service
        namespace MyService;
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
    const instance = await SimpleTester.createInstance();
    const tester = createLinterRuleTester(
      instance,
      requireClientSuffixRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await tester
      .expect(
        `
        @client({name: "MySDK"})
        @service
        namespace MyService;
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
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });
      strictEqual(listClients(context).length, 3);
    }

    // csharp should get three clients
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      strictEqual(listClients(context).length, 3);
    }

    // python should get one client
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
      });
      strictEqual(listClients(context).length, 0);
    }

    // typescript should get three clients
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-ts",
      });
      strictEqual(listClients(context).length, 3);
    }
  });
});

describe("listClients without @client", () => {
  it("use service namespace if there is not clients and append Client to service name", async () => {
    const { program, MyService } = await SimpleTester.compile(t.code`
        @service
        namespace ${t.namespace("MyService")};

        op test(): void;
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients, [
      {
        kind: "SdkClient",
        name: "MyServiceClient",
        services: [MyService],
        service: MyService,
        type: MyService,
        subOperationGroups: [],
      },
    ]);
  });
});

describe("@operationGroup", () => {
  it("mark an namespace as an operation group", async () => {
    const { program, MyClient, MyGroup } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace ${t.namespace("MyClient")};

        @operationGroup
        namespace ${t.namespace("MyGroup")} {}
      `);

    const context = await createSdkContextForTester(program);
    const client = getClient(context, MyClient);
    ok(client);
    const groups = listOperationGroups(context, client);
    deepStrictEqual(groups, [
      {
        kind: "SdkOperationGroup",
        type: MyGroup,
        groupPath: "MyClient.MyGroup",
        services: [MyClient],
        service: MyClient,
        subOperationGroups: [],
        parent: client,
      },
    ]);
  });

  it("mark an interface as an operationGroup", async () => {
    const { program, MyClient, MyGroup } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace ${t.namespace("MyClient")};
        @operationGroup
        interface ${t.interface("MyGroup")} {}
      `);

    const context = await createSdkContextForTester(program);
    const client = getClient(context, MyClient);
    ok(client);
    const groups = listOperationGroups(context, client);
    deepStrictEqual(groups, [
      {
        kind: "SdkOperationGroup",
        type: MyGroup,
        groupPath: "MyClient.MyGroup",
        services: [MyClient],
        service: MyClient,
        subOperationGroups: [],
        parent: client,
      },
    ]);
  });

  it("list operations at root of client outside of operation group", async () => {
    const { program, MyClient } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace ${t.namespace("MyClient")};

        @route("/root1") op atRoot1(): void;       
        @route("/root2") op atRoot2(): void;

        @operationGroup
        interface MyGroup {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    const operations = listOperationsInOperationGroup(context, getClient(context, MyClient)!);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["atRoot1", "atRoot2"],
    );
  });

  it("list operations in an operation group", async () => {
    const { program, MyGroup } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace MyClient;

        @route("/root1") op atRoot1(): void;
        @route("/root2") op atRoot2(): void;

        @operationGroup
        interface ${t.interface("MyGroup")} {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    const group = getOperationGroup(context, MyGroup);
    ok(group);
    const operations = listOperationsInOperationGroup(context, group);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["inOpGroup1", "inOpGroup2"],
    );
  });

  it("crossLanguageDefinitionId basic", async () => {
    const { program, one } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace MyClient;

        op ${t.op("one")}(): void;
      `);

    const context = await createSdkContextForTester(program);
    strictEqual(getCrossLanguageDefinitionId(context, one), "MyClient.one");
  });

  it("crossLanguageDefinitionId with interface", async () => {
    const { program, one } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace MyClient;

        interface Widgets {
          op ${t.op("one")}(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    strictEqual(getCrossLanguageDefinitionId(context, one), "MyClient.Widgets.one");
  });

  it("crossLanguageDefinitionId with subnamespace", async () => {
    const { program, one } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace MyClient;

        namespace Widgets {
          op ${t.op("one")}(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    strictEqual(getCrossLanguageDefinitionId(context, one), "MyClient.Widgets.one");
  });

  it("crossLanguageDefinitionId with subnamespace and interface", async () => {
    const { program, one } = await SimpleTester.compile(t.code`
        @client
        @service
        namespace MyClient;

        namespace SubNamespace {
          interface Widgets {
            op ${t.op("one")}(): void;
          }
        }
      `);

    const context = await createSdkContextForTester(program);
    strictEqual(getCrossLanguageDefinitionId(context, one), "MyClient.SubNamespace.Widgets.one");
  });

  it("crossLanguagePackageId", async () => {
    const { program } = await SimpleTester.compile(`
        @client({name: "MyPackageClient"})
        @service
        namespace My.Package.Namespace;

        namespace SubNamespace {
          interface Widgets {
            op one(): void;
          }
        }
      `);
    const context = await createSdkContextForTester(program);
    strictEqual(ignoreDiagnostics(getCrossLanguagePackageId(context)), "My.Package.Namespace");
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
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 3);
    }

    // csharp should get three operation groups
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 3);
    }

    // python should get three operation groups
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 0);
    }

    // typescript should get three operation groups
    {
      const { program } = await SimpleTester.compile(testCode);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-ts",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 3);
    }
  });

  it("use service namespace if there is not clients and append Client to service name", async () => {
    const { program, MyService } = await SimpleTester.compile(t.code`
        @service
        namespace ${t.namespace("MyService")};
        op foo(): void;
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients, [
      {
        kind: "SdkClient",
        name: "MyServiceClient",
        services: [MyService],
        service: MyService,
        type: MyService,
        subOperationGroups: [],
      },
    ]);
  });

  it("with @clientName", async () => {
    const { program } = await SimpleTesterWithService.compile(
      `
        @operationGroup
        @clientName("ClientModel")
        interface Model {
          op foo(): void;
        }
        `,
    );
    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
    strictEqual(sdkPackage.clients.length, 1);
    const mainClient = sdkPackage.clients[0];
    strictEqual(mainClient.methods.length, 0);

    const client = mainClient.children![0] as SdkClientType<SdkHttpOperation>;
    strictEqual(client.kind, "client");
    strictEqual(client.name, "ClientModel");
  });

  it("@operationGroup with different scope", async () => {
    const mainCode = `
        @service(#{
          title: "DeviceUpdateClient",
        })
        namespace Azure.IoT.DeviceUpdate;
      `;
    const clientCode = `
        @client({name: "DeviceUpdateClient", service: Azure.IoT.DeviceUpdate}, "python")
        namespace Customizations;

        @operationGroup("java")
        interface SubClientOnlyForJava {
        }

        @operationGroup("python")
        interface SubClientOnlyForPython {
        }
      `;

    // java should only have one root client
    {
      const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(mainCode, clientCode),
      );
      expectDiagnosticEmpty(diagnostics);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-java",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 0);
    }

    // python should have one sub client
    {
      const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(mainCode, clientCode),
      );
      expectDiagnosticEmpty(diagnostics);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-python",
      });
      const client = listClients(context)[0];
      strictEqual(listOperationGroups(context, client).length, 1);
    }

    // csharp should have no client
    {
      const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
        createClientCustomizationInput(mainCode, clientCode),
      );
      expectDiagnosticEmpty(diagnostics);
      const context = await createSdkContextForTester(program, {
        emitterName: "@azure-tools/typespec-csharp",
      });
      const client = listClients(context);
      strictEqual(client.length, 0);
    }
  });
});

describe("listOperationGroups without @client and @operationGroup", () => {
  it("list operations in namespace or interface", async () => {
    const { program } = await SimpleTester.compile(`
        @service
        namespace MyClient;

        @route("/root1") op atRoot1(): void;
        @route("/root2") op atRoot2(): void;

        interface MyGroup {
          @route("/one") inOpGroup1(): void;
          @route("/two") inOpGroup2(): void;
        }
      `);
    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    let operations = listOperationsInOperationGroup(context, clients[0]);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["atRoot1", "atRoot2"],
    );

    const ogs = listOperationGroups(context, clients[0]);
    strictEqual(ogs.length, 1);
    strictEqual(ogs[0].subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, ogs[0]).length, 0);

    operations = listOperationsInOperationGroup(context, ogs[0]);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["inOpGroup1", "inOpGroup2"],
    );
  });

  it("namespace and interface hierarchy", async () => {
    const { program, A, AA, AAB, AG, AAG, AABGroup1 } = await SimpleTester.compile(t.code`
        @service
        @route("/a")
        namespace ${t.namespace("A")} {
          @route("/o1") op a_o1(): void;
          @route("/o2") op a_o2(): void;

          @route("/g")
          interface ${t.interface("AG")} {
            @route("/o1") a_g_o1(): void;
            @route("/o2") a_g_o2(): void;
          }

          @route("/a")
          namespace ${t.namespace("AA")} {
            @route("/o1") op aa_o1(): void;
            @route("/o2") op aa_o2(): void;

            @route("/g")
            interface ${t.interface("AAG")} {
              @route("/o1") aa_g_o1(): void;
              @route("/o2") aa_g_o2(): void;
            }

            @route("/a")
            namespace AAA{};

            @route("/b")
            namespace ${t.namespace("AAB")}{
              @route("/o1") op aab_o1(): void;
              @route("/o2") op aab_o2(): void;

              @route("/g1")
              interface ${t.interface("AABGroup1")} {
                @route("/o1") aab_g1_o1(): void;
                @route("/o2") aab_g1_o2(): void;
              }

              @route("/g2")
              interface AABGroup2 {
              }
            };
          }
        };
      `);

    const context = await createSdkContextForTester(program);
    const client = getClient(context, A);
    ok(client);
    let operations = listOperationsInOperationGroup(context, client);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["a_o1", "a_o2"],
    );

    const aa = getOperationGroup(context, AA);
    ok(aa);
    deepStrictEqual(aa.type, AA);
    operations = listOperationsInOperationGroup(context, aa);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["aa_o1", "aa_o2"],
    );

    const aab = getOperationGroup(context, AAB);
    ok(aab);
    deepStrictEqual(aab.type, AAB);
    operations = listOperationsInOperationGroup(context, aab);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["aab_o1", "aab_o2"],
    );

    const ag = getOperationGroup(context, AG);
    ok(ag);
    deepStrictEqual(ag.type, AG);
    operations = listOperationsInOperationGroup(context, ag);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["a_g_o1", "a_g_o2"],
    );

    const aag = getOperationGroup(context, AAG);
    ok(aag);
    deepStrictEqual(aag.type, AAG);
    operations = listOperationsInOperationGroup(context, aag);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["aa_g_o1", "aa_g_o2"],
    );

    const aabGroup1 = getOperationGroup(context, AABGroup1);
    ok(aabGroup1);
    deepStrictEqual(aabGroup1.type, AABGroup1);
    operations = listOperationsInOperationGroup(context, aabGroup1);
    deepStrictEqual(
      operations.map((x) => x.name),
      ["aab_g1_o1", "aab_g1_o2"],
    );

    let allOperationGroups = listOperationGroups(context, client);
    deepStrictEqual(allOperationGroups, [aa, ag]);
    allOperationGroups = listOperationGroups(context, aa);
    deepStrictEqual(allOperationGroups, [aab, aag]);
    allOperationGroups = listOperationGroups(context, aab);
    deepStrictEqual(allOperationGroups, [aabGroup1]);
    allOperationGroups = listOperationGroups(context, aag);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(context, aabGroup1);
    deepStrictEqual(allOperationGroups, []);
    deepStrictEqual(listOperationGroups(context, ag), []);

    allOperationGroups = listOperationGroups(context, client, true);
    deepStrictEqual(allOperationGroups, [aa, ag, aab, aag, aabGroup1]);
    allOperationGroups = listOperationGroups(context, aa, true);
    deepStrictEqual(allOperationGroups, [aab, aag, aabGroup1]);
    allOperationGroups = listOperationGroups(context, aab, true);
    deepStrictEqual(allOperationGroups, [aabGroup1]);
    allOperationGroups = listOperationGroups(context, aag, true);
    deepStrictEqual(allOperationGroups, []);
    allOperationGroups = listOperationGroups(context, aabGroup1, true);
    deepStrictEqual(allOperationGroups, []);
    deepStrictEqual(listOperationGroups(context, ag, true), []);

    let allOperations = listOperationsInOperationGroup(context, client, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      [
        "a_o1",
        "a_o2",
        "aa_o1",
        "aa_o2",
        "a_g_o1",
        "a_g_o2",
        "aab_o1",
        "aab_o2",
        "aa_g_o1",
        "aa_g_o2",
        "aab_g1_o1",
        "aab_g1_o2",
      ],
    );
    allOperations = listOperationsInOperationGroup(context, aa, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      ["aa_o1", "aa_o2", "aab_o1", "aab_o2", "aa_g_o1", "aa_g_o2", "aab_g1_o1", "aab_g1_o2"],
    );
    allOperations = listOperationsInOperationGroup(context, aab, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      ["aab_o1", "aab_o2", "aab_g1_o1", "aab_g1_o2"],
    );
    allOperations = listOperationsInOperationGroup(context, aag, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      ["aa_g_o1", "aa_g_o2"],
    );
    allOperations = listOperationsInOperationGroup(context, aabGroup1, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      ["aab_g1_o1", "aab_g1_o2"],
    );
    allOperations = listOperationsInOperationGroup(context, ag, true);
    deepStrictEqual(
      allOperations.map((x) => x.name),
      ["a_g_o1", "a_g_o2"],
    );
  });

  it("interface without operation", async () => {
    const { program, MyGroup, MyClient } = await SimpleTester.compile(t.code`
        @service
        namespace ${t.namespace("MyClient")};

        @route("/root1") op atRoot1(): void;

        interface ${t.interface("MyGroup")} {
          @route("/root2") op atRoot2(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    const client = getClient(context, MyClient);
    ok(client);
    deepStrictEqual(getOperationGroup(context, MyGroup), {
      kind: "SdkOperationGroup",
      type: MyGroup,
      groupPath: "MyClient.MyGroup",
      services: [MyClient],
      service: MyClient,
      subOperationGroups: [],
      parent: client,
    });

    const clients = listClients(context);
    const ogs = listOperationGroups(context, clients[0]);
    deepStrictEqual(ogs.length, 1);
  });

  it("empty namespaces and interfaces", async () => {
    const { program } = await SimpleTester.compile(`
        @service
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

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    const ogs = listOperationGroups(context, clients[0]);
    let countFromProperty = ogs.length;
    let countFromList = ogs.length;
    const q = [...ogs];
    while (q.length > 0) {
      const og = q.pop()!;
      countFromProperty += og.subOperationGroups?.length ?? 0;
      countFromList += listOperationGroups(context, og).length;
      q.push(...(og.subOperationGroups ?? []));
    }
    deepStrictEqual(countFromProperty, 13);
    deepStrictEqual(countFromList, 13);
  });
});

describe("client hierarchy", () => {
  it("no client", async () => {
    const { program } = await SimpleTester.compile(`
        namespace Test1Client {
          op x(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    deepStrictEqual(listClients(context).length, 0);
  });

  it("omit one namespace", async () => {
    const { program } = await SimpleTester.compile(`
        @service
        namespace Test1Client {
          op x(): void;
        }
        
        namespace Test2 {
          op y(): void;
        }
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    deepStrictEqual(
      listOperationsInOperationGroup(context, client1).map((x) => x.name),
      ["x"],
    );
    deepStrictEqual(listOperationGroups(context, client1).length, 0);
  });

  it("nested namespace", async () => {
    const { program } = await SimpleTester.compile(`
        @service
        namespace Test1Client {
          namespace B {
            op x(): void;
          }
        }
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    strictEqual(listOperationsInOperationGroup(context, client1).length, 0);

    const client1Ogs = listOperationGroups(context, client1);
    strictEqual(client1Ogs.length, 1);
    const b = client1Ogs.find((x) => x.type?.name === "B");
    ok(b);
    strictEqual(b.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, b).length, 0);
    strictEqual(b.groupPath, "Test1Client.B");
    deepStrictEqual(
      listOperationsInOperationGroup(context, b).map((x) => x.name),
      ["x"],
    );
  });

  it("nested namespace and interface with naming change", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    strictEqual(listOperationsInOperationGroup(context, client1).length, 0);

    const client1Ogs = listOperationGroups(context, client1);
    strictEqual(client1Ogs.length, 1);
    const b = client1Ogs.find((x) => x.type?.name === "B");
    ok(b);
    strictEqual(b.subOperationGroups?.length, 1);
    strictEqual(listOperationGroups(context, b).length, 1);
    strictEqual(b.groupPath, "Test1Client.BRename");
    deepStrictEqual(
      listOperationsInOperationGroup(context, b).map((x) => x.name),
      ["x"],
    );

    const c = b.subOperationGroups?.find((x) => x.type?.name === "C");
    ok(c);
    strictEqual(c.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, c).length, 0);
    strictEqual(c.groupPath, "Test1Client.BRename.C");
    deepStrictEqual(
      listOperationsInOperationGroup(context, c).map((x) => x.name),
      ["y"],
    );
  });

  it("nested empty namespace and interface", async () => {
    const { program } = await SimpleTester.compile(`
        @service
        namespace Test1Client {
          namespace B {
            interface C {
              op y(): void;
            }
          }
        }
      `);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    strictEqual(listOperationsInOperationGroup(context, client1).length, 0);

    const client1Ogs = listOperationGroups(context, client1);
    strictEqual(client1Ogs.length, 1);
    const b = client1Ogs.find((x) => x.type?.name === "B");
    ok(b);
    strictEqual(b.subOperationGroups?.length, 1);
    strictEqual(listOperationGroups(context, b).length, 1);
    strictEqual(b.groupPath, "Test1Client.B");
    strictEqual(listOperationsInOperationGroup(context, b).length, 0);

    const c = b.subOperationGroups?.find((x) => x.type?.name === "C");
    ok(c);
    strictEqual(c.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, c).length, 0);
    strictEqual(c.groupPath, "Test1Client.B.C");
    strictEqual(listOperationsInOperationGroup(context, c).length, 1);
  });

  it("rename client name", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );
    expectDiagnosticEmpty(diagnostics);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    deepStrictEqual(
      listOperationsInOperationGroup(context, client1).map((x) => x.name),
      ["x"],
    );
    deepStrictEqual(listOperationGroups(context, client1).length, 0);
  });

  it("rename client name - diagnostics", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
    });

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "AClient");
    ok(client1);
    deepStrictEqual(
      listOperationsInOperationGroup(context, client1).map((x) => x.name),
      ["x"],
    );
    deepStrictEqual(listOperationGroups(context, client1).length, 0);
  });

  it("split into two clients", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );
    expectDiagnosticEmpty(diagnostics);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    deepStrictEqual(clients.length, 2);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    deepStrictEqual(
      listOperationsInOperationGroup(context, client1).map((x) => x.name),
      ["x"],
    );
    deepStrictEqual(listOperationGroups(context, client1).length, 0);

    const client2 = clients.find((x) => x.name === "Test2Client");
    ok(client2);
    deepStrictEqual(
      listOperationsInOperationGroup(context, client2).map((x) => x.name),
      ["y"],
    );
    deepStrictEqual(listOperationGroups(context, client2).length, 0);
  });

  it("split into two clients - diagnostics", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
      },
      {
        code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
      },
    ]);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client = clients.find((x) => x.name === "AClient");
    ok(client);
    strictEqual(listOperationsInOperationGroup(context, client).length, 0);

    const clientOgs = listOperationGroups(context, client);
    strictEqual(clientOgs.length, 2);

    const og1 = clientOgs.find((x) => x.type?.name === "B");
    ok(og1);
    strictEqual(og1.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og1).length, 0);
    strictEqual(og1.groupPath, "AClient.B");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og1).map((x) => x.name),
      ["x"],
    );

    const og2 = clientOgs.find((x) => x.type?.name === "C");
    ok(og2);
    strictEqual(og2.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og2).length, 0);
    strictEqual(og2.groupPath, "AClient.C");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og2).map((x) => x.name),
      ["y"],
    );
  });

  it("one client and two operation groups", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );
    expectDiagnosticEmpty(diagnostics);

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client = clients.find((x) => x.name === "PetStoreClient");
    ok(client);
    strictEqual(listOperationsInOperationGroup(context, client).length, 0);

    const clientOgs = listOperationGroups(context, client);
    strictEqual(clientOgs.length, 2);

    const og1 = clientOgs.find((x) => x.type?.name === "OpGrp1");
    ok(og1);
    strictEqual(og1.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og1).length, 0);
    strictEqual(og1.groupPath, "PetStoreClient.OpGrp1");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og1).map((x) => x.name),
      ["feed"],
    );

    const og2 = clientOgs.find((x) => x.type?.name === "OpGrp2");
    ok(og2);
    strictEqual(og2.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og2).length, 0);
    strictEqual(og2.groupPath, "PetStoreClient.OpGrp2");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og2).map((x) => x.name),
      ["pet"],
    );
  });

  it("operation group - diagnostics", async () => {
    const [{ program }, diagnostics] = await SimpleBaseTester.compileAndDiagnose(
      createClientCustomizationInput(
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
      ),
    );

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/wrong-client-decorator",
    });

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client = clients.find((x) => x.name === "AClient");
    ok(client);
    strictEqual(listOperationsInOperationGroup(context, client).length, 0);

    const clientOgs = listOperationGroups(context, client);
    strictEqual(clientOgs.length, 2);

    const og1 = clientOgs.find((x) => x.type?.name === "B");
    ok(og1);
    strictEqual(og1.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og1).length, 0);
    strictEqual(og1.groupPath, "AClient.B");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og1).map((x) => x.name),
      ["x"],
    );

    const og2 = clientOgs.find((x) => x.type?.name === "C");
    ok(og2);
    strictEqual(og2.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, og2).length, 0);
    strictEqual(og2.groupPath, "AClient.C");
    deepStrictEqual(
      listOperationsInOperationGroup(context, og2).map((x) => x.name),
      ["y"],
    );
  });

  it("rearrange operations", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    strictEqual(listOperationsInOperationGroup(context, client1).length, 0);

    const client1Ogs = listOperationGroups(context, client1);
    strictEqual(client1Ogs.length, 1);
    const b = client1Ogs.find((x) => x.type?.name === "B");
    ok(b);
    strictEqual(b.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, b).length, 0);
    strictEqual(b.groupPath, "Test1Client.B");
    deepStrictEqual(
      listOperationsInOperationGroup(context, b).map((x) => x.name),
      ["x", "y"],
    );
  });

  it("rearrange operations with scope", async () => {
    const { program } = await SimpleTester.compile(`
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

    const context = await createSdkContextForTester(program);
    const clients = listClients(context);
    strictEqual(clients.length, 1);

    const client1 = clients.find((x) => x.name === "Test1Client");
    ok(client1);
    strictEqual(listOperationsInOperationGroup(context, client1).length, 0);

    const client1Ogs = listOperationGroups(context, client1);
    strictEqual(client1Ogs.length, 1);
    const b = client1Ogs.find((x) => x.type?.name === "B");
    ok(b);
    strictEqual(b.subOperationGroups.length, 0);
    strictEqual(listOperationGroups(context, b).length, 0);
    strictEqual(b.groupPath, "Test1Client.B");
    deepStrictEqual(
      listOperationsInOperationGroup(context, b).map((x) => x.name),
      ["x", "y"],
    );
  });

  it("triple-nested with core and versioning", async () => {
    const { program } = await AzureCoreTester.compile(
      `
      @service
      @versioned(StorageVersions)
      @clientName("BlobServiceClient")
      namespace Storage.Blob {
        enum StorageVersions {
          @doc("The 2025-01-05 version of the Azure.Storage.Blob service.")
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

    const context = await createSdkContextForTester(program);
    const sdkPackage = context.sdkPackage;
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

it("operations under namespace or interface without @client or @operationGroup", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    namespace Test;

    @route("/a")
    op a(): void;

    namespace B {
      @route("/b")
      op b(): void;

      interface C {
        @route("/c")
        op c(): void;
      }
    }

    @operationGroup
    interface D {
      @route("/d")
      op d(): void;
    }
  `);

  const context = await createSdkContextForTester(program);
  const clients = listClients(context);
  strictEqual(clients.length, 1);
  const client = clients[0];
  strictEqual(listOperationsInOperationGroup(context, client).length, 3);
  const operationGroups = listOperationGroups(context, client);
  strictEqual(operationGroups.length, 1);
  const operationGroup = operationGroups[0];
  strictEqual(listOperationsInOperationGroup(context, operationGroup).length, 1);
});
