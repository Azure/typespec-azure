import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnnamedTypesRule } from "../../src/rules/no-unnamed-types.rule.js";
import { createSdkTestRunner } from "../test-host.js";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoImports: ["@azure-tools/typespec-azure-resource-manager"],
    autoUsings: ["Azure.ResourceManager", "Azure.Core", "Azure.Core.Traits"]
  });
  tester = createLinterRuleTester(
    runner,
    noUnnamedTypesRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

describe("models", () => {
  it("anonymous model in property of another model", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          @usage(Usage.input)
          model NamedModel {
            anonymousModelProp: {
              foo: string;
            };
          }
        }
        
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "NamedModelAnonymousModelProp" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("nested anonymous model", async () => {
    // should emit twice: once for each anonymous model
    await tester
      .expect(
        `
        @service
        namespace TestService {
          @usage(Usage.input)
          model NamedModel {
            nestedAnonymousModelProp: {
              firstLevelProp: {
                secondLevelProp: string;
              }
            };
          }
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "NamedModelNestedAnonymousModelProp" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "NamedModelNestedAnonymousModelPropFirstLevelProp" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("anonymous model inline in operation request", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          op foo(body: {prop: string}): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "FooRequestBody" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("anonymous model inline in operation response", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          op foo(): {prop: string};
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "FooResponse" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("anonymous model caused by templates", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          model Widget {
            prop: string;
          }
          model OperationStatus<StatusResult> {
            result?: StatusResult;
          }
          op foo(): AcceptedResponse & OperationStatus<Widget>;
        }
        `,
      )
      .toBeValid();
  });

  it("unused anonymous model", async () => {
    await tester
      .expect(
        `
          @service
          namespace TestService;
          model A {
            prop: {prop: string};
          };
          `,
      )
      .toBeValid();
  });
  it("discriminated model with nested anonymous model with readonly property", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          @usage(Usage.output)
          model JobModelProperties {
            customProperties: JobModelCustomProperties;
          }
          @discriminator("instanceType")
          model JobModelCustomProperties {
            @visibility(Lifecycle.Read)
            affectedObjectDetails?: {
              description?: string;
              type?: "object";
            };
          }
        }
          `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "JobModelCustomPropertiesAffectedObjectDetails" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("anonymous model in versioned service", async () => {
    await tester
      .expect(
        `
        @versioned(Versions)
        @service
        namespace Test;

        /** Contoso API versions */
        enum Versions {
          "2021-10-01-preview",
        }

        @usage(Usage.input)
        model Temp {
          foo: {
            bar: string;
          }
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model with generated name "TempFoo" detected. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("empty model", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
          model Test {
            prop: {};
          }
        `,
      )
      .toBeValid();
  });

  it("empty model array", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;
          model Test {
            prop: {}[];
          }
        `,
      )
      .toBeValid();
  });
});

describe("unions", () => {
  it("anonymous union of strings", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          op foo(@body body: "one" | "two"): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union with generated name "FooRequest" detected. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("anonymous union of models", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          model One {
            prop: string;
          }

          model Two {
            prop: string;
          }
          op foo(param: One | Two): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union with generated name "FooRequestParam" detected. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("anonymous union of enums", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          enum One { one }

          enum Two { two }
          op foo(param: One | Two): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union with generated name "FooRequestParam" detected. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("anonymous extensible enum", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          op foo(param: "dog" | "cat" | "bird" | string): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union with generated name "FooRequestParam" detected. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("nullable scalar", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
        @usage(Usage.input)
          model One {
            prop?: string | null;
          }
        }
        `,
      )
      .toBeValid();
  });
  it("nullable enum", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          enum Foo { one }
          
          op bar(param: Foo | null): void;
        }
        `,
      )
      .toBeValid();
  });
  it("nullable model", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          model One {
            prop: string;
          }
          op foo(param: One | null): void;
        }
        `,
      )
      .toBeValid();
  });

  it("nullable model union", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService {
          model One {
            prop: string;
          }

          model Two {
            prop: string;
          }
          op foo(param: One | Two | null): void;
        }
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union with generated name "FooRequestParam" detected. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
  it("union of scalars", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;

        @usage(Usage.input)
        model Foo {
          prop: string | int32;
        }
        `,
      )
      .toBeValid();
  });
  it("anonymous model caused by lro metadata", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace("My.Service")
        @server("http://localhost:3000", "endpoint")
        @service(#{title: "My.Service"})
        @versioned(Versions)
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace My.Service;

        /** Api versions */
        enum Versions {
          /** 2024-04-01-preview api version */
          V2024_04_01_PREVIEW: "2024-04-01-preview",
        }
        /** A ContosoProviderHub resource */
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }

        /** Employee properties */
        model EmployeeProperties {
          /** Age of employee */
          age?: int32;
        }
        @armResourceOperations
        interface Employees {
          /** A sample resource action that move employee to different location */
          move is ArmResourceActionAsync<Employee, {id?: string}, {@body body: {id?: string}}>;
        }
        `,
      )
      .toBeValid();
  });
});
