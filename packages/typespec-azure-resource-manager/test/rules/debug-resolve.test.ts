import { Tester } from "#test/tester.js";
import { TesterInstance } from "@typespec/compiler/testing";
import { describe, it, beforeEach } from "vitest";
import { getResourceOperation, getResourcePathElements } from "../../src/resource.js";
import { getArmResourceOperationList } from "../../src/operations.js";
import { listArmResources } from "../../src/private.decorators.js";

let runner: TesterInstance;

beforeEach(async () => {
  runner = await Tester.createInstance();
});

describe("debug resolveArmResources", () => {
  it("checks if raw @armResourceAction operations are discovered", async () => {
    const { program } = (await runner.compile(`
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Employee is ProxyResource<{}> {
        ...ResourceNameParameter<Employee>;
      }

      model GenerateResponse {
        message: string;
      }

      @armResourceOperations
      interface Employees {
        get is ArmResourceRead<Employee>;
        @post
        @armResourceAction(Employee)
        generate(...ApiVersionParameter): GenerateResponse | ArmAcceptedLroResponse | ErrorResponse;
      }
    `)) as any;

    const resources = listArmResources(program);
    for (const resource of resources) {
      const opList = getArmResourceOperationList(program, resource.typespecType);
      for (const op of opList) {
        const armOp = getResourceOperation(program, op.operation);
        if (armOp) {
          console.log(`  Op: ${op.name} kind=${op.kind} path="${armOp.httpOperation.path}"`);
          const pathInfo = getResourcePathElements(armOp.httpOperation.path, op.kind);
          console.log(`    getResourcePathElements: ${JSON.stringify(pathInfo)}`);
        }
      }
    }
  });
});
