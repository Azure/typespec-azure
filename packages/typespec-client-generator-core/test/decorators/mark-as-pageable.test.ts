import { ok, strictEqual } from "assert";
import { it } from "vitest";
import {
  ArmTester,
  ArmTesterWithService,
  createSdkContextForTester,
  SimpleTester,
} from "../tester.js";

it("should mark regular operation as pageable when decorated with @markAsPageable", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program);
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");

  // Check that the response type is properly set
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "items");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "items");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should apply @markAsPageable with language scope", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "items");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "items");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should warn when @markAsPageable is applied to operation not returning model", async () => {
  const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace TestService {
        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/simple")
        @get
        op simpleOperation(): string;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-pageable-target",
  );
});

it("should work with complex model return types", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model PagedResult<T> {
          @pageItems
          value: T[];
        }

        model Product {
          id: string;
          name: string;
          price: float32;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/products")
        @get
        op listProducts(): PagedResult<Product>;
      }
    `);

  const context = await createSdkContextForTester(program);
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listProducts");

  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "value");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "value");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should apply @pageItems to 'value' property when not already decorated", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          value: Item[];
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "value");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "value");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should warn when model has no @pageItems property and no 'value' property", async () => {
  const diagnostics = await SimpleTester.diagnose(`
      @service
      namespace TestService {
        model ItemListResult {
          data: Item[];
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-pageable-target",
  );
});

it("should not apply when scope does not match", async () => {
  const { program } = await SimpleTester.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
        }

        model Item {
          id: string;
          name: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable("java")
        @route("/items")
        @get
        op listItems(): ItemListResult;
      }
    `);

  const context = await createSdkContextForTester(program);
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  // Should be basic method since scope is csharp but emitter is python
  strictEqual(method.kind, "basic");
});

it("should warn when operation already has @list (ARM ResourceListByParent)", async () => {
  const diagnostics = await ArmTester.diagnose(`
      @armProviderNamespace
      @service(#{ title: "ContosoProviderHubClient" })
      namespace Microsoft.ContosoProviderHub;

      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        salary: int32;
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listEmployees is ArmResourceListByParent<Employee>;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/mark-as-pageable-ineffective",
  );
});

it("should work with ARM action with @pageItems property", async () => {
  const { program } = await ArmTesterWithService.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        salary: int32;
      }
      model Equipment {
        equipmentId: string;
      }
      model EquipmentListResult {
        @pageItems
        equipments: Equipment[];
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listEquipments is ArmResourceActionSync<Employee, void, EquipmentListResult>;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/http-client-csharp-mgmt",
  });
  const rootClient = context.sdkPackage.clients[0];
  ok(rootClient);
  const employeeClient = rootClient.children![0];
  ok(employeeClient);
  const methods = employeeClient.methods;
  strictEqual(methods.length, 2);

  const method = methods[1];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listEquipments");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "equipments");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "equipments");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should work with ARM action with value property without @pageItems", async () => {
  const { program } = await ArmTesterWithService.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        salary: int32;
      }
      model Equipment {
        equipmentId: string;
      }
      model EquipmentListResult {
        value: Equipment[];
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listEquipments is ArmResourceActionSync<Employee, void, EquipmentListResult>;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/http-client-csharp-mgmt",
  });
  const rootClient = context.sdkPackage.clients[0];
  ok(rootClient);
  const employeeClient = rootClient.children![0];
  ok(employeeClient);
  const methods = employeeClient.methods;
  strictEqual(methods.length, 2);

  const method = methods[1];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listEquipments");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "value");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "value");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should work with ARM action with value property without @pageItems wrapped in ArmResponse", async () => {
  const { program } = await ArmTesterWithService.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        salary: int32;
      }
      model Equipment {
        equipmentId: string;
      }
      model EquipmentListResult {
        value: Equipment[];
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listEquipments is ArmResourceActionSync<Employee, void, ArmResponse<EquipmentListResult>>;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/http-client-csharp-mgmt",
  });
  const rootClient = context.sdkPackage.clients[0];
  ok(rootClient);
  const employeeClient = rootClient.children![0];
  ok(employeeClient);
  const methods = employeeClient.methods;
  strictEqual(methods.length, 2);

  const method = methods[1];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listEquipments");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "value");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "value");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});

it("should fail with ARM action with array property not named value without @pageItems", async () => {
  const diagnostics = await ArmTester.diagnose(`
      @armProviderNamespace
      @service(#{ title: "ContosoProviderHubClient" })
      namespace Microsoft.ContosoProviderHub;

      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        salary: int32;
      }
      model Equipment {
        equipmentId: string;
      }
      model EquipmentListResult {
        equipments: Equipment[];
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listEquipments is ArmResourceActionSync<Employee, void, EquipmentListResult>;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-pageable-target",
  );
});

it("should work with ARM ListSinglePage legacy operation", async () => {
  const { program } = await ArmTesterWithService.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      @armResourceOperations
      interface Employees {
        op get is ArmResourceRead<Employee>;
        @Azure.ClientGenerator.Core.Legacy.markAsPageable("csharp")
        op listSinglePageEmployees is Azure.ResourceManager.Legacy.ArmListSinglePageByParent<Employee>;
      }
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-typespec/http-client-csharp-mgmt",
  });
  const rootClient = context.sdkPackage.clients[0];
  ok(rootClient);
  const employeeClient = rootClient.children![0];
  ok(employeeClient);
  const methods = employeeClient.methods;
  strictEqual(methods.length, 2);

  const method = methods[1];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listSinglePageEmployees");

  // Check paging metadata
  ok(method.pagingMetadata);
  ok(method.pagingMetadata.pageItemsSegments);
  strictEqual(method.pagingMetadata.pageItemsSegments.length, 1);
  strictEqual(method.pagingMetadata.pageItemsSegments[0].name, "value");

  // Check that response.resultSegments is populated
  ok(method.response.resultSegments);
  strictEqual(method.response.resultSegments.length, 1);
  strictEqual(method.response.resultSegments[0].name, "value");
  strictEqual(method.response.resultSegments, method.pagingMetadata.pageItemsSegments);
});
