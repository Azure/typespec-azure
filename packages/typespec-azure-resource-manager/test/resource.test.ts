import { Interface, Model, Operation } from "@typespec/compiler";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import {
  ArmLifecycleOperationKind,
  ArmOperationKind,
  ArmResourceOperation,
} from "../src/operations.js";
import {
  ArmResourceDetails,
  getArmResources,
  getResourcePathElements,
  isResourceOperationMatch,
  resolveArmResources,
  ResolvedOperationResourceInfo,
  ResolvedOperations,
  ResourceType,
} from "../src/resource.js";
import { checkFor, compileAndDiagnose } from "./test-host.js";

function assertLifecycleOperation(
  resource: ArmResourceDetails,
  kind: ArmLifecycleOperationKind,
  operationGroup: string,
) {
  ok(resource.operations.lifecycle[kind], `No ${kind} operation`);
  strictEqual(resource.operations.lifecycle[kind]!.kind, kind);
  strictEqual(resource.operations.lifecycle[kind]!.operationGroup, operationGroup);
}

function getResourcePropertyProperties(resource: ArmResourceDetails, propertyName: string) {
  const propertyType = resource.typespecType.properties.get("properties")?.type as Model;
  return propertyType.properties.get(propertyName);
}

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
    expect(employee.kind).toBe("Tracked");
    expect(employee.providerNamespace).toBe("Microsoft.ContosoProviderHub");
    expect(employee.type).toBeDefined();
    expect(employee.operations).toBeDefined();
    expect(employee.operations).toHaveLength(2);
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
    expect(resources).toBeDefined();
    expect(resources.resources).toBeDefined();
    expect(resources.resources).toHaveLength(4);
    ok(resources.resources);
    const employee = resources.resources[0];
    ok(employee);
    expect(employee.kind).toBe("Extension");
    expect(employee.providerNamespace).toBe("Microsoft.ContosoProviderHub");
    expect(employee.type).toBeDefined();
    expect(employee.operations).toBeDefined();
    expect(employee.operations).toHaveLength(8);

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
    ok(externalVm);
    expect(externalVm.kind).toBe("Virtual");
    expect(externalVm.providerNamespace).toBe("Microsoft.Compute");
    expect(externalVm.type).toBeDefined();
    expect(externalVm.operations).toBeDefined();
    expect(externalVm.operations).toHaveLength(0);

    const externalScaleSet = resources.resources[2];
    ok(externalScaleSet);
    expect(externalScaleSet.kind).toBe("Virtual");
    expect(externalScaleSet.providerNamespace).toBe("Microsoft.Compute");
    expect(externalScaleSet.type).toBeDefined();
    expect(externalScaleSet.operations).toBeDefined();
    expect(externalScaleSet.operations).toHaveLength(0);

    const externalManagementGroup = resources.resources[3];
    ok(externalManagementGroup);
    expect(externalManagementGroup.kind).toBe("Virtual");
    expect(externalManagementGroup.providerNamespace).toBe("Microsoft.Management");
    expect(externalManagementGroup.type).toBeDefined();
    expect(externalManagementGroup.operations).toBeDefined();
    expect(externalManagementGroup.operations).toHaveLength(0);

    checkArmOperationsHas(resources.unassociatedOperations, [
      { operationGroup: "Operations", name: "list", kind: "other" },
    ]);
  });
});

describe("typespec-azure-resource-manager: ARM resource model", () => {
  describe("ARM resource model:", () => {
    it("gathers metadata about TrackedResources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Resource properties")
      model FooResourceProperties {
        @doc("I am foo")
        iAmFoo: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const foo = resources[0];
      strictEqual(foo.name, "FooResource");
      strictEqual(foo.kind, "Tracked");
      strictEqual(foo.collectionName, "foos");
      strictEqual(foo.keyName, "fooName");
      strictEqual(foo.armProviderNamespace, "Microsoft.Test");

      // Check operations
      assertLifecycleOperation(foo, "read", "Foos");
      assertLifecycleOperation(foo, "createOrUpdate", "Foos");
      assertLifecycleOperation(foo, "update", "Foos");
      assertLifecycleOperation(foo, "delete", "Foos");
    });

    it("allows overriding armProviderNamespace", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @service(#{title: "Microsoft.Test"})
      
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test {

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource,FooResourceProperties> {
      }
    }

    namespace Other {
      @@armProviderNamespace(Microsoft.Test, "Private.Test");
    }
    `);

      expectDiagnosticEmpty(diagnostics);
      const resources = getArmResources(program);
      const foo = resources[0];
      strictEqual(foo.armProviderNamespace, "Private.Test");
    });
    it("gathers metadata about ProxyResources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @service(#{title: "Microsoft.Test"})
      
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource,FooResourceProperties> {
      }

      @doc("Bar properties")
      model BarResourceProperties {
        @doc("I am Bar")
        iAmBar: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Bar resource")
      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @doc("Bar name")
        @key("barName")
        @segment("bars")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bars extends ProxyResourceOperations<BarResource> {
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 2);

      const bar = resources[1];
      strictEqual(bar.name, "BarResource");
      strictEqual(bar.kind, "Proxy");
      strictEqual(bar.collectionName, "bars");
      strictEqual(bar.keyName, "barName");
      strictEqual(bar.armProviderNamespace, "Microsoft.Test");

      // Check operations
      assertLifecycleOperation(bar, "read", "Bars");
      assertLifecycleOperation(bar, "createOrUpdate", "Bars");
      assertLifecycleOperation(bar, "delete", "Bars");
    });

    it("gathers metadata about ExtensionResources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Baz properties")
     model BazResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Baz resource")
      model BazResource is ExtensionResource<BazResourceProperties> {
        @doc("Baz name")
        @key("bazName")
        @segment("bazs")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bazs extends ExtensionResourceOperations<BazResource, BazResourceProperties> {
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const baz = resources[0];
      strictEqual(baz.name, "BazResource");
      strictEqual(baz.kind, "Extension");
      strictEqual(baz.collectionName, "bazs");
      strictEqual(baz.keyName, "bazName");
      strictEqual(baz.armProviderNamespace, "Microsoft.Test");

      // Check operations
      assertLifecycleOperation(baz, "read", "Bazs");
      assertLifecycleOperation(baz, "createOrUpdate", "Bazs");
      assertLifecycleOperation(baz, "update", "Bazs");
      assertLifecycleOperation(baz, "delete", "Bazs");
    });

    it("gathers metadata about singleton resources", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

     @doc("Foo properties")
     model FooResourceProperties {
       @doc("Name of the resource")
       displayName?: string = "default";
       @doc("The provisioning State")
       provisioningState: ResourceState;
     }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
      
      @armResourceOperations
      #suppress "deprecated" "test"
      interface Foos extends ResourceCreate<FooResource>,ResourceRead<FooResource>,ResourceDelete<FooResource> {}

      @doc("Bar properties")
      model BarResourceProperties {
        @doc("I am bar")
        iAmBar: string;
        @doc("The provisioning State")
       provisioningState: ResourceState;
      }

      @doc("Bar resource")
      @singleton
      @parentResource(FooResource)
      model BarResource is ProxyResource<BarResourceProperties> {
        @doc("Bar name")
        @key("barName")
        @segment("bars")
        @path
        name: string;
      }

      @armResourceOperations
      interface Bars extends ProxyResourceOperations<BarResource> {
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 2);

      const bar = resources[1];
      strictEqual(bar.name, "BarResource");
      strictEqual(bar.kind, "Proxy");
      strictEqual(bar.collectionName, "bars");
      strictEqual(bar.keyName, "barName");
      strictEqual(bar.armProviderNamespace, "Microsoft.Test");

      // Check operations
      assertLifecycleOperation(bar, "read", "Bars");
      assertLifecycleOperation(bar, "createOrUpdate", "Bars");
      assertLifecycleOperation(bar, "delete", "Bars");
    });

    it("gathers metadata when overriding lifecycle operation", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Resource properties")
      model FooResourceProperties {
        @doc("I am foo")
        iAmFoo: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
        update is ArmTagsPatchAsync<FooResource, FooResourceProperties>;
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const foo = resources[0];
      strictEqual(foo.name, "FooResource");
      strictEqual(foo.kind, "Tracked");
      strictEqual(foo.collectionName, "foos");
      strictEqual(foo.keyName, "fooName");
      strictEqual(foo.armProviderNamespace, "Microsoft.Test");

      // Check operations
      assertLifecycleOperation(foo, "read", "Foos");
      assertLifecycleOperation(foo, "createOrUpdate", "Foos");
      assertLifecycleOperation(foo, "update", "Foos");
      assertLifecycleOperation(foo, "delete", "Foos");
    });
    it("resources with intrinsic types", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Test;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The state of the resource")
      enum ResourceState {
       @doc(".") Succeeded,
       @doc(".") Canceled,
       @doc(".") Failed
     }

      @doc("Base resource properties")
      model BaseResourceProperties {
        @doc("Common type")
        commonType: string;
        @doc("The provisioning State")
        provisioningState: ResourceState;
      }

      @doc("Foo properties")
      model FooResourceProperties extends BaseResourceProperties {
        @doc("I am Foo")
        iAmFoo: string;

        @doc("Int prop")
        int32Prop: int32;

        @doc("Another int prop")
        int64Prop: int64;

        @doc("Safe int prop")
        safeIntProp: safeint;

        @doc("Float 32 prop")
        f32Prop: float32;

        @doc("Float 64 prop")
        f64Prop: float64;

        @doc("Bool prop")
        boolProp: boolean;

        @doc("Date prop")
        dateProp: plainDate;

        @doc("Time prop")
        timeProp: plainTime;

        @doc("Zoned date prop")
        utcDateTimeProp: utcDateTime;

        @doc("Duration prop")
        durationProp: duration;

        @doc("Map prop")
        mapProp: Record<string>;

        @doc("Arr 32 prop")
        arrint32Prop: int32[];

        @doc("Arr 64 prop")
        arrint64Prop: int64[];

        @doc("Arr safe prop")
        arrsafeIntProp: safeint[];

        @doc("Arr F32 prop")
        arrayF32Prop: float32[];

        @doc("Arr F64 prop")
        arrayF64Prop: float64[];

        @doc("Arr Bool prop")
        arrayBoolProp: boolean[];

        @doc("Arr Date prop")
        arrdateProp: plainDate[];

        @doc("Arr time prop")
        arrtimeProp: plainTime[];

        @doc("Arr zoned prop")
        arrutcDateTimeProp: utcDateTime[];

        @doc("Arr duration prop")
        arrdurationProp: duration[];
      }

      @doc("Foo resource")
      model FooResource is TrackedResource<FooResourceProperties> {
        @doc("Foo name")
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }

      @armResourceOperations
      interface Foos extends TrackedResourceOperations<FooResource, FooResourceProperties> {
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const foo = resources[0];
      strictEqual(foo.name, "FooResource");
      strictEqual(foo.kind, "Tracked");
      strictEqual(foo.collectionName, "foos");
      strictEqual(foo.keyName, "fooName");
      strictEqual(foo.armProviderNamespace, "Microsoft.Test");
    });

    it("resources with armResourceIdentifier property types", async () => {
      const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @useDependency(Azure.Core.Versions.v1_0_Preview_2)
      namespace Microsoft.Test;

      enum ResourceState {
        Succeeded,
        Canceled,
        Failed
     }

      model FooResourceProperties {
        simpleArmId: Azure.Core.armResourceIdentifier;
        armIdWithType: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type"}]>;
        armIdWithTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}]>;
        armIdWithMultipleTypeAndScope: Azure.Core.armResourceIdentifier<[{type:"Microsoft.RP/type", scopes:["Tenant", "ResourceGroup"]}, {type:"Microsoft.RP/type2", scopes:["Tenant", "ResourceGroup"]}]>;
        provisioningState: ResourceState;
      }

      model FooResource is TrackedResource<FooResourceProperties> {
        @key("fooName")
        @segment("foos")
        @path
        name: string;
      }
    `);

      const resources = getArmResources(program);
      expectDiagnosticEmpty(diagnostics);
      strictEqual(resources.length, 1);

      const foo = resources[0];
      strictEqual(foo.name, "FooResource");
      strictEqual(foo.kind, "Tracked");
      strictEqual(foo.collectionName, "foos");
      strictEqual(foo.keyName, "fooName");
      strictEqual(foo.armProviderNamespace, "Microsoft.Test");

      const armIds = [
        "simpleArmId",
        "armIdWithType",
        "armIdWithTypeAndScope",
        "armIdWithMultipleTypeAndScope",
      ];
      armIds.forEach(function (id) {
        const armIdProp = getResourcePropertyProperties(foo, id);
        strictEqual((armIdProp?.type as Model).name, "armResourceIdentifier");
      });
    });

    describe("raises diagnostics", () => {
      it("when armResourceInternal is used on a non-resource type", async () => {
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Test;

        model FooResourceProperties {}

        // NOTE: No spec author should actually use this directly
        @doc("Foo resource")
        @Azure.ResourceManager.Private.armResourceInternal(FooResourceProperties)
        model FooResource {
          @doc("Foo name")
          @key("fooName")
          @segment("foos")
          @path
          name: string;
        }
      `);

        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-base-type",
        });
      });

      it("when name property doesn't have a @key decorator", async () => {
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Test;

        model FooResourceProperties {}

        @doc("Foo resource")
        model FooResource is TrackedResource<FooResourceProperties> {
          @doc("Foo name")
          @segment("foos")
          @path
          name: string;
        }
      `);

        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing-name-key-decorator",
        });
      });

      it("when name property doesn't have a @segment decorator", async () => {
        const { diagnostics } = await checkFor(`
        @armProviderNamespace
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        namespace Microsoft.Test;

        model FooResourceProperties {}

        model FooResource is TrackedResource<FooResourceProperties> {
          @key("fooName")
          @path
          name: string;
        }
      `);

        expectDiagnostics(diagnostics, {
          code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing-name-segment-decorator",
        });
      });
    });
  });

  it("emits correct extended location for resource", async () => {
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget>;
         ...ExtendedLocationProperty;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("extendedLocation"));
  });

  it("emits correct fixed union name parameter for resource", async () => {
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }

      /** different type of widget used on resource path */
      union WidgetNameType {
        string,
        /** small widget */
        Small: "Small",
        /** large widget */        
        Large: "Large"
      }
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("name"));
    const nameProperty = resources[0].typespecType.properties.get("name");
    strictEqual(nameProperty?.type.kind, "Union");
    strictEqual(nameProperty?.type.name, "WidgetNameType");
  });

  it("emits a scalar string with decorator parameter for resource", async () => {
    const { program, diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso;

      @doc("Widget resource")
      model Widget is ProxyResource<WidgetProperties> {
         ...ResourceNameParameter<Widget, Type=WidgetNameType>;
      }

      @doc("The properties of a widget")
      model WidgetProperties {
         size: int32;
      }

      @minLength(1)
      @maxLength(10)
      @pattern("xxxxxx")
      scalar WidgetNameType extends string;
  `);
    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    strictEqual(resources.length, 1);
    ok(resources[0].typespecType.properties.has("name"));
    const nameProperty = resources[0].typespecType.properties.get("name");
    strictEqual(nameProperty?.type.kind, "Scalar");
    strictEqual(nameProperty?.type.name, "WidgetNameType");
  });
  it("allows foreign resources as parent resources", async () => {
    const { program, diagnostics } = await checkFor(`
using Azure.Core;
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)

namespace Microsoft.ContosoProviderHub;
/** Externally defined RestorePoint */
@armVirtualResource
@parentResource(RestorePointCollection)
model RestorePoint {
  ...ResourceNameParameter<RestorePoint, "restorePointName", "restorePoints">;
}

/** Externally defined RestorePointCollection */
@armVirtualResource
model RestorePointCollection {
  ...ResourceNameParameter<
    RestorePointCollection,
    "collectionName",
    "restorePointGroups"
  >;
}

/** A ContosoProviderHub resource */
@parentResource(RestorePoint)
model DiskRestorePoint is TrackedResource<DiskRestorePointProperties> {
  ...ResourceNameParameter<DiskRestorePoint>;
}

/** Employee properties */
model DiskRestorePointProperties {
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
interface DiskRestorePoints {
  get is ArmResourceRead<DiskRestorePoint>;
  createOrUpdate is ArmResourceCreateOrReplaceAsync<DiskRestorePoint>;
  update is ArmCustomPatchSync<
    DiskRestorePoint,
    Azure.ResourceManager.Foundations.ResourceUpdateModel<
      DiskRestorePoint,
      DiskRestorePointProperties
    >
  >;
  delete is ArmResourceDeleteWithoutOkAsync<DiskRestorePoint>;
  list is ArmResourceListByParent<DiskRestorePoint>;

  /** A sample resource action that move employee to different location */
  move is ArmResourceActionSync<DiskRestorePoint, MoveRequest, MoveResponse>;

  /** A sample HEAD operation to check resource existence */
  checkExistence is ArmResourceCheckExistence<DiskRestorePoint>;
}

@armResourceOperations
interface RestorePointOperations {
  moveR is ArmResourceActionAsync<RestorePoint, MoveRequest, MoveResponse>;
}

    `);

    const resources = getArmResources(program);
    expectDiagnosticEmpty(diagnostics);
    expect(resources.length).toBe(3);
    const restorePoint = resources.find((r) => r.name === "RestorePoint");
    expect(restorePoint).toBeDefined();
    expect(restorePoint?.operations.actions.moveR).toBeDefined();
    const restorePointCollection = resources.find((r) => r.name === "RestorePointCollection");
    expect(restorePointCollection).toBeDefined();
    const diskRestorePoint = resources.find((r) => r.name === "DiskRestorePoint");
    expect(diskRestorePoint).toBeDefined();
  });

  it("allows extension of foreign resources", async () => {
    const { program, types, diagnostics } = await compileAndDiagnose(`
using Azure.Core;

/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub;

/** A ContosoProviderHub extension resource */
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


@test
@armResourceOperations
interface Employees extends EmplOps<Extension.ScopeParameter> {}
@test
@armResourceOperations
interface ManagementGroups extends EmplOps<Extension.ManagementGroup> {}
@test
@armResourceOperations
interface VirtualMachines extends EmplOps<VirtualMachine> {}


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

    expectDiagnosticEmpty(diagnostics);
    const { Employees, ManagementGroups, VirtualMachines } = types as {
      Employees: Interface;
      ManagementGroups: Interface;
      VirtualMachines: Interface;
    };
    const employeesGet: Operation | undefined = Employees?.operations?.get("get");
    ok(employeesGet);
    expect(employeesGet?.kind).toBe("Operation");
    const [employeeGetHttp, _e] = getHttpOperation(program, employeesGet);
    expect(employeeGetHttp.path).toBe(
      "/{scope}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
    const managementGet: Operation | undefined = ManagementGroups?.operations?.get("get");
    ok(managementGet);
    expect(managementGet?.kind).toBe("Operation");
    const [managementGetHttp, _m] = getHttpOperation(program, managementGet);
    expect(managementGetHttp.path).toBe(
      "/providers/Microsoft.Management/managementGroups/{managementGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
    const virtualMachinesGet: Operation | undefined = VirtualMachines?.operations?.get("get");
    ok(virtualMachinesGet);
    expect(virtualMachinesGet?.kind).toBe("Operation");
    const [vmGetHttp, _v] = getHttpOperation(program, virtualMachinesGet);
    expect(vmGetHttp.path).toBe(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Compute/virtualMachines/{vmName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
  });

  it("overrides provider namespace in mixed legacy and resource operations", async () => {
    const { program, types, diagnostics } = await compileAndDiagnose(`
using Azure.Core;

#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ContosoProviderHub;

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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  @test
  get is EmplOps.Read<Employee>;
  
  /** A sample HEAD operation to check resource existence */
  @test
  checkExistence is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

    expectDiagnosticEmpty(diagnostics);
    const { get, checkExistence } = types as {
      get: Operation;
      checkExistence: Operation;
    };
    ok(get);
    expect(get?.kind).toBe("Operation");
    const [employeeGetHttp, _e] = getHttpOperation(program, get);
    expect(employeeGetHttp.path).toBe(
      "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );

    ok(checkExistence);
    expect(checkExistence?.kind).toBe("Operation");
    const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
    expect(existenceHttp.path).toBe(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
  });

  it("uses route override in routed operations", async () => {
    const { program, types, diagnostics } = await compileAndDiagnose(`
using Azure.Core;

#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ContosoProviderHub;

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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps extends Azure.ResourceManager.Legacy.RoutedOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}, ErrorResponse, #{useStaticRoute: true, route: "/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees"}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
  };

@armResourceOperations(#{ allowStaticRoutes: true})
interface Employees {
  @test
  get is EmplOps.Read<Employee>;
  
  /** A sample HEAD operation to check resource existence */
  @test
  checkExistence is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

    expectDiagnosticEmpty(diagnostics);
    const { get, checkExistence } = types as {
      get: Operation;
      checkExistence: Operation;
    };
    ok(get);
    expect(get?.kind).toBe("Operation");
    const [employeeGetHttp, _e] = getHttpOperation(program, get);
    expect(employeeGetHttp.path).toBe(
      "/subscriptions/{subscriptionId}/providers/Microsoft.Overridden/employees/{employeeName}",
    );

    ok(checkExistence);
    expect(checkExistence?.kind).toBe("Operation");
    const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
    expect(existenceHttp.path).toBe(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
  });

  it("overrides provider namespace in custom operations", async () => {
    const { program, types, diagnostics } = await compileAndDiagnose(`
using Azure.Core;

#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ContosoProviderHub;

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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  @test
  /** a simple get */
  @armResourceRead(Employee)
  @get op get(...BaseParams, ...KeysOf<Employee>): Employee;
  
  /** A sample HEAD operation to check resource existence */
  @test
  checkExistence is Azure.ResourceManager.ArmResourceCheckExistence<Employee>;
}
    `);

    expectDiagnosticEmpty(diagnostics);
    const { get, checkExistence } = types as {
      get: Operation;
      checkExistence: Operation;
    };
    ok(get);
    expect(get?.kind).toBe("Operation");
    const [employeeGetHttp, _e] = getHttpOperation(program, get);
    expect(employeeGetHttp.path).toBe(
      "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );

    ok(checkExistence);
    expect(checkExistence?.kind).toBe("Operation");
    const [existenceHttp, _m] = getHttpOperation(program, checkExistence);
    expect(existenceHttp.path).toBe(
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
  });

  it("overrides provider namespace in legacy operations", async () => {
    const { program, types, diagnostics } = await compileAndDiagnose(`
using Azure.Core;


#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
namespace Microsoft.ContosoProviderHub;

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

#suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
interface EmplOps extends Azure.ResourceManager.Legacy.LegacyOperations<
BaseParams & {...ParentKeysOf<Employee>},
{...KeysOf<Employee>}> {}

alias BaseParams = {
    ...ApiVersionParameter;
    ...SubscriptionIdParameter;
    ...Azure.ResourceManager.Legacy.Provider;
  };


@armResourceOperations
interface Employees {
  @test
  get is EmplOps.Read<Employee>;
}
    `);

    expectDiagnosticEmpty(diagnostics);
    const { get } = types as {
      get: Operation;
      checkExistence: Operation;
    };
    ok(get);
    expect(get?.kind).toBe("Operation");
    const [employeeGetHttp, _] = getHttpOperation(program, get);
    expect(employeeGetHttp.path).toBe(
      "/subscriptions/{subscriptionId}/providers/Microsoft.ContosoProviderHub/employees/{employeeName}",
    );
  });

  it("emits diagnostics for non ARM resources", async () => {
    const { diagnostics } = await checkFor(`
      @armProviderNamespace
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      namespace Microsoft.Contoso {
       @parentResource(Microsoft.Person.Contoso.Person)
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
      
        /** Employee properties */
        model EmployeeProperties {
          /** The status of the last operation. */
          @visibility(Lifecycle.Read)
          provisioningState?: ProvisioningState;
        }
      
        /** The provisioning state of a resource. */
        union ProvisioningState {
          string,
      
          /** Resource has been created. */
          Succeeded: "Succeeded",
      
          /** Resource creation failed. */
          Failed: "Failed",
      
          /** Resource creation was canceled. */
          Canceled: "Canceled",
        }
      
        interface Operations extends Azure.ResourceManager.Operations {}
      
        @armResourceOperations
        interface Employees {
          listByResourceGroup is ArmResourceListByParent<Employee>;
        }
      }
        
      namespace Microsoft.Person.Contoso {
        /** Person parent */
        model Person {
          /** The parent name */
          @path
          @visibility(Lifecycle.Read)
          @segment("parents")
          @key
          name: string;
        }
      }
`);
    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing",
        message: "No @armResource registration found for type Person",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/parent-type",
        message: "Parent type Person of Employee is not registered as an ARM resource type.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-missing",
        message: "No @armResource registration found for type Person",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/parent-type",
        message: "Parent type Person of Employee is not registered as an ARM resource type.",
      },
    ]);
  });
});

it("emits default optional properties for resource", async () => {
  const { program, diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is TrackedResource<WidgetProperties> {
       ...ResourceNameParameter<Widget>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  expectDiagnosticEmpty(diagnostics);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, true);
});

it("emits required properties for resource with @armResourcePropertiesOptionality override ", async () => {
  const { program, diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    @doc("Widget resource")
    model Widget is ProxyResource<WidgetProperties, false> {
       ...ResourceNameParameter<Widget>;
    }

    @doc("The properties of a widget")
    model WidgetProperties {
       size: int32;
    }
`);
  const resources = getArmResources(program);
  expectDiagnosticEmpty(diagnostics);
  strictEqual(resources.length, 1);
  strictEqual(resources[0].typespecType.properties.get("properties")?.optional, false);
});

it("recognizes resource with customResource identifier", async () => {
  const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso {
     @parentResource(Microsoft.Person.Contoso.Person)
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
    
      /** Employee properties */
      model EmployeeProperties {
        /** The status of the last operation. */
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }
    
      /** The provisioning state of a resource. */
      union ProvisioningState {
        string,
    
        /** Resource has been created. */
        Succeeded: "Succeeded",
    
        /** Resource creation failed. */
        Failed: "Failed",
    
        /** Resource creation was canceled. */
        Canceled: "Canceled",
      }
    
      interface Operations extends Azure.ResourceManager.Operations {}
    
      @armResourceOperations
      interface Employees {
        listByResourceGroup is ArmResourceListByParent<Employee>;
      }
    }
    
    namespace Microsoft.Person.Contoso {
      /** Person parent */
      @Azure.ResourceManager.Legacy.customAzureResource
      model Person {
        /** The parent name */
        name: string;
      }
    }
`);
  expectDiagnosticEmpty(diagnostics);
});

describe("typespec-azure-resource-manager: identifiers decorator", () => {
  it("allows multiple model properties in identifiers decorator", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      name: string;
      age: int32;
    }
    
    model Pets
    {
      @identifiers(#["name", "age"])
      dogs: Dog[];
    }
`);

    expectDiagnosticEmpty(diagnostics);
  });

  it("allows inner model properties in identifiers decorator", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      breed: Breed;
    }
    
    model Breed {
      type: string;
    }
    
    model Pets
    {
      @identifiers(#["breed/type"])
      dogs: Dog[];
    }
`);

    expectDiagnosticEmpty(diagnostics);
  });

  it("emits diagnostic when identifiers is not of a model property object array", async () => {
    const { diagnostics } = await checkFor(`
    @armProviderNamespace
    @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
    namespace Microsoft.Contoso;

    model Dog {
      name: string;
    }
    
    model Pets
    {
      @identifiers(#["age"])
      dogs: Dog;
    }
`);

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/decorator-param-wrong-type",
        message:
          "The @identifiers decorator must be applied to a property that is an array of objects",
      },
    ]);
  });

  it("emits diagnostics when a provider cannot be updated", async () => {
    const { diagnostics } = await checkFor(`
    using Azure.Core;
#suppress "@azure-tools/typespec-azure-core/require-versioned"
#suppress "@azure-tools/typespec-azure-resource-manager/missing-operations-endpoint"
/** Contoso Resource Provider management API. */
@armProviderNamespace
@service(#{ title: "ContosoProviderHubClient" })
@useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
@armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
namespace Microsoft.ContosoProviderHub {

  @armResourceOperations
  interface VirtualMachines {
    @armResourceRead(Azure.ResourceManager.Extension.VirtualMachine)
    @get op read(
     ...ApiVersionParameter;
     ...Extension.TargetProviderNamespace<Azure.ResourceManager.Extension.VirtualMachine>;
     ...KeysOf<Azure.ResourceManager.Extension.VirtualMachine>): void;
  }

}

namespace Azure.ResourceManager.Extension {
  model VirtualMachine {
    /** The vm Name */
   @visibility(Lifecycle.Read) @path @key @segment("virtualMachines") vmName: string;
  }
}

`);

    expectDiagnostics(diagnostics, [
      {
        code: "@azure-tools/typespec-azure-resource-manager/resource-without-provider-namespace",
        message: `The resource "VirtualMachine" does not have a provider namespace.  Please use a resource in a namespace marked with '@armProviderNamespace' or a virtual resource with a specific namespace`,
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/resource-without-provider-namespace",
        message: `The resource "VirtualMachine" does not have a provider namespace.  Please use a resource in a namespace marked with '@armProviderNamespace' or a virtual resource with a specific namespace`,
      },
    ]);
  });
});
