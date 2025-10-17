import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { Namespace, Operation } from "@typespec/compiler";
import { strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { getNextLinkVerb } from "../../src/decorators.js";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({
    librariesToAdd: [AzureCoreTestLibrary],
    autoUsings: ["Azure.Core", "Azure.Core.Traits"],
    emitterName: "@azure-tools/typespec-java",
  });
});

it("should store next link verb HTTP verb", async () => {
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
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST")
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference("TestService")[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkVerb(runner.context, operation);
  strictEqual(verb, "POST");
});

it("should apply nextLinkVerb with language scope", async () => {
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
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST", "java")
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference("TestService")[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkVerb(runner.context, operation);
  strictEqual(verb, "POST");
});

it("should return GET when decorator is not applied", async () => {
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

  const namespace = runner.context.program.resolveTypeReference("TestService")[0]! as Namespace;
  const operation = namespace.operations.get("listItems")! as Operation;
  const verb = getNextLinkVerb(runner.context, operation);
  strictEqual(verb, "GET");
});

it("should support POST and GET HTTP verbs", async () => {
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
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("GET")
      @list
      @route("/list-get")
      @post
      op listWithGet(): ListTestResult;
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("POST")
      @list
      @route("/list-post")
      @post
      op listWithPost(): ListTestResult;
    }
  `);

  const namespace = runner.context.program.resolveTypeReference("TestService")[0]! as Namespace;

  const listWithGetOp = namespace.operations.get("listWithGet")! as Operation;
  const getVerb = getNextLinkVerb(runner.context, listWithGetOp);
  strictEqual(getVerb, "GET");

  const listWithPostOp = namespace.operations.get("listWithPost")! as Operation;
  const postVerb = getNextLinkVerb(runner.context, listWithPostOp);
  strictEqual(postVerb, "POST");
});

it("should reject invalid HTTP verbs", async () => {
  const diagnostics = await runner.diagnose(`
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
      
      @Azure.ClientGenerator.Core.Legacy.nextLinkVerb("PATCH")
      @list
      @post
      op listItems(): ListTestResult;
    }
  `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-next-link-operation-verb",
  );
});
