import { resolveArmResources } from "@azure-tools/typespec-azure-resource-manager";
import { unsafe_Realm } from "@typespec/compiler/experimental";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { parse } from "yaml";
import { createSdkContext } from "../src/context.js";
import { listClients } from "../src/decorators.js";
import { getLibraryName } from "../src/public-utils.js";
import { SdkTestLibrary } from "../src/testing/index.js";
import { ArmTester, createSdkContextForTester, SimpleTester } from "./tester.js";

it("multiple call with versioning", async () => {
  const tsp = `
    @service(#{
      title: "Contoso Widget Manager",
    })
    @versioned(Contoso.WidgetManager.Versions)
    namespace Contoso.WidgetManager;
    
    enum Versions {
      v1,
    }

    @client({name: "TestClient", service: Contoso.WidgetManager})
    @test
    interface Test {}
  `;

  const { program } = await SimpleTester.compile(tsp);
  const context = await createSdkContextForTester(program);
  let clients = listClients(context);
  strictEqual(clients.length, 1);
  ok(clients[0].type);

  const newSdkContext = await createSdkContext(context.emitContext);
  clients = listClients(newSdkContext);
  strictEqual(clients.length, 1);
  ok(clients[0].type);
});

it("export TCGC output from emitter", async () => {
  const { outputs } = await SimpleTester.emit(SdkTestLibrary.name).compile(
    `
    @service(#{
      title: "Contoso Widget Manager",
    })
    namespace Contoso.WidgetManager;
    
    @usage(Usage.input)
    model Test{
    }
  `,
  );

  const output = outputs["tcgc-output.yaml"];
  ok(output);
  const codeModel = parse(output);
  strictEqual(codeModel["models"][0]["name"], "Test");
});

it("export complex TCGC output from emitter", async () => {
  const { outputs } = await ArmTester.emit(SdkTestLibrary.name).compile(
    `
      @armProviderNamespace
      @service(#{
        title: "ContosoProviderHubClient",
      })
      @versioned(Versions)
      namespace Microsoft.ContosoProviderHub;

      enum Versions {
              @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        age?: int32;

        city?: string;

        @encode("base64url")
        profile?: bytes;

        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }

      @lroStatus
      union ProvisioningState {
        string,

        Accepted: "Accepted",

        Provisioning: "Provisioning",

        Updating: "Updating",

        Succeeded: "Succeeded",

        Failed: "Failed",

        Canceled: "Canceled",

        Deleting: "Deleting",
      }

      model MoveRequest {
        from: string;

        to: string;
      }

      model MoveResponse {
        movingStatus: string;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
        #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
        update is ArmResourcePatchSync<Employee, EmployeeProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
        listByResourceGroup is ArmResourceListByParent<Employee>;
        listBySubscription is ArmListBySubscription<Employee>;

        move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

        checkExistence is ArmResourceCheckExistence<Employee>;
      }
    `,
  );

  const output = outputs["tcgc-output.yaml"];
  ok(output);
  const codeModel = parse(output, { maxAliasCount: -1 });
  strictEqual(codeModel["clients"][0]["name"], "ContosoProviderHubClient");
});

it("export TCGC output with emitter name from emitter", async () => {
  const { outputs } = await SimpleTester.emit(SdkTestLibrary.name, {
    "emitter-name": "@azure-tools/typespec-csharp",
  }).compile(
    `
      @service(#{
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input, "csharp")
      model Test{
      }
    `,
  );

  const output = outputs["tcgc-output.yaml"];
  ok(output);
  const codeModel = parse(output);
  strictEqual(codeModel["models"][0]["name"], "Test");
});

it("export TCGC output from context", async () => {
  const { program, fs } = await SimpleTester.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input)
      model Test{
      }
    `);

  await createSdkContextForTester(program, {}, { exportTCGCoutput: true });

  const output = fs.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
  ok(output);
  const codeModel = parse(output);
  strictEqual(codeModel["models"][0]["name"], "Test");
});

it("export TCGC output with emitter name from context", async () => {
  const { program, fs } = await SimpleTester.compile(`
      @service(#{
        title: "Contoso Widget Manager",
      })
      namespace Contoso.WidgetManager;
      
      @usage(Usage.input, "python")
      model Test{
      }
    `);

  await createSdkContextForTester(program, {}, { exportTCGCoutput: true });

  const output = fs.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
  ok(output);
  const codeModel = parse(output);
  strictEqual(codeModel["models"][0]["name"], "Test");
});

it("calling createSdkContext does not cause resolveArmResources to return duplicate resources", async () => {
  // Regression test: createSdkContext runs versioning mutation which re-applies decorators on
  // realm types. resolveArmResources must skip realm types so that duplicates are not registered.
  // Using 2 versions is the key condition that reproduces the issue.
  const { program } = await ArmTester.compile(`
    @armProviderNamespace
    @service(#{ title: "Azure Management emitter Testing" })
    @versioned(Versions)
    namespace Microsoft.ContosoProviderHub;

    enum Versions {
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      \`2021-10-01-preview\`,
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      \`2022-01-01\`,
    }

    model EmployeeParent is TrackedResource<EmployeeParentProperties> {
      ...ResourceNameParameter<EmployeeParent>;
    }

    model EmployeeParentProperties {
      age?: int32;
    }

    @parentResource(EmployeeParent)
    model Employee is TrackedResource<EmployeeProperties> {
      ...ResourceNameParameter<Employee>;
    }

    model EmployeeProperties {
      age?: int32;
    }

    interface Operations extends Azure.ResourceManager.Operations {}

    @armResourceOperations
    interface EmployeesParent {
      get is ArmResourceRead<EmployeeParent>;
    }

    @armResourceOperations
    interface Employees {
      get is ArmResourceRead<Employee>;
      createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
    }
  `);

  // Calling createSdkContext before resolveArmResources previously caused duplicates
  await createSdkContextForTester(program);

  const provider = resolveArmResources(program);
  ok(provider.resources);
  // Should have exactly 2 resources (EmployeeParent and Employee), no duplicates
  strictEqual(provider.resources.length, 2);
  const resourceNames = provider.resources.map((r) => r.resourceName);
  ok(resourceNames.includes("EmployeeParent"));
  ok(resourceNames.includes("Employee"));
});

it("uses TCGC library names when supplied to resolveArmResources", async () => {
  const { program } = await ArmTester.compile(`
    @armProviderNamespace
    @service(#{ title: "Azure Management emitter Testing" })
    namespace Microsoft.ContosoProviderHub;

    @clientName("ClientWidget")
    model Widget is TrackedResource<{}> {
      ...ResourceNameParameter<Widget>;
    }

    interface Operations extends Azure.ResourceManager.Operations {}

    @clientName("ClientWidgets", "csharp")
    @armResourceOperations
    interface Widgets {
      @clientName("fetchWidget", "csharp")
      get is ArmResourceRead<Widget>;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const provider = resolveArmResources(program, {
    nameResolver: ({ type }) => getLibraryName(context, type),
  });

  const widget = provider.resources?.find((x) => x.type.name === "Widget");
  ok(widget);
  strictEqual(widget.resourceName, "ClientWidget");
  strictEqual(widget.operations.lifecycle.read?.[0].name, "fetchWidget");
  strictEqual(widget.operations.lifecycle.read?.[0].operationGroup, "ClientWidgets");
  strictEqual(widget.operations.lifecycle.read?.[0].resourceName, "ClientWidget");
  strictEqual(widget.operations.lifecycle.read?.[0].resourceModelName, "ClientWidget");
});

it("uses TCGC library names for selected ARM resource versions", async () => {
  const { program } = await ArmTester.compile(`
    @armProviderNamespace
    @service(#{ title: "Azure Management emitter Testing" })
    @versioned(Versions)
    namespace Microsoft.ContosoProviderHub;

    enum Versions {
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      v1: "2024-01-01",
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      v2: "2025-01-01",
      @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
      v3: "2026-01-01",
    }

    @clientName("ClientWidget")
    model Widget is TrackedResource<WidgetProperties> {
      ...ResourceNameParameter<Widget>;
    }

    model WidgetProperties {
      value?: string;
    }

    @added(Versions.v2)
    @clientName("ClientGadget", "csharp")
    model Gadget is ProxyResource<{}> {
      ...ResourceNameParameter<Gadget>;
    }

    @added(Versions.v2)
    @removed(Versions.v3)
    @clientName("ClientTemporary")
    model Temporary is ProxyResource<{}> {
      ...ResourceNameParameter<Temporary>;
    }

    @clientName("ClientWidgets", "csharp")
    @armResourceOperations
    interface Widgets {
      @clientName("fetchWidget", "csharp")
      get is ArmResourceRead<Widget>;

      @added(Versions.v2)
      @clientName("createWidget", "csharp")
      createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;

      @added(Versions.v2)
      @removed(Versions.v3)
      @clientName("updateWidget", "csharp")
      update is ArmResourcePatchSync<Widget, WidgetProperties>;
    }

    @added(Versions.v2)
    @clientName("ClientGadgets", "csharp")
    @armResourceOperations
    interface Gadgets {
      @clientName("fetchGadget", "csharp")
      get is ArmResourceRead<Gadget>;
    }

    @added(Versions.v2)
    @removed(Versions.v3)
    @clientName("ClientTemporaries")
    @armResourceOperations
    interface Temporaries {
      @clientName("fetchTemporary")
      get is ArmResourceRead<Temporary>;
    }
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const resolveVersion = (version: string) =>
    resolveArmResources(program, {
      version,
      nameResolver: ({ type }) => getLibraryName(context, type),
    });

  const v1 = resolveVersion("2024-01-01");
  const v2 = resolveVersion("2025-01-01");
  const v3 = resolveVersion("2026-01-01");

  strictEqual(v1.resources?.length, 1);
  const v1Widget = v1.resources?.[0];
  ok(v1Widget);
  strictEqual(v1Widget.resourceName, "ClientWidget");
  strictEqual(v1Widget.operations.lifecycle.read?.[0].name, "fetchWidget");
  strictEqual(v1Widget.operations.lifecycle.read?.[0].operationGroup, "ClientWidgets");
  strictEqual(v1Widget.operations.lifecycle.createOrUpdate, undefined);
  ok(unsafe_Realm.realmForType.has(v1Widget.type));

  strictEqual(v2.resources?.length, 3);
  const v2Widget = v2.resources?.find((x) => x.type.name === "Widget");
  const v2Gadget = v2.resources?.find((x) => x.type.name === "Gadget");
  const v2Temporary = v2.resources?.find((x) => x.type.name === "Temporary");
  ok(v2Widget);
  ok(v2Gadget);
  ok(v2Temporary);
  strictEqual(v2Widget.resourceName, "ClientWidget");
  strictEqual(v2Widget.operations.lifecycle.createOrUpdate?.[0].name, "createWidget");
  strictEqual(v2Widget.operations.lifecycle.update?.[0].name, "updateWidget");
  strictEqual(v2Gadget.resourceName, "ClientGadget");
  strictEqual(v2Gadget.operations.lifecycle.read?.[0].operationGroup, "ClientGadgets");
  strictEqual(v2Temporary.resourceName, "ClientTemporary");
  strictEqual(v2Temporary.operations.lifecycle.read?.[0].name, "fetchTemporary");

  strictEqual(v3.resources?.length, 2);
  const v3Widget = v3.resources?.find((x) => x.type.name === "Widget");
  ok(v3Widget);
  strictEqual(v3Widget.resourceName, "ClientWidget");
  strictEqual(v3Widget.operations.lifecycle.update, undefined);
  ok(v3.resources?.some((x) => x.resourceName === "ClientGadget"));
  ok(!v3.resources?.some((x) => x.resourceName === "ClientTemporary"));
});
