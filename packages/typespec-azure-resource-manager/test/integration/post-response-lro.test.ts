import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { expectDiagnosticEmpty } from "@typespec/compiler/testing";
import { expect, it } from "vitest";
import { getArmResources } from "../../src/resource.js";
import { Tester } from "../tester.js";

it("exempts a registered LRO action whose initial response contains a bodyless 200", async () => {
  const [{ program }, diagnostics] = await Tester.compileAndDiagnose(
    `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }
      @armResourceOperations interface Employees {
        hire is ArmResourceActionAsync<Employee, void, Response = OkResponse>;
      }
    `,
    {
      compilerOptions: {
        linterRuleSet: {
          enable: { "@azure-tools/typespec-azure-resource-manager/no-empty-post-response": true },
        },
      },
    },
  );
  const operation = getArmResources(program)[0].operations.actions.hire;
  expect(getLroMetadata(program, operation.operation)).toBeDefined();
  expect(
    operation.httpOperation.responses.some(
      (response) =>
        response.statusCodes === 200 &&
        response.responses.some((variant) => variant.body === undefined),
    ),
  ).toBe(true);
  expectDiagnosticEmpty(diagnostics);
});
