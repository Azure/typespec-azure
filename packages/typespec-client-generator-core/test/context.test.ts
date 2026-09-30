import { resolveArmResources } from "@azure-tools/typespec-azure-resource-manager";
import { resolveVirtualPath } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { parse } from "yaml";
import { createSdkContext, createTCGCContext } from "../src/context.js";
import {
  getClientLocation,
  listClients,
  listOperationsInClient,
  listSubClients,
} from "../src/decorators.js";
import { AllScopes } from "../src/internal-utils.js";
import { SdkTestLibrary } from "../src/testing/index.js";
import { ArmTester, createSdkContextForTester, SimpleTester } from "./tester.js";

it("selects common client metadata independently of emitter-specific groups", async () => {
  const { program } = await SimpleTester.compile(`
    @service namespace Example;
    @clientName("Common")
    @clientName("Language", "csharp")
    interface Source {
      @clientLocation("Moved")
      @clientLocation("LanguageMoved", "csharp")
      @get @route("/one") op one(): string;
      @get @route("/two") op two(): string;
    }
  `);
  const common = createTCGCContext(program, "@azure-tools/typespec-csharp", {
    mutateNamespace: false,
    scope: AllScopes,
  });
  const language = createTCGCContext(program, "@azure-tools/typespec-csharp", {
    mutateNamespace: false,
  });
  const commonGroups = listSubClients(common, listClients(common)[0]);
  deepStrictEqual(
    commonGroups.map((x) => x.name),
    ["Common", "Moved"],
  );
  const moved = listOperationsInClient(common, commonGroups[1]);
  deepStrictEqual(
    moved.map((x) => x.name),
    ["one"],
  );
  strictEqual(getClientLocation(common, moved[0]), "Moved");
  deepStrictEqual(
    listSubClients(language, listClients(language)[0]).map((x) => x.name),
    ["Language", "LanguageMoved"],
  );
});

it("supports an explicit language scope without changing the emitter identity", async () => {
  const { program } = await SimpleTester.compile(`
    @service namespace Example;
    @clientName("CSharp", "csharp") interface Group {
      @scope("csharp") @get @route("/one") op one(): string;
      @scope("!csharp") @get @route("/two") op two(): string;
    }
  `);
  const context = createTCGCContext(program, "@azure-tools/typespec-python", {
    mutateNamespace: false,
    scope: "csharp",
  });
  strictEqual(context.emitterName, "python");
  const group = listSubClients(context, listClients(context)[0])[0];
  strictEqual(group.name, "CSharp");
  deepStrictEqual(
    listOperationsInClient(context, group).map((x) => x.name),
    ["one"],
  );
});

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
