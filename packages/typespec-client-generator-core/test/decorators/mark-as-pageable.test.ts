import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let basicRunner: SdkTestRunner;

beforeEach(async () => {
  basicRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
});

it("should mark regular operation as pageable when decorated with @markAsPageable", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          @nextLink
          nextLink?: string;
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

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
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
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkVerb, "GET");
});

it("should apply @markAsPageable with language scope", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          @nextLink
          nextLink?: string;
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

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");
});

it("should warn when @markAsPageable is applied to operation not returning model", async () => {
  const diagnostics = await basicRunner.diagnose(`
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
  await basicRunner.compile(`
      @service
      namespace TestService {
        model PagedResult<T> {
          @pageItems
          value: T[];
          @nextLink
          nextLink?: string;
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

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listProducts");

  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "array");
});

it("should work with operations returning list in different response structures", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemPage {
          @pageItems
          data: Item[];
          @continuationToken
          continuationToken?: string;
        }

        model Item {
          id: string;
          value: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op getItems(): ItemPage;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "getItems");
});

it("should handle nested model responses", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ResultWrapper {
          @pageItems
          items: Item[];
          @nextLink
          nextPageToken?: string;
        }

        model Item {
          id: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsPageable
        @route("/items")
        @get
        op listItems(): ResultWrapper;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");
});

it("should apply @pageItems to 'value' property when not already decorated", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          value: Item[];
          @nextLink
          nextLink?: string;
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

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listItems");
  
  // Check paging metadata
  ok(method.pagingMetadata);
  strictEqual(method.pagingMetadata.nextLinkSegments?.length, 1);
  strictEqual(method.pagingMetadata.nextLinkVerb, "GET");
});

it("should warn when model has no @pageItems property and no 'value' property", async () => {
  const diagnostics = await basicRunner.diagnose(`
      @service
      namespace TestService {
        model ItemListResult {
          data: Item[];
          @nextLink
          nextLink?: string;
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
  const pythonRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-python",
  });

  await pythonRunner.compile(`
      @service
      namespace TestService {
        model ItemListResult {
          @pageItems
          items: Item[];
          @nextLink
          nextLink?: string;
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

  const methods = pythonRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  // Should be basic method since scope is csharp but emitter is python
  strictEqual(method.kind, "basic");
});

it("should warn when operation already has @list (ARM ResourceListByParent)", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-csharp",
  });

  const diagnostics = await armRunner.diagnoseWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      op listEmployees is ArmResourceListByParent<Employee>;
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/mark-as-pageable-ineffective",
  );
});

it("should work with ARM action with @pageItems property", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-csharp",
  });

  await armRunner.compileWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      model EmployeeListResult {
        @pageItems
        employees: Employee[];
        @nextLink
        nextLink?: string;
      }
      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      op listEmployeesByDepartment is ArmResourceActionSync<Employee, void, EmployeeListResult>;
    `);

  const methods = armRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  
  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listEmployeesByDepartment");
  
  // Check paging metadata
  ok(method.pagingMetadata);
  strictEqual(method.pagingMetadata.nextLinkVerb, "GET");
});

it("should work with ARM action with value property without @pageItems", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-csharp",
  });

  await armRunner.compileWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      model EmployeeListResult {
        value: Employee[];
        @nextLink
        nextLink?: string;
      }
      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      op getEmployees is ArmResourceActionSync<Employee, void, EmployeeListResult>;
    `);

  const methods = armRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  
  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "getEmployees");
  
  // Check paging metadata
  ok(method.pagingMetadata);
  strictEqual(method.pagingMetadata.nextLinkVerb, "GET");
});

it("should fail with ARM action with array property not named value without @pageItems", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-csharp",
  });

  const diagnostics = await armRunner.diagnoseWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      model EmployeeListResult {
        items: Employee[];
      }
      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      op listEmployeeItems is ArmResourceActionSync<Employee, void, EmployeeListResult>;
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-pageable-target",
  );
});

it("should work with ARM ListSinglePage legacy operation", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-csharp",
  });

  await armRunner.compileWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      @Azure.ClientGenerator.Core.Legacy.markAsPageable
      op listSinglePageEmployees is ArmListSinglePageByParent<Employee>;
    `);

  const methods = armRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  
  const method = methods[0];
  strictEqual(method.kind, "paging");
  strictEqual(method.name, "listSinglePageEmployees");
  
  // Check paging metadata
  ok(method.pagingMetadata);
});
