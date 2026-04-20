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
    checkExistence?: ArmOperationCheck[];
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
    if (check.operations.lifecycle.checkExistence) {
      checkArmOperationsHas(
        operations.operations.lifecycle.checkExistence,
        check.operations.lifecycle.checkExistence,
      );
    } else {
      expect(operations.operations.lifecycle.checkExistence).toBeUndefined();
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
      source: {
        resourceType: ResourceType;
        resourceInstancePath: string;
        resourceNameIsExplicit?: boolean;
      };
      target: {
        resourceType: ResourceType;
        resourceInstancePath: string;
        resourceNameIsExplicit?: boolean;
      };
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
      {
        title: "operations with different scopes but explicit resource names",
        source: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/bars/{barName}",
          resourceNameIsExplicit: true,
        },
        target: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath: "/providers/Microsoft.Foo/bars/{barName}",
          resourceNameIsExplicit: true,
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
      source: {
        resourceType: ResourceType;
        resourceInstancePath: string;
        resourceName?: string;
        resourceNameIsExplicit?: boolean;
      };
      target: {
        resourceType: ResourceType;
        resourceInstancePath: string;
        resourceName?: string;
        resourceNameIsExplicit?: boolean;
      };
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
      {
        title: "operations with different scopes (subscription vs tenant) and no explicit name",
        source: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/bars/{barName}",
          resourceName: "Bars",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath: "/providers/Microsoft.Foo/bars/{barName}",
          resourceName: "Bars",
        },
      },
      {
        title:
          "operations with different scopes (resource group vs subscription) and no explicit name",
        source: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Foo/bars/{barName}",
          resourceName: "Bars",
        },
        target: {
          resourceType: {
            provider: "Microsoft.Foo",
            types: ["bars"],
          },
          resourceInstancePath:
            "/subscriptions/{subscriptionId}/providers/Microsoft.Foo/bars/{barName}",
          resourceName: "Bars",
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(1);
    const employee = provider.resources![0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: undefined,
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    checkArmOperationsHas(provider.providerOperations, [
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
      },
      "GenericEmployee"
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
    const provider = resolveArmResources(program);
    expect(provider).toMatchObject({
      providerOperations: expect.any(Array),
    });
    ok(provider.resources);
    expect(provider.resources).toHaveLength(11);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Tenant",
      parent: undefined,
    });

    checkResolvedOperations(employee, {
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

    const scope = provider.resources[1];
    ok(scope);
    expect(scope).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Scope",
      parent: undefined,
    });
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

    const subscription = provider.resources[2];
    ok(subscription);
    expect(subscription).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Subscription",
      parent: undefined,
    });
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

    const managementGroups = provider.resources[3];
    ok(managementGroups);
    expect(managementGroups).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ManagementGroup",
      parent: undefined,
    });
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

    const resourceGroup = provider.resources[4];
    ok(resourceGroup);
    expect(resourceGroup).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
    });
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

    const vms = provider.resources[5];
    ok(vms);
    expect(vms).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: expect.objectContaining({
        resourceName: "VirtualMachine",
        resourceType: {
          provider: "Microsoft.Compute",
          types: ["virtualMachines"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}",
      }),
      parent: undefined,
    });
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

    const scaleSetVms = provider.resources[6];
    ok(scaleSetVms);
    expect(scaleSetVms).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
    });
    expect(scaleSetVms.scope).toBeDefined();
    expect(scaleSetVms.scope).toMatchObject({
      resourceName: "VirtualMachineScaleSetVm",
      resourceType: {
        provider: "Microsoft.Compute",
        types: ["virtualMachineScaleSets", "virtualMachineScaleSetVms"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachineScaleSets/{scaleSetName}/virtualMachineScaleSetVms/{scaleSetVmName}",
    });
    checkResolvedOperations(scaleSetVms, {
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
    const generics = provider.resources[7];
    ok(generics);
    expect(generics).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ExternalResource",
    });
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

    const vmExternal = provider.resources[8];
    ok(vmExternal);
    expect(vmExternal).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      scope: "ResourceGroup",
      resourceName: "VirtualMachine",
      resourceType: {
        provider: "Microsoft.Compute",
        types: ["virtualMachines"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}",
    });

    const scaleSetVmExternal = provider.resources[9];
    ok(scaleSetVmExternal);
    expect(scaleSetVmExternal).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      scope: "ResourceGroup",
      resourceName: "VirtualMachineScaleSetVm",
      resourceType: {
        provider: "Microsoft.Compute",
        types: ["virtualMachineScaleSets", "virtualMachineScaleSetVms"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachineScaleSets/{scaleSetName}/virtualMachineScaleSetVms/{scaleSetVmName}",
    });

    const scaleSetExternal = provider.resources[10];
    ok(scaleSetExternal);
    expect(scaleSetExternal).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.Compute",
      type: expect.anything(),
      scope: "ResourceGroup",
      resourceName: "VirtualMachineScaleSet",
      resourceType: {
        provider: "Microsoft.Compute",
        types: ["virtualMachineScaleSets"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachineScaleSets/{scaleSetName}",
    });

    checkArmOperationsHas(provider.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("uses extension resource name as default for ScopeParameter scope", async () => {
    const { program } = await Tester.compile(`
      using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

model WidgetResource
  is Azure.ResourceManager.ExtensionResource<WidgetResourceProperties> {
  ...ResourceNameParameter<
    Resource = WidgetResource,
    KeyName = "widgetName",
    SegmentName = "widgets",
    NamePattern = ""
  >;
}

model WidgetResourceProperties {
  widgetId: string;
}

@armResourceOperations
interface WidgetResources {
  get is Extension.Read<Extension.ScopeParameter, WidgetResource>;
}
      `);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    ok(provider.resources);
    const widget = provider.resources.find(
      (r) =>
        r.resourceInstancePath ===
        "/{scope}/providers/Microsoft.ContosoProviderHub/widgets/{widgetName}",
    );
    ok(widget);
    expect(widget.resourceName).toEqual("WidgetResource");
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
    const provider = resolveArmResources(program);
    expect(provider).toMatchObject({
      resources: expect.any(Array),
      providerOperations: expect.any(Array),
    });
    ok(provider.resources);
    expect(provider.resources).toHaveLength(6);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Tenant",
    });

    checkResolvedOperations(employee, {
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

    const scope = provider.resources[1];
    ok(scope);
    expect(scope).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Scope",
    });
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

    const subscription = provider.resources[2];
    ok(subscription);
    expect(subscription).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),

      scope: "Subscription",
    });
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

    const vms = provider.resources[3];
    ok(vms);
    expect(vms).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),

      scope: expect.objectContaining({
        resourceName: "VirtualMachine",
        resourceType: {
          provider: "Microsoft.Compute",
          types: ["virtualMachines"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}",
      }),
      parent: undefined,
    });
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

    const generics = provider.resources[4];
    ok(generics);
    expect(generics).toMatchObject({
      kind: "Extension",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),

      scope: "ExternalResource",
    });
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

    checkArmOperationsHas(provider.providerOperations, [
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(4);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),

      scope: "ResourceGroup",
    });
    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    const dependent = provider.resources[3];
    ok(dependent);
    expect(dependent).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });

    checkResolvedOperations(dependent, {
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

    const privateEndpointConnection = provider.resources[1];
    ok(privateEndpointConnection);
    expect(privateEndpointConnection).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });
    checkResolvedOperations(privateEndpointConnection, {
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

    const privateForDepInstance = provider.resources[2];
    ok(privateForDepInstance);
    expect(privateForDepInstance).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Dependent",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees", "dependents"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}",
      }),
    });

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

    checkArmOperationsHas(provider.providerOperations, [
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(2);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    const privateEndpointConnection = provider.resources[1];
    ok(privateEndpointConnection);
    expect(privateEndpointConnection).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });

    checkResolvedOperations(privateEndpointConnection, {
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

    checkArmOperationsHas(provider.providerOperations, [
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(4);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    const dependent = provider.resources[3];
    ok(dependent);
    expect(dependent).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });

    checkResolvedOperations(dependent, {
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

    const privateLink = provider.resources[1];
    ok(privateLink);
    expect(privateLink).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });
    checkResolvedOperations(privateLink, {
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

    const privateForDepInstance = provider.resources[2];
    ok(privateForDepInstance);
    expect(privateForDepInstance).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Dependent",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees", "dependents"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/dependents/{dependentName}",
      }),
    });

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

    checkArmOperationsHas(provider.providerOperations, [
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
@parentResource(SubscriptionLocationResource)
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
  listByLocation is ArmResourceListByParent<Employee>;
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(3);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Subscription",
      parent: expect.objectContaining({
        resourceName: "Location",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}",
      }),
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
        },
        actions: [{ operationGroup: "Employees", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Employees", name: "listByLocation", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations", "employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}",
    });

    const privateLink = provider.resources[1];
    ok(privateLink);
    expect(privateLink).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "Subscription",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations", "employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}",
      }),
    });

    checkResolvedOperations(privateLink, {
      operations: {
        lists: [{ operationGroup: "EmployeePrivateLinks", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations", "employees", "privateLinkResources"],
      },
      resourceName: "PrivateLinkForEmployee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}/privateLinkResources/{name}",
    });
    const location = provider.resources[2];
    ok(location);
    expect(location).toMatchObject({
      type: expect.anything(),
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      scope: "Subscription",
      resourceName: "Location",
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/locations/{location}",
    });

    checkArmOperationsHas(provider.providerOperations, [
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(4);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Building",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["buildings"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
      }),
    });

    checkResolvedOperations(employee, {
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

    const roomScope = provider.resources[1];
    expect(roomScope).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Room",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["buildings", "rooms"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}",
      }),
    });

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

    const building = provider.resources[2];
    ok(building);
    expect(building).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      operations: {
        lifecycle: {},
        actions: [],
        lists: [],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings"],
      },
      resourceName: "Building",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
    });
    const room = provider.resources[3];
    ok(room);
    expect(room).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      operations: {
        lifecycle: {},
        actions: [],
        lists: [],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "rooms"],
      },
      resourceName: "Room",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}",
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(2);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Building",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["buildings"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
      }),
    });

    checkResolvedOperations(employee, {
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
    const building = provider.resources[1];
    ok(building);
    expect(building).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      operations: {
        lifecycle: {},
        actions: [],
        lists: [],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings"],
      },
      resourceName: "Building",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(4);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Building",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["buildings"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
      }),
    });

    checkResolvedOperations(employee, {
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

    const roomScope = provider.resources[1];

    ok(roomScope);
    expect(roomScope).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Room",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["buildings", "rooms"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}",
      }),
    });
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
    const building = provider.resources[2];
    ok(building);
    expect(building).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      operations: {
        lifecycle: {},
        actions: [],
        lists: [],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings"],
      },
      resourceName: "Building",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}",
    });
    const room = provider.resources[3];
    ok(room);
    expect(room).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      operations: {
        lifecycle: {},
        actions: [],
        lists: [],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["buildings", "rooms"],
      },
      resourceName: "Room",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/buildings/{buildingName}/rooms/{roomId}",
    });
  });
  it("collects operation information for networkSecurityPerimeters", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@versioned(Versions)
@armProviderNamespace
namespace Microsoft.ContosoProviderHub;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2025_11_19_preview: "2025-11-19-preview",
}

interface Operations extends Azure.ResourceManager.Operations {}

// For more information about the proxy vs tracked,
// see https://armwiki.azurewebsites.net/rp_onboarding/tracked_vs_proxy_resources.html?q=proxy%20resource
@parentResource(ResourceGroupLocationResource)
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

model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
alias NspConfigurationOperations = Azure.ResourceManager.NspConfigurations<NetworkSecurityPerimeterConfiguration>;

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
  update is ArmCustomPatchSync<
    Employee,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<Employee, EmployeeProperties>
  >;
  delete is ArmResourceDeleteSync<Employee>;
  listByLocation is ArmResourceListByParent<Employee>;
  move is ArmResourceActionSync<Employee, MoveRequest, MoveResponse>;
  checkExistence is ArmResourceCheckExistence<Employee>;
}

@armResourceOperations(PrivateLinkResource)
interface EmployeeNetworkSecurityPerimeterConfigurations {
  list is NspConfigurationOperations.ListByParent<Employee>;
  get is NspConfigurationOperations.Read<Employee>;
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
interface DependentNetworkSecurityPerimeterConfigurations {
  list is NspConfigurationOperations.ListByParent<Dependent>;
  get is NspConfigurationOperations.Read<Dependent>;
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(5);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Location",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}",
      }),
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
        },
        actions: [{ operationGroup: "Employees", name: "move", kind: "action" }],
        lists: [{ operationGroup: "Employees", name: "listByLocation", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations", "employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}",
    });

    const dependent = provider.resources[3];
    ok(dependent);
    expect(dependent).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations", "employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}",
      }),
    });

    checkResolvedOperations(dependent, {
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
        types: ["locations", "employees", "dependents"],
      },
      resourceName: "Dependent",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}/dependents/{dependentName}",
    });

    const nsp = provider.resources[1];
    ok(nsp);
    expect(nsp).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations", "employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}",
      }),
    });
    checkResolvedOperations(nsp, {
      operations: {
        lists: [
          {
            operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
            name: "list",
            kind: "list",
          },
        ],
        lifecycle: {
          read: [
            {
              operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
              name: "get",
              kind: "read",
            },
          ],
        },
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations", "employees", "networkSecurityPerimeterConfigurations"],
      },
      resourceName: "EmployeeNetworkSecurityPerimeterConfiguration",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}/networkSecurityPerimeterConfigurations/{name}",
    });

    const perimeterForDepInstance = provider.resources[2];
    ok(perimeterForDepInstance);
    expect(perimeterForDepInstance).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Dependent",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["locations", "employees", "dependents"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}/dependents/{dependentName}",
      }),
    });

    checkResolvedOperations(perimeterForDepInstance, {
      operations: {
        lists: [
          {
            operationGroup: "DependentNetworkSecurityPerimeterConfigurations",
            name: "list",
            kind: "list",
          },
        ],
        lifecycle: {
          read: [
            {
              operationGroup: "DependentNetworkSecurityPerimeterConfigurations",
              name: "get",
              kind: "read",
            },
          ],
        },
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["locations", "employees", "dependents", "networkSecurityPerimeterConfigurations"],
      },
      resourceName: "DependentNetworkSecurityPerimeterConfiguration",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/locations/{location}/employees/{employeeName}/dependents/{dependentName}/networkSecurityPerimeterConfigurations/{name}",
    });

    checkArmOperationsHas(provider.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("allows overriding resource name for network security perimeters", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@versioned(Versions)
@armProviderNamespace
namespace Microsoft.ContosoProviderHub;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2025_11_19_preview: "2025-11-19-preview",
}

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

model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
alias NspConfigurationOperations = Azure.ResourceManager.NspConfigurations<NetworkSecurityPerimeterConfiguration, ResourceName = "NetworkSecurityPerimeterConfiguration">;

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
interface EmployeeNetworkSecurityPerimeterConfigurations {
  list is NspConfigurationOperations.ListByParent<Employee>;
  get is NspConfigurationOperations.Read<Employee>;
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
interface DependentNetworkSecurityPerimeterConfigurations {
  list is NspConfigurationOperations.ListByParent<Dependent>;
  get is NspConfigurationOperations.Read<Dependent>;
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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(4);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: undefined,
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    const nsp = provider.resources[1];
    ok(nsp);
    expect(nsp).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });
    checkResolvedOperations(nsp, {
      operations: {
        lists: [
          {
            operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
            name: "list",
            kind: "list",
          },
        ],
        lifecycle: {
          read: [
            {
              operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
              name: "get",
              kind: "read",
            },
          ],
        },
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "networkSecurityPerimeterConfigurations"],
      },
      resourceName: "NetworkSecurityPerimeterConfiguration",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/networkSecurityPerimeterConfigurations/{name}",
    });

    checkArmOperationsHas(provider.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });
  it("allows overriding parameter name for network security perimeters", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

@versioned(Versions)
@armProviderNamespace
namespace Microsoft.ContosoProviderHub;
/** Contoso API versions */
enum Versions {
  /** 2021-10-01-preview version */
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v2025_11_19_preview: "2025-11-19-preview",
}

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

model NetworkSecurityPerimeterConfiguration is Azure.ResourceManager.NspConfiguration;
alias NspConfigurationOperations = Azure.ResourceManager.NspConfigurations<NetworkSecurityPerimeterConfiguration, ResourceName = "NetworkSecurityPerimeterConfiguration", NspConfigurationKeyName="nspName">;

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

/** A reconcile request for NSP configuration */
model ReconcileRequest {
  /** Whether to force the reconcile */
  force: boolean;
}

/** A reconcile response for NSP configuration */
model ReconcileResponse {
  /** The status of the reconcile */
  status: string;
}
@armResourceOperations(NetworkSecurityPerimeterConfiguration)
interface EmployeeNetworkSecurityPerimeterConfigurations {
  list is NspConfigurationOperations.ListByParent<Employee>;
  get is NspConfigurationOperations.Read<Employee>;
  reconcile is NspConfigurationOperations.Action<
    Employee,
    ReconcileRequest,
    ReconcileResponse,
    KeyName = "reconciledNspName"
  >;
}

model MoveRequest {
  from: string;

  to: string;
}

model MoveResponse {
  movingStatus: string;
}

`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    expect(provider.resources).toHaveLength(2);
    ok(provider.resources);
    const employee = provider.resources[0];
    ok(employee);
    expect(employee).toMatchObject({
      kind: "Tracked",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: undefined,
    });

    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
          update: [{ operationGroup: "Employees", name: "update", kind: "update" }],
          checkExistence: [
            { operationGroup: "Employees", name: "checkExistence", kind: "checkExistence" },
          ],
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

    const nsp = provider.resources[1];
    ok(nsp);
    expect(nsp).toMatchObject({
      kind: "Proxy",
      providerNamespace: "Microsoft.ContosoProviderHub",
      type: expect.anything(),
      scope: "ResourceGroup",
      parent: expect.objectContaining({
        resourceName: "Employee",
        resourceType: {
          provider: "Microsoft.ContosoProviderHub",
          types: ["employees"],
        },
        resourceInstancePath:
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
      }),
    });
    checkResolvedOperations(nsp, {
      operations: {
        lists: [
          {
            operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
            name: "list",
            kind: "list",
          },
        ],
        lifecycle: {
          read: [
            {
              operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
              name: "get",
              kind: "read",
              path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/networkSecurityPerimeterConfigurations/{nspName}",
            },
          ],
        },
        actions: [
          {
            operationGroup: "EmployeeNetworkSecurityPerimeterConfigurations",
            name: "reconcile",
            kind: "action",
            path: "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/networkSecurityPerimeterConfigurations/{reconciledNspName}/reconcile",
          },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["employees", "networkSecurityPerimeterConfigurations"],
      },
      resourceName: "NetworkSecurityPerimeterConfiguration",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}/networkSecurityPerimeterConfigurations/{name}",
    });

    checkArmOperationsHas(provider.providerOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });

  it("defines multiple ARM services", async () => {
    const { program } = await Tester.compile(`
      @service
      @armProviderNamespace
      namespace Microsoft.ServiceA {
        model ResA is TrackedResource<{}> {
          @key @segment("foos") @path name: string;
        }
        
        @armResourceOperations
        interface ResAOperations {
          get is ArmResourceRead<ResA>;
        }
      }

      @service
      @armProviderNamespace
      namespace Microsoft.ServiceB {
        model ResB is TrackedResource<{}> {
          @key @segment("foos") @path name: string;
        }

         
        @armResourceOperations
        interface ResBOperations {
          get is ArmResourceRead<ResB>;
        }
      }
    `);

    const provider = resolveArmResources(program);
    ok(provider.resources);
    expect(provider.resources).toHaveLength(2);
    const [ResA, ResB] = provider.resources;
    expect(ResA.kind).toEqual("Tracked");
    expect(ResA.resourceName).toEqual("ResA");
    expect(ResA.providerNamespace).toEqual("Microsoft.ServiceA");
    expect(ResB.kind).toEqual("Tracked");
    expect(ResB.resourceName).toEqual("ResB");
    expect(ResB.providerNamespace).toEqual("Microsoft.ServiceB");
  });

  // Regression test for https://github.com/Azure/typespec-azure/issues/3776
  it("specifying provider namespace name should be respected in routes", async () => {
    const { program } = await Tester.compile(`
      @service
      @armProviderNamespace("Provider.A")
      namespace Microsoft.ServiceA {
        model ResA is TrackedResource<{}> {
          @key @segment("foos") @path name: string;
        }
        
        @armResourceOperations
        interface ResAOperations {
          get is ArmResourceRead<ResA>;
        }
      }

      @service
      @armProviderNamespace("Provider.B")
      namespace Microsoft.ServiceB {
        model ResB is TrackedResource<{}> {
          @key @segment("foos") @path name: string;
        }

        @armResourceOperations
        interface ResBOperations {
          get is ArmResourceRead<ResB>;
        }
      }
    `);

    const provider = resolveArmResources(program);
    ok(provider.resources);
    expect(provider.resources).toHaveLength(2);
    const [ResA, ResB] = provider.resources;
    expect(ResA.resourceName).toEqual("ResA");
    expect(ResA.providerNamespace).toEqual("Provider.A");
    expect(ResA.resourceInstancePath).toEqual(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Provider.A/foos/{name}",
    );
    expect(ResB.resourceName).toEqual("ResB");
    expect(ResB.providerNamespace).toEqual("Provider.B");
    expect(ResB.resourceInstancePath).toEqual(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Provider.B/foos/{name}",
    );
  });

  const noProviderResourceGroupSpec = `
using Azure.Core;

@armProviderNamespace
namespace Microsoft.Resources;

interface Operations extends Azure.ResourceManager.Operations {}

@subscriptionResource
model ResourceGroup is TrackedResource<ResourceGroupProperties> {
  @key("resourceGroupName")
  @segment("resourceGroups")
  @path
  name: string;
}

model ResourceGroupProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ResourceProvisioningState;
}

@armResourceOperations
interface ResourceGroups {
  list is ArmResourceListByParent<ResourceGroup, Provider = {}>;
  get is ArmResourceRead<ResourceGroup, Provider = {}>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<ResourceGroup, Provider = {}>;
  update is ArmCustomPatchSync<ResourceGroup, Provider = {}>;
  delete is ArmResourceDeleteWithoutOkAsync<ResourceGroup, Provider = {}>;
}
`;

  it("generates correct paths for subscription resource without provider using empty Provider", async () => {
    const { program } = await Tester.compile(noProviderResourceGroupSpec);

    const provider = resolveArmResources(program);
    const resourceGroup = provider.resources?.find((r) => r.resourceName === "ResourceGroup");
    ok(resourceGroup, "ResourceGroup resource should be found");

    // Validate path - should NOT contain /providers/Microsoft.Resources/
    expect(resourceGroup.resourceInstancePath).toEqual(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}",
    );
  });

  it("resolveArmResources correctly identifies subscription resource without provider", async () => {
    const { program } = await Tester.compile(noProviderResourceGroupSpec);

    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    const resourceGroup = provider.resources?.find((r) => r.resourceName === "ResourceGroup");
    ok(resourceGroup, "ResourceGroup resource should exist in resolved ARM resources");
    expect(resourceGroup.resourceType.provider).toEqual("Microsoft.Resources");
    expect(resourceGroup.resourceType.types).toEqual(["resourceGroups"]);
  });

  it("versioned spec with parent-child resources does not produce duplicate resources", async () => {
    const { program } = await Tester.compile(`
using Azure.Core;

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
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    ok(provider.resources);
    // Should have exactly 2 resources (EmployeeParent and Employee), no duplicates
    expect(provider.resources).toHaveLength(2);
    const resourceNames = provider.resources.map((r) => r.resourceName);
    expect(resourceNames).toContain("EmployeeParent");
    expect(resourceNames).toContain("Employee");
  });

  it("separates cross-scope LegacyOperations with default resource names into distinct resources", async () => {
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

@subscriptionResource
model SupportTicketDetails is ProxyResource<SupportTicketProperties> {
  ...ResourceNameParameter<
    Resource = SupportTicketDetails,
    KeyName = "supportTicketName",
    SegmentName = "supportTickets",
    NamePattern = ""
  >;
}

model SupportTicketProperties {
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

// Subscription-scoped operations (includes SubscriptionIdParameter)
alias SubTicketOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  },
  {
    @segment("supportTickets")
    @key
    @TypeSpec.Http.path
    supportTicketName: string;
  }
>;

// Tenant-scoped operations (no SubscriptionIdParameter)
alias TenantTicketOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  },
  {
    @segment("supportTickets")
    @key
    @TypeSpec.Http.path
    supportTicketName: string;
  }
>;

@armResourceOperations
interface SupportTickets {
  get is SubTicketOps.Read<SupportTicketDetails>;
  list is SubTicketOps.List<SupportTicketDetails>;
}

@armResourceOperations
interface SupportTicketsNoSubscription {
  get is TenantTicketOps.Read<SupportTicketDetails>;
  list is TenantTicketOps.List<SupportTicketDetails>;
}
`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    ok(provider.resources);
    // Should produce 2 separate resources: one subscription-scoped, one tenant-scoped
    expect(provider.resources).toHaveLength(2);

    const subResource = provider.resources.find(
      (r) =>
        r.resourceInstancePath ===
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/supportTickets/{supportTicketName}",
    );
    ok(subResource);
    expect(subResource.scope).toEqual("Subscription");

    checkResolvedOperations(subResource, {
      operations: {
        lifecycle: {
          read: [{ operationGroup: "SupportTickets", name: "get", kind: "read" }],
        },
        lists: [{ operationGroup: "SupportTickets", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["supportTickets"],
      },
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/supportTickets/{supportTicketName}",
    });

    const tenantResource = provider.resources.find(
      (r) =>
        r.resourceInstancePath ===
        "/providers/Microsoft.ContosoProviderHub/supportTickets/{supportTicketName}",
    );
    ok(tenantResource);
    expect(tenantResource.scope).toEqual("Tenant");

    checkResolvedOperations(tenantResource, {
      operations: {
        lifecycle: {
          read: [{ operationGroup: "SupportTicketsNoSubscription", name: "get", kind: "read" }],
        },
        lists: [{ operationGroup: "SupportTicketsNoSubscription", name: "list", kind: "list" }],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["supportTickets"],
      },
      resourceInstancePath:
        "/providers/Microsoft.ContosoProviderHub/supportTickets/{supportTicketName}",
    });
  });

  it("merges cross-scope LegacyOperations with explicit same resource name into one resource", async () => {
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

@subscriptionResource
model SupportTicketDetails is ProxyResource<SupportTicketProperties> {
  ...ResourceNameParameter<
    Resource = SupportTicketDetails,
    KeyName = "supportTicketName",
    SegmentName = "supportTickets",
    NamePattern = ""
  >;
}

model SupportTicketProperties {
  description?: string;
}

interface Operations extends Azure.ResourceManager.Operations {}

// Subscription-scoped operations with explicit resource name
alias SubTicketOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  },
  {
    @segment("supportTickets")
    @key
    @TypeSpec.Http.path
    supportTicketName: string;
  },
  ResourceName = "SupportTickets",
>;

// Tenant-scoped operations with same explicit resource name
alias TenantTicketOps = Azure.ResourceManager.Legacy.LegacyOperations<
  {
    ...ApiVersionParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  },
  {
    @segment("supportTickets")
    @key
    @TypeSpec.Http.path
    supportTicketName: string;
  },
  ResourceName = "SupportTickets",
>;

@armResourceOperations
interface SupportTickets {
  get is SubTicketOps.Read<SupportTicketDetails>;
  list is SubTicketOps.List<SupportTicketDetails>;
}

@armResourceOperations
interface SupportTicketsNoSubscription {
  get is TenantTicketOps.Read<SupportTicketDetails>;
  list is TenantTicketOps.List<SupportTicketDetails>;
}
`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    ok(provider.resources);
    // Should produce 1 merged resource since both have the same explicit resource name
    expect(provider.resources).toHaveLength(1);

    const resource = provider.resources[0];
    ok(resource);
    expect(resource.resourceName).toEqual("SupportTickets");

    // Both read operations should be present
    expect(resource.operations.lifecycle.read).toBeDefined();
    expect(resource.operations.lifecycle.read).toHaveLength(2);

    // Both list operations should be present
    expect(resource.operations.lists).toBeDefined();
    expect(resource.operations.lists).toHaveLength(2);
  });

  it("collects operation information for GenericResource with RoutedOperations", async () => {
    const { program } = await Tester.compile(`

using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@versioned(Versions)
namespace Microsoft.Resources {
  /** Contoso API versions */
  enum Versions {
    /** 2021-10-01-preview version */
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
    v2021_20_01_preview: "2021-10-01-preview",
  }

  /** A generic resource */
  model MyGenericResource
    is Azure.ResourceManager.Legacy.GenericResource<{}> {
  }

  alias genericOps = Azure.ResourceManager.Legacy.RoutedOperations<
    {
      ...ApiVersionParameter;

      @path(#{ allowReserved: true })
      @key
      @doc("The resource id")
      resourceId: string;
    },
    {}
  >;

  interface Operations extends Azure.ResourceManager.Operations {}

  @armResourceOperations
  interface GenericResourceOps {
    get is genericOps.Read<MyGenericResource>;
    createOrUpdate is genericOps.CreateOrUpdateAsync<MyGenericResource>;
    update is genericOps.CustomPatchSync<MyGenericResource, MyGenericResource>;
    delete is genericOps.DeleteWithoutOkAsync<MyGenericResource>;
    /** A sample HEAD to check resource existence */
    checkExistence is genericOps.CheckExistence<MyGenericResource>;
  }
}
`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    ok(provider.resources);
    expect(provider.resources).toHaveLength(1);

    const resource = provider.resources[0];
    ok(resource);
    expect(resource).toMatchObject({
      kind: "Other",
      providerNamespace: "Microsoft.Resources",
      type: expect.anything(),
    });

    checkResolvedOperations(resource, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            {
              operationGroup: "GenericResourceOps",
              name: "createOrUpdate",
              kind: "createOrUpdate",
            },
          ],
          delete: [{ operationGroup: "GenericResourceOps", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "GenericResourceOps", name: "get", kind: "read" }],
          update: [{ operationGroup: "GenericResourceOps", name: "update", kind: "update" }],
          checkExistence: [
            {
              operationGroup: "GenericResourceOps",
              name: "checkExistence",
              kind: "checkExistence",
            },
          ],
        },
      },
      resourceType: {
        provider: "Microsoft.Resources",
        types: [],
      },
      resourceInstancePath: "/{resourceId}",
      resourceName: "MyGenericResource",
    });
  });

  it.each(["default", "current"])(
    "provides singleton information for @singleton('%s') decorated resources",
    async (singletonKey) => {
      const { program } = await Tester.compile(`
using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

@singleton("${singletonKey}")
model SingletonResource is ProxyResource<SingletonResourceProperties> {
  ...ResourceNameParameter<SingletonResource>;
}

model SingletonResourceProperties {
  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@lroStatus
union ProvisioningState {
  string,
  ResourceProvisioningState,
}

model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;

  @visibility(Lifecycle.Read)
  provisioningState?: ProvisioningState;
}

@armResourceOperations
interface SingletonResources {
  get is ArmResourceRead<SingletonResource>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<SingletonResource>;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
`);
      const provider = resolveArmResources(program);
      expect(provider).toBeDefined();
      expect(provider.resources).toBeDefined();

      const singletonResource = provider.resources!.find(
        (r) => r.type.name === "SingletonResource",
      );
      ok(singletonResource);
      expect(singletonResource.singleton).toBeDefined();
      expect(singletonResource.singleton!.keyValue).toEqual(singletonKey);

      const employee = provider.resources!.find((r) => r.type.name === "Employee");
      ok(employee);
      expect(employee.singleton).toBeUndefined();
    },
  );

  it("provides singleton information for resources with union name type", async () => {
    const { program } = await Tester.compile(`
using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

union ExampleSingletonValues {
  salaried: "salaried",
  hourly: "hourly",
  string,
}

@singleton("salaried")
model Employee is TrackedResource<EmployeeProperties> {
  ...ResourceNameParameter<Resource = Employee, Type = ExampleSingletonValues>;
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

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Employee>;
}
`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();

    const employee = provider.resources!.find((r) => r.type.name === "Employee");
    ok(employee);
    expect(employee.singleton).toBeDefined();
    expect(employee.singleton!.keyValue).toEqual(["salaried", "hourly"]);
  });

  it("collects list operations for child resource using ArmListBySubscriptionScope", async () => {
    const { program } = await Tester.compile(`
using Azure.Core;

@armProviderNamespace
namespace Microsoft.ContosoProviderHub;

interface Operations extends Azure.ResourceManager.Operations {}

model Test is TrackedResource<{}> {
  ...ResourceNameParameter<Test>;
}

@parentResource(Test)
model Employee is ProxyResource<EmployeeProperties> {
  ...ResourceNameParameter<Employee>;
}

model EmployeeProperties {
  age?: int32;
  city?: string;
}

@armResourceOperations
interface Tests {
  get is ArmResourceRead<Test>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<Test>;
  delete is ArmResourceDeleteWithoutOkAsync<Test>;
  listByResourceGroup is ArmResourceListByParent<Test>;
  listBySubscription is ArmListBySubscription<Test>;
}

@armResourceOperations
interface Employees {
  get is ArmResourceRead<Employee>;
  createOrUpdate is ArmResourceCreateOrReplaceSync<Employee>;
  delete is ArmResourceDeleteSync<Employee>;
  listByParent is ArmResourceListByParent<Employee>;
  listBySubscription is ArmListBySubscriptionScope<Employee>;
}
`);
    const provider = resolveArmResources(program);
    expect(provider).toBeDefined();
    expect(provider.resources).toBeDefined();
    ok(provider.resources);

    // Find the Employee resource at its normal scope
    const employee = provider.resources.find(
      (r) =>
        r.resourceName === "Employee" &&
        r.resourceInstancePath ===
          "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/tests/{testName}/employees/{employeeName}",
    );
    ok(employee);
    expect(employee).toMatchObject({
      providerNamespace: "Microsoft.ContosoProviderHub",
    });

    // Verify the listByParent operation is correctly resolved on the main resource
    checkResolvedOperations(employee, {
      operations: {
        lifecycle: {
          createOrUpdate: [
            { operationGroup: "Employees", name: "createOrUpdate", kind: "createOrUpdate" },
          ],
          delete: [{ operationGroup: "Employees", name: "delete", kind: "delete" }],
          read: [{ operationGroup: "Employees", name: "get", kind: "read" }],
        },
        lists: [
          {
            operationGroup: "Employees",
            name: "listByParent",
            kind: "list",
          },
        ],
      },
      resourceType: {
        provider: "Microsoft.ContosoProviderHub",
        types: ["tests", "employees"],
      },
      resourceName: "Employee",
      resourceInstancePath:
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/tests/{testName}/employees/{employeeName}",
    });

    // Verify a subscription-scoped employee resource entry was created for the subscription list
    const subscriptionEmployee = provider.resources.find(
      (r) =>
        r.resourceInstancePath ===
        "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{name}",
    );
    ok(subscriptionEmployee);
    expect(subscriptionEmployee.operations.lists).toHaveLength(1);
    expect(subscriptionEmployee.operations.lists![0]).toMatchObject({
      operationGroup: "Employees",
      name: "listBySubscription",
      kind: "list",
      path: "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees",
    });
  });
});
