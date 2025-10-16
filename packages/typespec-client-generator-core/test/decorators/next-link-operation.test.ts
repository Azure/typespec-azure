import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Namespace, Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getNextLinkOperation } from "../../src/decorators.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
});

it("should store next link operation HTTP verb", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
        next: string;
      }
      
      model Test {
        id: string;
      }
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkOperation("POST")
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference(
    "TestService",
  )[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkOperation(runner.context, operation);
  strictEqual(verb, "POST");
});

it("should apply nextLinkOperation with language scope", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
        next: string;
      }
      
      model Test {
        id: string;
      }
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkOperation("PUT", "java")
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference(
    "TestService",
  )[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkOperation(runner.context, operation);
  strictEqual(verb, "PUT");
});

it("should return undefined when decorator is not applied", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
        next: string;
      }
      
      model Test {
        id: string;
      }
      
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference(
    "TestService",
  )[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkOperation(runner.context, operation);
  strictEqual(verb, undefined);
});

it("should support different HTTP verbs", async () => {
  await runner.compile(`
    @service
    namespace TestService {
      model ListTestResult {
        @pageItems
        tests: Test[];
        @TypeSpec.nextLink
        next: string;
      }
      
      model Test {
        id: string;
      }
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkOperation("GET")
      @list
      @route("/list-get")
      @post
      op listWithGet(): ListTestResult;
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkOperation("PATCH")
      @list
      @route("/list-patch")
      @post
      op listWithPatch(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference(
    "TestService",
  )[0]! as Namespace;
  
  const listWithGetOp = namespace.operations.get("listWithGet")! as Operation;
  const getVerb = getNextLinkOperation(runner.context, listWithGetOp);
  strictEqual(getVerb, "GET");

  const listWithPatchOp = namespace.operations.get("listWithPatch")! as Operation;
  const patchVerb = getNextLinkOperation(runner.context, listWithPatchOp);
  strictEqual(patchVerb, "PATCH");
});
