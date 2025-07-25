import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkServiceMethod } from "../../src/interfaces.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-java",
    "examples-dir": `./examples`,
  });
});

describe("GitHub Issue #3052 - String value examples for number/boolean types", () => {
  it("should validate the exact issue requirements", async () => {
    // This test validates the exact scenario from GitHub issue #3052
    await runner.host.addTypeSpecFile(
      "./examples/github-issue-3052.json",
      JSON.stringify({
        operationId: "githubIssue3052",
        title: "GitHub Issue #3052 test",
        parameters: {
          // Common scenarios where users might provide string values in examples
          count: "10",         // integer as string
          price: "99.99",      // float as string  
          enabled: "true",     // boolean as string
          disabled: "false",   // boolean as string
          // Edge cases
          negative: "-42",     // negative number as string
          zero: "0",           // zero as string
          scientific: "1e3"    // scientific notation as string
        },
        responses: {
          "200": {
            body: {
              total: "156.78",     // response body with string numbers
              success: "true"      // response body with string boolean
            }
          }
        }
      })
    );

    await runner.compile(`
      @service
      namespace TestClient {
        model ResponseBody {
          total: float64;
          success: boolean;
        }
        
        op githubIssue3052(
          @query count: int32,
          @query price: float64,
          @query enabled: boolean,
          @query disabled: boolean,
          @query negative: int32,
          @query zero: int32,
          @query scientific: float64
        ): ResponseBody;
      }
    `);

    const operation = (
      runner.context.sdkPackage.clients[0].methods[0] as SdkServiceMethod<SdkHttpOperation>
    ).operation;
    ok(operation);
    strictEqual(operation.examples?.length, 1);

    // Validate parameters
    const parameters = operation.examples[0].parameters;
    ok(parameters);
    strictEqual(parameters.length, 7);

    // Validate each conversion
    strictEqual(parameters[0].value.value, 10);        // "10" -> 10
    strictEqual(parameters[1].value.value, 99.99);     // "99.99" -> 99.99
    strictEqual(parameters[2].value.value, true);      // "true" -> true
    strictEqual(parameters[3].value.value, false);     // "false" -> false
    strictEqual(parameters[4].value.value, -42);       // "-42" -> -42
    strictEqual(parameters[5].value.value, 0);         // "0" -> 0
    strictEqual(parameters[6].value.value, 1000);      // "1e3" -> 1000

    // Validate response body conversion
    const response = operation.examples[0].responses.find((x) => x.statusCode === 200);
    ok(response);
    ok(response.bodyValue);
    strictEqual(response.bodyValue.kind, "model");
    
    const bodyValue = response.bodyValue.value;
    strictEqual(bodyValue.total.value, 156.78);  // "156.78" -> 156.78
    strictEqual(bodyValue.success.value, true);  // "true" -> true

    expectDiagnostics(runner.context.diagnostics, []);
  });
});