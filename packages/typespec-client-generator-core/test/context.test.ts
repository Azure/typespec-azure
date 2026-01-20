import { resolveVirtualPath } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { parse } from "yaml";
import { createSdkContext } from "../src/context.js";
import { listClients } from "../src/decorators.js";
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

    @client({name: "TestClient"})
    @test
    interface Test {}
  `;

  const { program } = await SimpleTester.compile(tsp);
  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
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

it("export complex TCGC output from emitter", { timeout: 30000 }, async () => {
  const { outputs } = await ArmTester.emit(SdkTestLibrary.name).compile(
    `
      @armProviderNamespace
      @service(#{
        title: "ContosoProviderHubClient",
      })
      @versioned(Versions)
      namespace Microsoft.ContosoProviderHub;

      /** Contoso API versions */
      enum Versions {
        /** 2021-10-01-preview version */
              @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      /** A ContosoProviderHub resource */
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      /** Employee properties */
      model EmployeeProperties {
        /** Age of employee */
        age?: int32;

        /** City of employee */
        city?: string;

        /** Profile of employee */
        @encode("base64url")
        profile?: bytes;

        /** The status of the last operation. */
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }

      /** The provisioning state of a resource. */
      @lroStatus
      union ProvisioningState {
        string,

        /** The resource create request has been accepted */
        Accepted: "Accepted",

        /** The resource is being provisioned */
        Provisioning: "Provisioning",

        /** The resource is updating */
        Updating: "Updating",

        /** Resource has been created. */
        Succeeded: "Succeeded",

        /** Resource creation failed. */
        Failed: "Failed",

        /** Resource creation was canceled. */
        Canceled: "Canceled",

        /** The resource is being deleted */
        Deleting: "Deleting",
      }

      /** Employee move request */
      model MoveRequest {
        /** The moving from location */
        from: string;

        /** The moving to location */
        to: string;
      }

      /** Employee move response */
      model MoveResponse {
        /** The status of the move */
        movingStatus: string;
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
        update is ArmResourcePatchSync<Employee, EmployeeProperties>;
        delete is ArmResourceDeleteWithoutOkAsync<Employee>;
        listByResourceGroup is ArmResourceListByParent<Employee>;
        listBySubscription is ArmListBySubscription<Employee>;

        /** A sample resource action that move employee to different location */
        move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

        /** A sample HEAD operation to check resource existence */
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

  await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { exportTCGCoutput: true },
  );

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

  await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-python" },
    { exportTCGCoutput: true },
  );

  const output = fs.fs.get(resolveVirtualPath("tsp-output", "tcgc-output.yaml"));
  ok(output);
  const codeModel = parse(output);
  strictEqual(codeModel["models"][0]["name"], "Test");
});
