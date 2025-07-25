import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { ok } from "assert";
import { describe, expect, it } from "vitest";
import { ArmOperationKind, ArmResourceOperation } from "../src/operations.js";
import {
  getResourcePathElements,
  isResourceOperationMatch,
  resolveArmResources,
  ResolvedOperationResourceInfo,
  ResolvedOperations,
  ResourceType,
} from "../src/resource.js";
import { compileAndDiagnose } from "./test-host.js";

interface ArmOperationCheck {
  operationGroup: string;
  name: string;
  kind: ArmOperationKind;
  path?: string;
}

interface ResourceOperationsCheck {
  lists?: ArmOperationCheck[];
  lifecycle?: {
    createOrUpdate?: ArmOperationCheck[];
    read?: ArmOperationCheck[];
    update?: ArmOperationCheck[];
    delete?: ArmOperationCheck[];
  };
  actions?: ArmOperationCheck[];
}

interface ResolvedOperationsCheck {
  resourceType: ResourceType;
  resourceInstancePath: string;
  operations: ResourceOperationsCheck;
}

function checkArmOperationsHas(
  operations: ArmResourceOperation[] | undefined,
  checks: ArmOperationCheck[],
) {
  ok(operations);
  expect(operations).toBeDefined();
  expect(operations).toHaveLength(checks.length);
  for (const check of checks) {
    expect(
      operations.some(
        (op) =>
          op.operationGroup === check.operationGroup &&
          op.name === check.name &&
          op.kind === check.kind &&
          (check.path === undefined || op.path === check.path),
      ),
    ).toBe(true);
  }
}

function checkResolvedOperations(operations: ResolvedOperations, check: ResolvedOperationsCheck) {
  expect(operations.resourceType).toEqual(check.resourceType);
  expect(operations.resourceInstancePath).toEqual(check.resourceInstancePath);
  if (check.operations.actions) {
    checkArmOperationsHas(operations.operations.actions, check.operations.actions);
  } else {
    expect(operations.operations.actions).toHaveLength(0);
  }
  if (check.operations.lists) {
    checkArmOperationsHas(operations.operations.lists, check.operations.lists);
  } else {
    expect(operations.operations.lists).toHaveLength(0);
  }
  if (check.operations.lifecycle) {
    if (check.operations.lifecycle.createOrUpdate) {
      checkArmOperationsHas(
        operations.operations.lifecycle.createOrUpdate,
        check.operations.lifecycle.createOrUpdate,
      );
    } else {
      expect(operations.operations.lifecycle.createOrUpdate).toBeUndefined();
    }
    if (check.operations.lifecycle.delete) {
      checkArmOperationsHas(
        operations.operations.lifecycle.delete,
        check.operations.lifecycle.delete,
      );
    } else {
      expect(operations.operations.lifecycle.delete).toBeUndefined();
    }
    if (check.operations.lifecycle.read) {
      checkArmOperationsHas(operations.operations.lifecycle.read, check.operations.lifecycle.read);
    } else {
      expect(operations.operations.lifecycle.read).toBeUndefined();
    }
    if (check.operations.lifecycle.update) {
      checkArmOperationsHas(
        operations.operations.lifecycle.update,
        check.operations.lifecycle.update,
      );
    } else {
      expect(operations.operations.lifecycle.update).toBeUndefined();
    }
  } else {
    expect(operations.operations.lifecycle).toEqual({});
  }
}

describe("unit tests for resource manager helpers", () => {
  describe("getResourcePathElements handles standard resource types", () => {
    const cases: {
      title: string;
      path: string;
      kind: ArmOperationKind;
      expected: ResolvedOperationResourceInfo;
    }[] = [
      {
        title: "tracked resource path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}",
        kind: "read",
        expected: {
          resourceType: {
            provider: "Microsoft.Test",
            types: ["foos"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}",
        },
      },
      {
        title: "tracked resource action path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/actionName",
        kind: "action",
        expected: {
          resourceType: {
            provider: "Microsoft.Test",
            types: ["foos"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}",
        },
      },
      {
        title: "tracked resource list path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/",
        kind: "list",
        expected: {
          resourceType: {
            provider: "Microsoft.Test",
            types: ["foos"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{name}",
        },
      },
      {
        title: "tenant list path",
        path: "/providers/Microsoft.Test/foos/",
        kind: "list",
        expected: {
          resourceType: {
            provider: "Microsoft.Test",
            types: ["foos"],
          },
          resourceInstancePath: "/providers/Microsoft.Test/foos/{name}",
        },
      },
      {
        title: "extension resource path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}",
        kind: "createOrUpdate",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}",
        },
      },
      {
        title: "extension resource list path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}/basses",
        kind: "list",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}/basses/{name}",
        },
      },
      {
        title: "extension resource action path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}/basses/{baseName}/actionName/doSomething",
        kind: "action",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/foos/{fooName}/providers/Microsoft.Bar/bars/{barName}/basses/{baseName}",
        },
      },
      {
        title: "generic extension resource list path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses",
        kind: "list",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/{name}",
        },
      },
      {
        title: "generic extension resource weird action path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/{name}/actionName/doSomething/doSomethingElse/andAnotherThing",
        kind: "action",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/{name}",
        },
      },
      {
        title: "generic extension resource weird read path",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/drums/actionName/doSomething/doSomethingElse/andAnotherThing",
        kind: "read",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}",
        },
      },
      {
        title: "generic extension resource weird read path with default",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default/actionName/doSomething/doSomethingElse/andAnotherThing",
        kind: "read",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
      {
        title: "handles paths with leading and trailing slashes",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default/actionName/doSomething/doSomethingElse/andAnotherThing/",
        kind: "read",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
      {
        title: "handles paths without leading and trailing slashes",
        path: "subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default/actionName/doSomething/doSomethingElse/andAnotherThing",
        kind: "read",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
    ];
    for (const { title, path, kind, expected } of cases) {
      it(`parses path for ${title} operations correctly`, () => {
        const result = getResourcePathElements(path, kind);
        expect(result).toEqual(expected);
      });
    }

    const invalidCases: { title: string; path: string; kind: string }[] = [
      {
        title: "lifecycle operationpath with no variables",
        path: "/subscriptions/resourceGroups/providers/Microsoft.Foo/andAnotherThing",
        kind: "read",
      },
      {
        title: "lifecycle operation path with no providers",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/bars/{barName}/basses/drums/{actionName}/doSomething/{doSomethingElse}/andAnotherThing",
        kind: "read",
      },
      {
        title: "invalid read path with extra variable segments",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/drums/{actionName}/doSomething/{doSomethingElse}/andAnotherThing",
        kind: "read",
      },
      {
        title: "invalid action path with extra variable segments",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/drums/{actionName}/doSomething/{doSomethingElse}/andAnotherThing",
        kind: "action",
      },
    ];
    for (const { title, path, kind } of invalidCases) {
      it(`returns undefined for ${title}`, () => {
        const result = getResourcePathElements(path, kind as ArmOperationKind);
        expect(result).toBeUndefined();
      });
    }
  });
  describe("isResourceOperationMatch matches operations over the same resource", () => {
    const cases: {
      title: string;
      source: { resourceType: ResourceType; resourceInstancePath: string };
      target: { resourceType: ResourceType; resourceInstancePath: string };
    }[] = [
      {
        title: "operations with default and parameterized names",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/{name}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
      {
        title: "operations with different variable parameter names",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscription}/resourceGroups/{resourceGroup}/providers/{provider}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{bar}/basses/{name}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
      {
        title: "operations with different static path capitalization",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/Subscriptions/{subscriptionId}/resourcegroups/{resourceGroupName}/Providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/Bars/{barName}/Basses/{name}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars", "basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/default",
        },
      },
    ];
    for (const { title, source, target } of cases) {
      it(`matches ${title}`, () => {
        const result = isResourceOperationMatch(source, target);
        expect(result).toBe(true);
      });
    }
  });
  describe("isResourceOperationMatch does not match operations over different resources", () => {
    const cases: {
      title: string;
      source: { resourceType: ResourceType; resourceInstancePath: string };
      target: { resourceType: ResourceType; resourceInstancePath: string };
    }[] = [
      {
        title: "operations with different resource types",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["basses"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/basses/{bassName}",
        },
      },
      {
        title: "operations with different resource providers",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/bars/{barName}",
        },
      },
      {
        title: "operations with different number of static path segments",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/providers/Microsoft.Bar/bars/{barName}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
        },
      },
      {
        title: "operations with different static path segments",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subs/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
        },
      },
    ];
    for (const { title, source, target } of cases) {
      it(`does not match ${title}`, () => {
        const result = isResourceOperationMatch(source, target);
        expect(result).toBe(false);
      });
    }
  });
});
describe("end-to-end tests for resource manager helpers", () => {
  it("collects operation information for tracked resources", async () => {
    const { program, diagnostics } = await compileAndDiagnose(`

using Azure.Core;
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_10_01_preview: "2021-10-01-preview",
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
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteWithoutOkAsync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;

  /** A sample resource action that move employee to different location */
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  /** A sample HEAD operation to check resource existence */
  checkExistence is ArmResourceCheckExistence<Employee>;
}
`);
    expectDiagnosticEmpty(diagnostics);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resources).toBeDefined();
    expect(resources.resources).toHaveLength(1);
    ok(resources.resources);
    const employee = resources.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      operations: expect.any(Array),
    });
    ok(employee.operations);
    const subscriptionScope = employee.operations[0];
    ok(subscriptionScope);
    checkResolvedOperations(subscriptionScope, {
      operations: {
        lifecycle: {},
        lists: [{ operationGroup: "Employees", name: "listBySubscription", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{name}",
    });

    const mainScope = employee.operations[1];
    ok(mainScope);
    checkResolvedOperations(mainScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "Employees", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Employees", name: "listByResourceGroup", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    checkArmOperationsHas(resources.unassociatedOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });
  it("collects operation information for extension resources", async () => {
    const { program, diagnostics } = await compileAndDiagnose(`
      using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2020_10_01_preview: "2021-10-01-preview",
}

/** A ContosoProviderHub resource */
model Employee is ExtensionResource<EmployeeProperties> {
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
  ResourceProvisioningState,

  /** The resource is being provisioned */
  Provisioning: "Provisioning",

  /** The resource is updating */
  Updating: "Updating",

  /** The resource is being deleted */
  Deleting: "Deleting",

  /** The resource create request has been accepted */
  Accepted: "Accepted",

  string,
}

interface Operations extends Azure.ResourceManager.Operations {}

interface EmplOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource> {
  get is Extension.Read<Scope, Employee>;

  create is Extension.CreateOrReplaceAsync<Scope, Employee>;
  update is Extension.CustomPatchSync<
    Scope,
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, Employee>;
  list is Extension.ListByTarget<Scope, Employee>;
  move is Extension.ActionSync<Scope, Employee, MoveRequest, MoveResponse>;
}

/** Virtual resource for a virtual machine */
alias VirtualMachine = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachines",
  "vmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine"
>;

alias Scaleset = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachineScaleSets",
  "scaleSetName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine scale set"
>;

alias VirtualMachineScaleSetVm = Extension.ExternalChildResource<
  Scaleset,
  "virtualMachineScaleSetVms",
  "scaleSetVmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine scale set VM"
>;

@armResourceOperations
interface Employees extends EmplOps<Extension.ScopeParameter> {}
@armResourceOperations
interface Tenants extends EmplOps<Extension.Tenant> {}
@armResourceOperations
interface Subscriptions extends EmplOps<Extension.Subscription> {}
@armResourceOperations
interface ResourceGroups extends EmplOps<Extension.ResourceGroup> {}
@armResourceOperations
interface ManagementGroups extends EmplOps<Extension.ManagementGroup> {}

@armResourceOperations
interface VirtualMachines extends EmplOps<VirtualMachine> {}

@armResourceOperations
interface ScaleSetVms extends EmplOps<VirtualMachineScaleSetVm> {}

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

alias GenericResourceParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;

  /** the provider namespace */
  @path
  @segment("providers")
  @key
  providerNamespace: string;

  /** the resource type of the parent */
  @path @key parentType: string;

  /** the name of the parent resource */
  @path @key parentName: string;

  /** the resource type of the target resource */
  @path @key resourceType: string;

  /** the name of the target resource */
  @path @key resourceName: string;
};

alias ParentParameters = {
  ...Extension.ExtensionProviderNamespace<Employee>;
  ...ParentKeysOf<Employee>;
};

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface GenericOps
  extends Azure.ResourceManager.Legacy.ExtensionOperations<
      GenericResourceParameters,
      ParentParameters,
      {
        ...Extension.ExtensionProviderNamespace<Employee>,
        ...KeysOf<Employee>,
      }
    > {}

@armResourceOperations
interface GenericResources {
  get is GenericOps.Read<Employee>;
  create is GenericOps.CreateOrUpdateAsync<Employee>;
  update is GenericOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is GenericOps.DeleteWithoutOkAsync<Employee>;
  list is GenericOps.List<Employee>;
}

      `);
    expectDiagnosticEmpty(diagnostics);
    const resources = resolveArmResources(program);
    expect(resources).toMatchObject({
      resources: expect.any(Array),
      unassociatedOperations: expect.any(Array),
    });
    ok(resources.resources);
    const employee = resources.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      operations: expect.any(Array),
    });
    ok(employee.operations);
    const tenant = employee.operations[0];
    ok(tenant);
    checkResolvedOperations(tenant, {
      operations: {
        lifecycle: {
          createOrUpdate: [{ operationGroup: "Tenants", name: "create", kind: "createOrUpdate" }],
          delete: [{ operationGroup: "Tenants", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Tenants", name: "get", kind: "read" }],
          update: [{ operationGroup: "Tenants", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "Tenants", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Tenants", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath: "/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const scope = employee.operations[1];
    ok(scope);
    checkResolvedOperations(scope, {
      operations: {
        lifecycle: {
          createOrUpdate: [{ operationGroup: "Employees", name: "create", kind: "createOrUpdate" }],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "Employees", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Employees", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/{scope}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const subscription = employee.operations[2];
    ok(subscription);
    checkResolvedOperations(subscription, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Subscriptions", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Subscriptions", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Subscriptions", name: "get", kind: "read" }],
          update: [{ operationGroup: "Subscriptions", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "Subscriptions", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Subscriptions", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const managementGroups = employee.operations[3];
    ok(managementGroups);
    checkResolvedOperations(managementGroups, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "ManagementGroups", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "ManagementGroups", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "ManagementGroups", name: "get", kind: "read" }],
          update: [{ operationGroup: "ManagementGroups", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "ManagementGroups", name: "move", kind: "action" }],
        lists: [{ operationGroup: "ManagementGroups", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const resourceGroup = employee.operations[4];
    ok(resourceGroup);
    checkResolvedOperations(resourceGroup, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "ResourceGroups", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "ResourceGroups", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "ResourceGroups", name: "get", kind: "read" }],
          update: [{ operationGroup: "ResourceGroups", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "ResourceGroups", name: "move", kind: "action" }],
        lists: [{ operationGroup: "ResourceGroups", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const vms = employee.operations[5];
    ok(vms);
    checkResolvedOperations(vms, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "VirtualMachines", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "VirtualMachines", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "VirtualMachines", name: "get", kind: "read" }],
          update: [{ operationGroup: "VirtualMachines", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "VirtualMachines", name: "move", kind: "action" }],
        lists: [{ operationGroup: "VirtualMachines", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const scaleSets = employee.operations[6];
    ok(scaleSets);
    checkResolvedOperations(scaleSets, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "ScaleSetVms", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "ScaleSetVms", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "ScaleSetVms", name: "get", kind: "read" }],
          update: [{ operationGroup: "ScaleSetVms", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "ScaleSetVms", name: "move", kind: "action" }],
        lists: [{ operationGroup: "ScaleSetVms", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachineScaleSets/{scaleSetName}/virtualMachineScaleSetVms/{scaleSetVmName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const generics = employee.operations[7];
    ok(generics);
    checkResolvedOperations(generics, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "GenericResources", name: "create", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "GenericResources", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "GenericResources", name: "get", kind: "read" }],
          update: [{ operationGroup: "GenericResources", name: "update", kind: "update" }],
        },
        lists: [{ operationGroup: "GenericResources", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerNamespace}/{parentType}/{parentName}/{resourceType}/{resourceName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const externalVm = resources.resources[1];
    expect(externalVm).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      operations: [],
    });

    const externalScaleSet = resources.resources[2];
    expect(externalScaleSet).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      operations: [],
    });

    const externalManagementGroup = resources.resources[3];
    expect(externalManagementGroup).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Management",
      type: expect.anything(),
      operations: [],
    });

    checkArmOperationsHas(resources.unassociatedOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });
});
