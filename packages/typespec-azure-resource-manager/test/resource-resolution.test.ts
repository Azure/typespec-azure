import { ok } from "assert";
import { describe, expect, it } from "vitest";
import { ArmOperationKind, ArmResourceOperation } from "../src/operations.js";
import {
  getResourcePathElements,
  isResourceOperationMatch,
  resolveArmResources,
  ResolvedResource,
  ResourcePathInfo,
  ResourceType,
} from "../src/resource.js";
import { Tester } from "./tester.js";

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

interface ResolvedResourceCheck {
  resourceType: ResourceType;
  resourceInstancePath: string;
  resourceName?: string;
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

function checkResolvedOperations(operations: ResolvedResource, check: ResolvedResourceCheck) {
  expect(operations.resourceType).toEqual(check.resourceType);
  expect(operations.resourceInstancePath).toEqual(check.resourceInstancePath);
  if (check.resourceName) {
    expect(operations.resourceName).toEqual(check.resourceName);
  }
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
      expected: ResourcePathInfo;
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
      {
        title: "Read path with extra variable segments",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/drums/{actionName}/doSomething/{doSomethingElse}/andAnotherThing",
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
        title: "Action path with extra variable segments",
        path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}/basses/drums/{actionName}/doSomething/{doSomethingElse}/andAnotherThing",
        kind: "action",
        expected: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerName}/{resourceType}/{resourceName}/{childResourceType}/{childResourceName}/providers/Microsoft.Bar/bars/{barName}",
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
      source: { resourceType: ResourceType; resourceInstancePath: string; resourceName?: string };
      target: { resourceType: ResourceType; resourceInstancePath: string; resourceName?: string };
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
        title: "operations with different resource names",
        source: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subs/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
          resourceName: "Bar",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Bar",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Bar/bars/{barName}",
          resourceName: "NotBar",
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
    const { program } = await Tester.compile(`
using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}

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

  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<Employee>;
}
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(1);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);

    const mainScope = employee.resources[0];
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
        lists: [
          { operationGroup: "Employees", name: "listBySubscription", kind: "list" },
          { operationGroup: "Employees", name: "listByResourceGroup", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });
  it("collects operation information for extension resources", async () => {
    const { program } = await Tester.compile(`
      using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

model Employee is ExtensionResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,
  string,
}

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

model MoveRequest {
  from: string;
  to: string;
}

model MoveResponse {
  movingStatus: string;
}

alias GenericResourceParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;

  @path
  @segment("providers")
  @key
  providerNamespace: string;

  @path @key parentType: string;
  @path @key parentName: string;
  @path @key resourceType: string;
  @path @key resourceName: string;
};

alias ParentParameters = {
  ...Extension.ExtensionProviderNamespace<Employee>;
  ...ParentKeysOf<Employee>;
};

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
    const resources = resolveArmResources(program);
    expect(resources).toMatchObject({
      resourceModels: expect.any(Array),
      providerOperations: expect.any(Array),
    });
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    const tenant = employee.resources[0];
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

    const scope = employee.resources[1];
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

    const subscription = employee.resources[2];
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

    const managementGroups = employee.resources[3];
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

    const resourceGroup = employee.resources[4];
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

    const vms = employee.resources[5];
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

    const scaleSets = employee.resources[6];
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

    const generics = employee.resources[7];
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

    const externalVm = resources.resourceModels[1];
    expect(externalVm).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      resources: [],
    });

    const externalScaleSet = resources.resourceModels[2];
    expect(externalScaleSet).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      resources: [],
    });

    const externalManagementGroup = resources.resourceModels[3];
    expect(externalManagementGroup).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Management",
      type: expect.anything(),
      resources: [],
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("allows overriding resource name for extension resources", async () => {
    const { program } = await Tester.compile(`
      using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

model Employee is ExtensionResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,
  string,
}

interface EmplOps<Scope extends Azure.ResourceManager.Foundations.SimpleResource, LocalResourceName extends valueof string> {
  get is Extension.Read<Scope, Employee, OverrideResourceName = LocalResourceName>;

  create is Extension.CreateOrReplaceAsync<Scope, Employee, OverrideResourceName = LocalResourceName>;
  update is Extension.CustomPatchSync<
    Scope,
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>, 
    OverrideResourceName = LocalResourceName
  >;
  delete is Extension.DeleteWithoutOkAsync<Scope, Employee, OverrideResourceName = LocalResourceName>;
  list is Extension.ListByTarget<Scope, Employee, OverrideResourceName = LocalResourceName>;
  move is Extension.ActionSync<Scope, Employee, MoveRequest, MoveResponse, OverrideResourceName = LocalResourceName>;
}

alias VirtualMachine = Extension.ExternalResource<
  "Microsoft.Compute",
  "virtualMachines",
  "vmName",
  NamePattern = "^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,80}$",
  Description = "The name of the virtual machine"
>;

@armResourceOperations
interface Employees extends EmplOps<Extension.ScopeParameter, "EmployeesAtScope"> {}
@armResourceOperations
interface Tenants extends EmplOps<Extension.Tenant, "EmployeesAtTenant"> {}
@armResourceOperations
interface Subscriptions extends EmplOps<Extension.Subscription, "EmployeesAtSubscription"> {}


@armResourceOperations
interface VirtualMachines extends EmplOps<VirtualMachine, "EmployeesAtVirtualMachine"> {}

model MoveRequest {
  from: string;
  to: string;
}

model MoveResponse {
  movingStatus: string;
}

alias GenericResourceParameters = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;

  @path
  @segment("providers")
  @key
  providerNamespace: string;

  @path @key parentType: string;
  @path @key parentName: string;
  @path @key resourceType: string;
  @path @key resourceName: string;
};

alias ParentParameters = {
  ...Extension.ExtensionProviderNamespace<Employee>;
  ...ParentKeysOf<Employee>;
};

interface GenericOps
  extends Azure.ResourceManager.Legacy.ExtensionOperations<
      GenericResourceParameters,
      ParentParameters,
      {
        ...Extension.ExtensionProviderNamespace<Employee>,
        ...KeysOf<Employee>,
      },
      ResourceName = "EmployeesAtGenericResource"
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
    const resources = resolveArmResources(program);
    expect(resources).toMatchObject({
      resourceModels: expect.any(Array),
      providerOperations: expect.any(Array),
    });
    ok(resources.resourceModels);
    expect(resources.resourceModels).toHaveLength(2);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(5);
    const tenant = employee.resources[0];
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
      resourceName: "EmployeesAtTenant",
    });

    const scope = employee.resources[1];
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
      resourceName: "EmployeesAtScope",
    });

    const subscription = employee.resources[2];
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
      resourceName: "EmployeesAtSubscription",
    });

    const vms = employee.resources[3];
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
      resourceName: "EmployeesAtVirtualMachine",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const generics = employee.resources[4];
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
      resourceName: "EmployeesAtGenericResource",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/{providerNamespace}/{parentType}/{parentName}/{resourceType}/{resourceName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const externalVm = resources.resourceModels[1];
    expect(externalVm).toMatchObject({
      kind: "Virtual",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      resources: [],
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("collects operation information for private endpoints", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  Provisioning: "Provisioning",

  Updating: "Updating",

  Deleting: "Deleting",

  Accepted: "Accepted",

  string,
}

model PrivateEndpointConnection is PrivateEndpointConnectionResource;
alias PrivateEndpointOperations = PrivateEndpoints<PrivateEndpointConnection>;

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<Employee>;

  getPrivateEndpointConnection is PrivateEndpointOperations.Read<Employee>;
  createOrUpdatePrivateEndpointConnection is PrivateEndpointOperations.CreateOrUpdateAsync<Employee>;
  updatePrivateEndpointConnection is PrivateEndpointOperations.CustomPatchAsync<Employee>;
  deletePrivateEndpointConnection is PrivateEndpointOperations.DeleteAsync<Employee>;
  listPrivateEndpointConnections is PrivateEndpointOperations.ListByParent<Employee>;
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}

@armResourceOperations
interface Dependents {
  get is ArmResourceRead<Dependent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Dependent>;
  update is ArmCustomPatchSync<
    Dependent,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Dependent, DependentProperties>
  >;
  delete is ArmResourceDeleteSync<Dependent>;
  list is ArmResourceListByParent<Dependent>;
  getPrivateEndpointConnection is PrivateEndpointOperations.Read<Dependent>;
  createOrUpdatePrivateEndpointConnection is PrivateEndpointOperations.CreateOrUpdateAsync<Dependent>;
  updatePrivateEndpointConnection is PrivateEndpointOperations.CustomPatchAsync<Dependent>;
  deletePrivateEndpointConnection is PrivateEndpointOperations.DeleteAsync<Dependent>;
  listPrivateEndpointConnections is PrivateEndpointOperations.ListByParent<Dependent>;
}

@parentResource(Employee)
model Dependent is ProxyResource<DependentProperties> {
  ...ResourceNameParameter<Dependent>;
}

model DependentProperties {
  age: int32;
  gender: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(3);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(1);

    const mainScope = employee.resources[0];
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
        lists: [
          { operationGroup: "Employees", name: "listBySubscription", kind: "list" },
          { operationGroup: "Employees", name: "listByResourceGroup", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const dependent = resources.resourceModels[2];
    ok(dependent);
    expect(dependent).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(dependent.resources);
    expect(dependent.resources).toHaveLength(1);
    const instanceScope = dependent.resources[0];
    ok(instanceScope);
    checkResolvedOperations(instanceScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Dependents", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Dependents", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Dependents", name: "get", kind: "read" }],
          update: [{ operationGroup: "Dependents", name: "update", kind: "update" }],
        },
        lists: [{ operationGroup: "Dependents", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "dependents"],
      },
      resourceName: "Dependent",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}",
    });

    const privateEndpointConnection = resources.resourceModels[1];
    ok(privateEndpointConnection);
    ok(privateEndpointConnection.resources);
    expect(privateEndpointConnection.resources).toHaveLength(2);
    const privateForEmplInstance = privateEndpointConnection.resources[0];
    ok(privateForEmplInstance);
    checkResolvedOperations(privateForEmplInstance, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "Employees",
              name: "createOrUpdatePrivateEndpointConnection",
              kind: "createOrUpdate",
            },
          ],
          delete: [
            {
              operationGroup: "Employees",
              name: "deletePrivateEndpointConnection",
              kind: "delete",
            },
          ],
          read: [
            { operationGroup: "Employees", name: "getPrivateEndpointConnection", kind: "read" },
          ],
          update: [
            {
              operationGroup: "Employees",
              name: "updatePrivateEndpointConnection",
              kind: "update",
            },
          ],
        },
        lists: [
          { operationGroup: "Employees", name: "listPrivateEndpointConnections", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "privateEndpointConnections"],
      },
      resourceName: "EmployeePrivateEndpointConnection",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/privateEndpointConnections/{privateEndpointConnectionName}",
    });

    const privateForDepInstance = privateEndpointConnection.resources[1];
    ok(privateForDepInstance);

    checkResolvedOperations(privateForDepInstance, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "Dependents",
              name: "createOrUpdatePrivateEndpointConnection",
              kind: "createOrUpdate",
            },
          ],
          delete: [
            {
              operationGroup: "Dependents",
              name: "deletePrivateEndpointConnection",
              kind: "delete",
            },
          ],
          read: [
            { operationGroup: "Dependents", name: "getPrivateEndpointConnection", kind: "read" },
          ],
          update: [
            {
              operationGroup: "Dependents",
              name: "updatePrivateEndpointConnection",
              kind: "update",
            },
          ],
        },
        lists: [
          { operationGroup: "Dependents", name: "listPrivateEndpointConnections", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "dependents", "privateEndpointConnections"],
      },
      resourceName: "DependentPrivateEndpointConnection",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}/privateEndpointConnections/{privateEndpointConnectionName}",
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("allows overriding resource name for private endpoints", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  Provisioning: "Provisioning",

  Updating: "Updating",

  Deleting: "Deleting",

  Accepted: "Accepted",

  string,
}

model PrivateEndpointConnection is PrivateEndpointConnectionResource;
alias PrivateEndpointOperations = PrivateEndpoints<PrivateEndpointConnection, "EmployeePrivate">;

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<Employee>;

  getPrivateEndpointConnection is PrivateEndpointOperations.Read<Employee>;
  createOrUpdatePrivateEndpointConnection is PrivateEndpointOperations.CreateOrUpdateAsync<Employee>;
  updatePrivateEndpointConnection is PrivateEndpointOperations.CustomPatchAsync<Employee>;
  deletePrivateEndpointConnection is PrivateEndpointOperations.DeleteAsync<Employee>;
  listPrivateEndpointConnections is PrivateEndpointOperations.ListByParent<Employee>;
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}

`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(2);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(1);

    const mainScope = employee.resources[0];
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
        lists: [
          { operationGroup: "Employees", name: "listBySubscription", kind: "list" },
          { operationGroup: "Employees", name: "listByResourceGroup", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const privateEndpointConnection = resources.resourceModels[1];
    ok(privateEndpointConnection);
    ok(privateEndpointConnection.resources);
    expect(privateEndpointConnection.resources).toHaveLength(1);
    const privateForEmplInstance = privateEndpointConnection.resources[0];
    ok(privateForEmplInstance);
    checkResolvedOperations(privateForEmplInstance, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "Employees",
              name: "createOrUpdatePrivateEndpointConnection",
              kind: "createOrUpdate",
            },
          ],
          delete: [
            {
              operationGroup: "Employees",
              name: "deletePrivateEndpointConnection",
              kind: "delete",
            },
          ],
          read: [
            { operationGroup: "Employees", name: "getPrivateEndpointConnection", kind: "read" },
          ],
          update: [
            {
              operationGroup: "Employees",
              name: "updatePrivateEndpointConnection",
              kind: "update",
            },
          ],
        },
        lists: [
          { operationGroup: "Employees", name: "listPrivateEndpointConnections", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "privateEndpointConnections"],
      },
      resourceName: "EmployeePrivate",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/privateEndpointConnections/{privateEndpointConnectionName}",
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("collects operation information for private links", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  Provisioning: "Provisioning",

  Updating: "Updating",

  Deleting: "Deleting",

  Accepted: "Accepted",

  string,
}

model PrivateLinkResource is PrivateLink;
alias PrivateLinkOperations = PrivateLinks<PrivateLinkResource>;

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<Employee>;
}

@armResourceOperations(PrivateLinkResource)
interface EmployeePrivateLinks {
  list is PrivateLinkOperations.ListByParent<Employee>;
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}

@armResourceOperations
interface Dependents {
  get is ArmResourceRead<Dependent>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Dependent>;
  update is ArmCustomPatchSync<
    Dependent,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Dependent, DependentProperties>
  >;
  delete is ArmResourceDeleteSync<Dependent>;
  list is ArmResourceListByParent<Dependent>;
}

@armResourceOperations(PrivateLinkResource)
interface DependentPrivateLinks {
  list is PrivateLinkOperations.ListByParent<Dependent>;
}

@parentResource(Employee)
model Dependent is ProxyResource<DependentProperties> {
  ...ResourceNameParameter<Dependent>;
}

model DependentProperties {
  age: int32;
  gender: string;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(3);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(1);

    const mainScope = employee.resources[0];
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
        lists: [
          { operationGroup: "Employees", name: "listBySubscription", kind: "list" },
          { operationGroup: "Employees", name: "listByResourceGroup", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const dependent = resources.resourceModels[2];
    ok(dependent);
    expect(dependent).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(dependent.resources);
    expect(dependent.resources).toHaveLength(1);
    const instanceScope = dependent.resources[0];
    ok(instanceScope);
    checkResolvedOperations(instanceScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Dependents", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Dependents", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Dependents", name: "get", kind: "read" }],
          update: [{ operationGroup: "Dependents", name: "update", kind: "update" }],
        },
        lists: [{ operationGroup: "Dependents", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "dependents"],
      },
      resourceName: "Dependent",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}",
    });

    const privateLink = resources.resourceModels[1];
    ok(privateLink);
    ok(privateLink.resources);
    expect(privateLink.resources).toHaveLength(2);
    const privateForEmplInstance = privateLink.resources[0];
    ok(privateForEmplInstance);
    checkResolvedOperations(privateForEmplInstance, {
      operations: {
        lists: [{ operationGroup: "EmployeePrivateLinks", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "privateLinkResources"],
      },
      resourceName: "EmployeePrivateLinkResource",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/privateLinkResources/{name}",
    });

    const privateForDepInstance = privateLink.resources[1];
    ok(privateForDepInstance);

    checkResolvedOperations(privateForDepInstance, {
      operations: {
        lists: [{ operationGroup: "DependentPrivateLinks", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "dependents", "privateLinkResources"],
      },
      resourceName: "DependentPrivateLinkResource",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}/privateLinkResources/{name}",
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("allows overriding resource name for private links", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;


  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  ResourceProvisioningState,

  Provisioning: "Provisioning",

  Updating: "Updating",

  Deleting: "Deleting",

  Accepted: "Accepted",

  string,
}

model PrivateLinkResource is PrivateLink;
alias PrivateLinkOperations = PrivateLinks<PrivateLinkResource>;

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteSync<Employee>;
  listByResourceGroup is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscription<Employee>;
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;

  checkExistence is ArmResourceCheckExistence<Employee>;
}

@armResourceOperations(PrivateLinkResource)
interface EmployeePrivateLinks {
  list is PrivateLinkOperations.ListByParent<Employee, OverrideResourceName = "PrivateLinkForEmployee">;
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(2);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(1);

    const mainScope = employee.resources[0];
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
        lists: [
          { operationGroup: "Employees", name: "listBySubscription", kind: "list" },
          { operationGroup: "Employees", name: "listByResourceGroup", kind: "list" },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    });

    const privateLink = resources.resourceModels[1];
    ok(privateLink);
    ok(privateLink.resources);
    expect(privateLink.resources).toHaveLength(1);
    const privateForEmplInstance = privateLink.resources[0];
    ok(privateForEmplInstance);
    checkResolvedOperations(privateForEmplInstance, {
      operations: {
        lists: [{ operationGroup: "EmployeePrivateLinks", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "privateLinkResources"],
      },
      resourceName: "PrivateLinkForEmployee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/privateLinkResources/{name}",
    });

    checkArmOperationsHas(resources.providerOperations, [
      { operationGroup: "Employees", name: "checkExistence", kind: "other" },
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("collects operation information for legacy endpoints", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_20_01_preview: "2021-10-01-preview",
}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
/** A ContosoProviderHub resource */
model Employee is ProxyResource<EmployeeProperties> {
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

alias EmployeeRoomOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...ResourceGroupParameter;
    ...Azure.ResourceManager.Legacy.Provider;

    /** The name of the API Management service. */
    @path
    @segment("buildings")
    @key
    @pattern("^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$")
    buildingName: string;

    /** API identifier. Must be unique in the current API Management service instance. */
    @path
    @segment("rooms")
    @key
    roomId: string;
  },
  {
    /** Diagnostic identifier. Must be unique in the current API Management service instance. */
    @path
    @segment("employeeResources")
    @key
    @pattern("^[^*#&+:<>?]+$")
    employeeId: string;
  }
>;

alias EmployeeBuildingOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...ResourceGroupParameter;
    ...Azure.ResourceManager.Legacy.Provider;

    /** The name of the API Management service. */
    @path
    @segment("buildings")
    @key
    @pattern("^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$")
    buildingName: string;
  },
  {
    /** Diagnostic identifier. Must be unique in the current API Management service instance. */
    @path
    @segment("employeeResources")
    @key
    @pattern("^[^*#&+:<>?]+$")
    employeeId: string;
  }
>;

@armResourceOperations
interface EmployeesByBuilding {
  get is EmployeeBuildingOps.Read<Employee>;
  createOrUpdate is EmployeeBuildingOps.CreateOrUpdateAsync<Employee>;
  update is EmployeeBuildingOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is EmployeeBuildingOps.DeleteSync<Employee>;
  list is EmployeeBuildingOps.List<Employee>;
  /** A sample resource action that move employee to different location */
  move is EmployeeBuildingOps.ActionSync<Employee, MoveRequest, MoveResponse>;
}

@armResourceOperations
interface EmployeesByRoom {
  get is EmployeeRoomOps.Read<Employee>;
  createOrUpdate is EmployeeRoomOps.CreateOrUpdateAsync<Employee>;
  update is EmployeeRoomOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is EmployeeRoomOps.DeleteSync<Employee>;
  list is EmployeeRoomOps.List<Employee>;
  /** A sample resource action that move employee to different location */
  move is EmployeeRoomOps.ActionSync<Employee, MoveRequest, MoveResponse>;
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
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(1);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    const buildingScope = employee.resources[0];

    ok(buildingScope);
    checkResolvedOperations(buildingScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "EmployeesByBuilding",
              name: "createOrUpdate",
              kind: "createOrUpdate",
            },
          ],
          delete: [{ operationGroup: "EmployeesByBuilding", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "EmployeesByBuilding", name: "get", kind: "read" }],
          update: [{ operationGroup: "EmployeesByBuilding", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "EmployeesByBuilding", name: "move", kind: "action" }],
        lists: [{ operationGroup: "EmployeesByBuilding", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "employeeResources"],
      },
      resourceName: "BuildingsEmployeeResources",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/employeeResources/{employeeId}",
    });

    const roomScope = employee.resources[1];

    ok(roomScope);
    checkResolvedOperations(roomScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "EmployeesByRoom", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "EmployeesByRoom", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "EmployeesByRoom", name: "get", kind: "read" }],
          update: [{ operationGroup: "EmployeesByRoom", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "EmployeesByRoom", name: "move", kind: "action" }],
        lists: [{ operationGroup: "EmployeesByRoom", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "rooms", "employeeResources"],
      },
      resourceName: "RoomsEmployeeResources",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}/employeeResources/{employeeId}",
    });
  });

  it("allows overriding resource name for legacy endpoints", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_20_01_preview: "2021-10-01-preview",
}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
/** A ContosoProviderHub resource */
model Employee is ProxyResource<EmployeeProperties> {
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

alias EmployeeBuildingOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...ResourceGroupParameter;
    ...Azure.ResourceManager.Legacy.Provider;

    /** The name of the API Management service. */
    @path
    @segment("buildings")
    @key
    @pattern("^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$")
    buildingName: string;
  },
  {
    /** Diagnostic identifier. Must be unique in the current API Management service instance. */
    @path
    @segment("employeeResources")
    @key
    @pattern("^[^*#&+:<>?]+$")
    employeeId: string;
  },
  ResourceName = "EmployeesForBuilding",
>;

@armResourceOperations
interface EmployeesByBuilding {
  get is EmployeeBuildingOps.Read<Employee>;
  createOrUpdate is EmployeeBuildingOps.CreateOrUpdateAsync<Employee>;
  update is EmployeeBuildingOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is EmployeeBuildingOps.DeleteSync<Employee>;
  list is EmployeeBuildingOps.List<Employee>;
  /** A sample resource action that move employee to different location */
  move is EmployeeBuildingOps.ActionSync<Employee, MoveRequest, MoveResponse>;
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
`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(1);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    expect(employee.resources).toHaveLength(1);
    const buildingScope = employee.resources[0];

    ok(buildingScope);
    checkResolvedOperations(buildingScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "EmployeesByBuilding",
              name: "createOrUpdate",
              kind: "createOrUpdate",
            },
          ],
          delete: [{ operationGroup: "EmployeesByBuilding", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "EmployeesByBuilding", name: "get", kind: "read" }],
          update: [{ operationGroup: "EmployeesByBuilding", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "EmployeesByBuilding", name: "move", kind: "action" }],
        lists: [{ operationGroup: "EmployeesByBuilding", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "employeeResources"],
      },
      resourceName: "EmployeesForBuilding",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/employeeResources/{employeeId}",
    });
  });
  it("collects operation information for routed endpoints", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.ContosoProviderHub;

/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2021_20_01_preview: "2021-10-01-preview",
}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
/** A ContosoProviderHub resource */
model Employee is ProxyResource<EmployeeProperties> {
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

alias BuildingParams = {
  ...ApiVersionParameter;
  ...SubscriptionIdParameter;
  ...ResourceGroupParameter;

  /** The name of the API Management service. */
  @path
  @segment("buildings")
  @key
  @pattern("^[a-zA-Z](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$")
  buildingName: string;
};

alias EmployeeParams = {
  /** Diagnostic identifier. Must be unique in the current API Management service instance. */
  @path
  @segment("employeeResources")
  @key
  @pattern("^[^*#&+:<>?]+$")
  employeeId: string;
};

alias EmployeeRoomOps = Azure.ResourceManager.Legacy.RoutedOperations<
  {
    ...BuildingParams;

    /** API identifier. Must be unique in the current API Management service instance. */
    @path
    @segment("rooms")
    @key
    roomId: string;
  },
  EmployeeParams,
  ResourceRoute = #{
    route: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}/employeeResources",
  }
>;

alias EmployeeBuildingOps = Azure.ResourceManager.Legacy.RoutedOperations<
  BuildingParams,
  EmployeeParams,
  ResourceRoute = #{
    route: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/employeeResources",
  }
>;

@armResourceOperations(#{ allowStaticRoutes: true })
interface EmployeesByBuilding {
  get is EmployeeBuildingOps.Read<Employee>;
  createOrUpdate is EmployeeBuildingOps.CreateOrUpdateAsync<Employee>;
  update is EmployeeBuildingOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      Employee,
      EmployeeProperties
    >
  >;
  delete is EmployeeBuildingOps.DeleteSync<Employee>;
  list is EmployeeBuildingOps.List<Employee>;
  /** A sample resource action that move employee to different location */
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/employeeResources/{employeeId}/otherResource/thirdResource/{addedId}/move")
  move is EmployeeBuildingOps.ActionSync<
    Employee,
    MoveRequest,
    MoveResponse,
    Parameters = {
      @doc("an additional parameter")
      @path
      @key
      addedId: string;
    }
  >;
}

@armResourceOperations(#{ allowStaticRoutes: true })
interface EmployeesByRoom {
  get is EmployeeRoomOps.Read<Employee>;
  createOrUpdate is EmployeeRoomOps.CreateOrUpdateAsync<Employee>;
  update is EmployeeRoomOps.CustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      Employee,
      EmployeeProperties
    >
  >;
  delete is EmployeeRoomOps.DeleteSync<Employee>;
  list is EmployeeRoomOps.List<Employee>;
  /** A sample resource action that move employee to different location */
  @route("/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}/employeeResources/{employeeId}/roomMove/move")
  move is EmployeeRoomOps.ActionSync<Employee, MoveRequest, MoveResponse>;
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

`);
    const resources = resolveArmResources(program);
    expect(resources).toBeDefined();
    expect(resources.resourceModels).toBeDefined();
    expect(resources.resourceModels).toHaveLength(1);
    ok(resources.resourceModels);
    const employee = resources.resourceModels[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      resources: expect.any(Array),
    });
    ok(employee.resources);
    const buildingScope = employee.resources[0];

    ok(buildingScope);
    checkResolvedOperations(buildingScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "EmployeesByBuilding",
              name: "createOrUpdate",
              kind: "createOrUpdate",
            },
          ],
          delete: [{ operationGroup: "EmployeesByBuilding", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "EmployeesByBuilding", name: "get", kind: "read" }],
          update: [{ operationGroup: "EmployeesByBuilding", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "EmployeesByBuilding", name: "move", kind: "action" }],
        lists: [{ operationGroup: "EmployeesByBuilding", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "employeeResources"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/employeeResources/{employeeId}",
      resourceName: "BuildingsEmployeeResources",
    });

    const roomScope = employee.resources[1];

    ok(roomScope);
    checkResolvedOperations(roomScope, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "EmployeesByRoom", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "EmployeesByRoom", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "EmployeesByRoom", name: "get", kind: "read" }],
          update: [{ operationGroup: "EmployeesByRoom", name: "update", kind: "update" }],
        },
        actions: [{ operationGroup: "EmployeesByRoom", name: "move", kind: "action" }],
        lists: [{ operationGroup: "EmployeesByRoom", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "rooms", "employeeResources"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}/employeeResources/{employeeId}",
      resourceName: "RoomsEmployeeResources",
    });
  });
});
