import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noUnnamedTypesRule } from "../../src/rules/no-unnamed-types.rule.js";
import { ArmTester, AzureCoreTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await AzureCoreTester.createInstance();
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
        },
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
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

  it("anonymous model caused by lro metadata", async () => {
    const armRunner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      armRunner,
      noUnnamedTypesRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @versioned(Versions)
        namespace TestClient;
        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
        model MoveRequest {
          targetResourceGroup?: string;
        }
        model EmployeeProperties {
          age?: int32;
        }
        op move is ArmResourceActionAsync<Employee, MoveRequest, {@body body: {id?: string}}>;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("does not flag anonymous types defined inside library operations", async () => {
    // Standard ARM operations pull in many library-internal anonymous types
    // (envelopes, metadata, etc.). None of those should be reported.
    const armRunner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      armRunner,
      noUnnamedTypesRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @versioned(Versions)
        namespace TestClient;
        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
        model EmployeeProperties {
          age?: int32;
        }
        interface Employees extends Azure.ResourceManager.TrackedResourceOperations<Employee, EmployeeProperties> {}
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
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
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
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
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

  it("does not flag status-code response envelope union", async () => {
    // Clients only surface the response body, never the status-code envelope union
    // that appears at the operation return position.
    await tester
      .expect(
        `
        @service
        namespace TestService;

        model Widget {
          id: string;
        }

        op foo(): {@statusCode _: 200; @body body: Widget} | {@statusCode _: 204};
        `,
      )
      .toBeValid();
  });

  it("does not flag ArmResponse<T> | ErrorResponse return union", async () => {
    const armRunner = await ArmTester.createInstance();
    const armTester = createLinterRuleTester(
      armRunner,
      noUnnamedTypesRule,
      "@azure-tools/typespec-client-generator-core",
    );
    await armTester
      .expect(
        `
        @armProviderNamespace
        @service
        @versioned(Versions)
        namespace TestClient;
        enum Versions {
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }
        model EmployeeProperties {
          age?: int32;
        }
        model Trial {
          status?: string;
        }
        @armResourceAction(Employee)
        op checkTrial(...ResourceInstanceParameters<Employee>): ArmResponse<Trial> | ErrorResponse;
        `,
      )
      .toBeValid();
  });

  it("still flags anonymous body inside status-code response union", async () => {
    await tester
      .expect(
        `
        @service
        namespace TestService;

        op foo(): {@statusCode _: 200; @body body: {inner: string}} | {@statusCode _: 204};
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous model detected in the client surface. Define this model separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });

  it("still flags a genuine anonymous body union in the return position", async () => {
    // Not a status-code envelope union: the whole union is the response body and is
    // surfaced by the client, so it must still be flagged.
    await tester
      .expect(
        `
        @service
        namespace TestService;

        op getColor(): "red" | "green" | "blue";
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/no-unnamed-types",
          severity: "warning",
          message: `Anonymous union detected in the client surface. Define this union separately with a proper name to improve code readability and reusability.`,
        },
      ]);
  });
});
