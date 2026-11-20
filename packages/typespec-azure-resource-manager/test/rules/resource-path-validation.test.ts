import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { beforeEach, expect, it } from "vitest";
import { resourcePathValidationRule } from "../../src/rules/resource-path-validation.js";

let tester: LinterRuleTester;
const code = "@azure-tools/typespec-azure-resource-manager/resource-path-validation";
const resourceType = {
  code,
  message:
    "The path for a GET, PUT, PATCH, or DELETE operation must contain a resource type after the provider namespace.",
};
const nested = {
  code,
  message: "The path for a nested resource must follow the resource type and name pattern.",
};
const tracked = {
  code,
  message: "A location-bearing resource path must be under a subscription and resource group.",
};
const rg =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test";
const sub = "/subscriptions/{subscriptionId}/providers/Microsoft.Test";

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    resourcePathValidationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function operation(path: string, verb: string, tail = "): void;"): string {
  const params = [...path.matchAll(/\{(\w+)\}/g)].map((match) => `@path ${match[1]}: string`);
  return `@route("${path}") @${verb} op test(${params.join(", ")}${tail}`;
}

it.each(["get", "put", "patch", "delete"])("checks resource type for %s", async (verb) => {
  await tester.expect(operation("/providers/Microsoft.Test", verb)).toEmitDiagnostics(resourceType);
  await tester.expect(operation("/providers/Microsoft.Test/widgets", verb)).toBeValid();
});

it("ignores POST for all checks", async () => {
  await tester.expect(operation("/providers/Microsoft.Test", "post")).toBeValid();
});

it.each([
  "/providers/Microsoft.Test/widgets/{widget}/parts/action",
  "/providers/Microsoft.Test/widgets/{widget}/parts/{part}/action/run",
  "/providers/Microsoft.Test/widgets/{widget}/{other}",
  "/providers/Microsoft.Test/widgets/missing/{part}",
  "/providers/Microsoft.Parent/parents/{parent}/providers/Microsoft.Test/widgets/missing/{widget}",
])("rejects upstream nested pattern %s", async (path) => {
  await tester.expect(operation(path, "get")).toEmitDiagnostics(nested);
});

it.each(["put", "patch", "delete"])("checks nested patterns for %s", async (verb) => {
  await tester
    .expect(operation("/providers/Microsoft.Test/widgets/{widget}/parts/action", verb))
    .toEmitDiagnostics(nested);
});

it.each([
  "/providers/Microsoft.Test/widgets",
  "/providers/Microsoft.Test/widgets/{widget}",
  "/providers/Microsoft.Test/widgets/{widget}/parts/{part}",
  "/providers/Microsoft.Test/widgets/default",
  "/providers/Microsoft.Test/widgets/{widget}/parts/default",
  "/providers/Microsoft.Parent/parents/{parent}/providers/Microsoft.Test/widgets/{widget}",
  "/{scope}/providers/Microsoft.Test/widgets/{widget}",
])("accepts valid collection, singleton, nested or extension path %s", async (path) => {
  await tester.expect(operation(path, "get")).toBeValid();
});

it("checks inherited location on a non-registered PUT body", async () => {
  await tester
    .expect(
      `
    model Base { location: string; }
    model Payload extends Base {}
    ${operation(`${sub}/widgets/{widget}`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toEmitDiagnostics(tracked);
  await tester
    .expect(
      `
    model Base { location: string; }
    model Payload extends Base {}
    ${operation(`${rg}/widgets/{widget}`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toBeValid();
});

it("checks a location inferred into an implicit PUT body", async () => {
  await tester
    .expect(operation(`${sub}/widgets/{widget}`, "put", ", location: string): void;"))
    .toEmitDiagnostics(tracked);
});

it("checks inherited and JSON-renamed location in a GET payload", async () => {
  await tester
    .expect(
      `
    model Base { @encodedName("application/json", "location") region: string; }
    model Payload extends Base {}
    ${operation(`${sub}/widgets/{widget}`, "get", "): Payload;")}
  `,
    )
    .toEmitDiagnostics(tracked);
});

it("uses request and response visibility and excludes HTTP metadata", async () => {
  await tester
    .expect(
      `
    model Payload { @visibility(Lifecycle.Read) location: string; }
    ${operation(`${sub}/widgets/{widget}`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toBeValid();
  await tester
    .expect(
      `
    model Payload { @visibility(Lifecycle.Create) location: string; }
    ${operation(`${sub}/widgets/{widget}`, "get", "): Payload;")}
  `,
    )
    .toBeValid();
  await tester
    .expect(
      `
    model Payload { @header location: string; }
    ${operation(`${sub}/widgets/{widget}`, "get", "): Payload;")}
  `,
    )
    .toBeValid();
});

it("checks location on the first successful GET response, not a later response", async () => {
  await tester
    .expect(
      `
    model Located { location: string; }
    model Early { @statusCode status: 200; @body body: Located; }
    model Late { @statusCode status: 201; @body body: string; }
    ${operation(`${sub}/widgets/{widget}`, "get", "): Late | Early;")}
  `,
    )
    .toEmitDiagnostics(tracked);
  await tester
    .expect(
      `
    model Located { location: string; }
    model Early { @statusCode status: 200; @body body: string; }
    model Late { @statusCode status: 201; @body body: Located; }
    ${operation(`${sub}/widgets/{widget}`, "get", "): Late | Early;")}
  `,
    )
    .toBeValid();
});

it("checks each HTTP body alternative for the first successful status", async () => {
  await tester
    .expect(
      `
    model Located { location: string; }
    model First { @statusCode status: 200; @body body: string; }
    model Second { @statusCode status: 200; @body body: Located; }
    ${operation(`${sub}/widgets/{widget}`, "get", "): First | Second;")}
  `,
    )
    .toEmitDiagnostics(tracked);
});

it("checks PUT even when a GET on the same path has no successful response", async () => {
  await tester
    .expect(
      `
    model Payload { location: string; }
    @error model Failure { @statusCode status: 400; }
    ${operation(`${sub}/widgets/{widget}`, "put", ", @body body: Payload): void;")}
    ${operation(`${sub}/widgets/{widget}`, "get", "): Failure;").replace("op test", "op read")}
  `,
    )
    .toEmitDiagnostics(tracked);
});

it("does not use a later location-bearing GET response when the first success has no body", async () => {
  await tester
    .expect(
      `
      model Located { location: string; }
      model Empty { @statusCode status: 200; }
      model Later { @statusCode status: 201; @body body: Located; }
      ${operation(`${sub}/widgets/{widget}`, "get", "): Empty | Later;")}
    `,
    )
    .toBeValid();
});

it("does not apply the location check to PATCH or an unrelated body", async () => {
  await tester
    .expect(
      `
    model Payload { location: string; }
    ${operation(`${sub}/widgets/{widget}`, "patch", ", @body body: Payload): Payload;")}
  `,
    )
    .toBeValid();
  await tester
    .expect(
      `
    model Payload { description: string; }
    ${operation(`${sub}/widgets/{widget}`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toBeValid();
});

it("reports one nested finding for a location-bearing resource under a resource group", async () => {
  await tester
    .expect(
      `
    model Payload { location: string; }
    ${operation(`${rg}/widgets/{widget}/parts/action`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toEmitDiagnostics(nested);
});

it("reports distinct nested and scope defects together", async () => {
  await tester
    .expect(
      `
    model Payload { location: string; }
    ${operation(`${sub}/widgets/{widget}/parts/action`, "put", ", @body body: Payload): void;")}
  `,
    )
    .toEmitDiagnostics([nested, tracked]);
});

it("retains distinct missing-type and tracked-scope findings", async () => {
  await tester
    .expect(
      `
    model Payload { location: string; }
    ${operation("/providers/Microsoft.Test", "put", "@body body: Payload): void;")}
  `,
    )
    .toEmitDiagnostics([resourceType, tracked]);
});

it("accepts the standard ARM create and read templates", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      create is ArmResourceCreateOrReplaceSync<Widget>;
      read is ArmResourceRead<Widget>;
    }
  `,
    )
    .toBeValid();
});

it("validates an operation inherited from a generic interface exactly once", async () => {
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/providers/Microsoft.Test") @get read(): T;
      }
      /*target*/interface Concrete extends Template<string> {}
    `,
    )
    .toEmitDiagnostics((result) => ({ ...resourceType, pos: result.pos.target.pos }));
});

it("accepts a valid operation inherited from a generic interface", async () => {
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/providers/Microsoft.Test/widgets") @get read(): T;
      }
      interface Concrete extends Template<string> {}
    `,
    )
    .toBeValid();
});

it("ignores an uninstantiated generic interface", async () => {
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/providers/Microsoft.Test") @get read(): T;
      }
    `,
    )
    .toBeValid();
});

it("checks distinct concrete instantiations rather than the generic source", async () => {
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/providers/Microsoft.Test") @get read(): T;
      }
      @route("/first") interface First extends Template<string> {}
      @route("/second") interface Second extends Template<string> {}
    `,
    )
    .toEmitDiagnostics([resourceType, resourceType]);
});

it("checks other path branches on inherited generic operations", async () => {
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/providers/Microsoft.Test/widgets/{widget}/parts/action")
        @get read(@path widget: string): T;
      }
      interface Concrete extends Template<string> {}
    `,
    )
    .toEmitDiagnostics(nested);
  await tester
    .expect(
      `
      interface Template<T> {
        @route("/subscriptions/{subscriptionId}/providers/Microsoft.Test/widgets/{widget}")
        @get read(@path subscriptionId: string, @path widget: string): T;
      }
      model Located { location: string; }
      interface Concrete extends Template<Located> {}
    `,
    )
    .toEmitDiagnostics(tracked);
});

it("checks a concrete operation alias but not its generic source", async () => {
  await tester
    .expect(
      `
      @route("/providers/Microsoft.Test") @get op Template<T>(): T;
      op concrete is Template<string>;
    `,
    )
    .toEmitDiagnostics(resourceType);
});

it("validates concrete operations inherited from a library without linting library declarations", async () => {
  const runner = await Tester.files({
    "node_modules/test-path-template/package.json": JSON.stringify({
      name: "test-path-template",
      version: "1.0.0",
      tspMain: "main.tsp",
    }),
    "node_modules/test-path-template/main.tsp": `
      import "@typespec/http";
      using TypeSpec.Http;
      namespace TestPathLibrary;
      interface Template<T> {
        @route("/providers/Microsoft.Test") @get read(): T;
      }
      interface LibraryConcrete extends Template<string> {}
    `,
  })
    .import("test-path-template")
    .createInstance();
  const libraryTester = createLinterRuleTester(
    runner,
    resourcePathValidationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await libraryTester.expect("").toBeValid();
  await libraryTester
    .expect(`/*target*/interface Concrete extends TestPathLibrary.Template<string> {}`)
    .toEmitDiagnostics((result) => ({ ...resourceType, pos: result.pos.target.pos }));
});

it("allows suppression on the concrete interface without hiding another instance", async () => {
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `
      interface Template<T> {
        @route("/providers/Microsoft.Test") @get read(): T;
      }
      #suppress "${code}" "Reviewed legacy contract."
      @route("/first") interface First extends Template<string> {}
      @route("/second") interface Second extends Template<int32> {}
    `,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true } } } },
  );
  expect(diagnostics.filter((d) => d.code === code)).toHaveLength(1);
});

it("checks an additional path parameter on a standard resource template", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      read is ArmResourceRead<Widget, Parameters = { @path other: string; }>;
    }
  `,
    )
    .toEmitDiagnostics(nested);
});

it("preserves the independent PUT path rule when both rules are enabled", async () => {
  const putRule = "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put";
  const [, diagnostics] = await Tester.compileAndDiagnose(
    operation("/providers/Microsoft.Test/widgets/{widget}/parts/action", "put"),
    { compilerOptions: { linterRuleSet: { enable: { [code]: true, [putRule]: true } } } },
  );
  expect(
    diagnostics
      .filter((d) => d.code === code || d.code === putRule)
      .map((d) => d.code)
      .sort(),
  ).toEqual([code, putRule].sort());
});

it("suppresses the combined rule without suppressing the independent PUT rule", async () => {
  const putRule = "@azure-tools/typespec-azure-resource-manager/use-resource-path-for-put";
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `#suppress "${code}" "Reviewed legacy contract."
    ${operation("/providers/Microsoft.Test/widgets/{widget}/parts/action", "put")}`,
    { compilerOptions: { linterRuleSet: { enable: { [code]: true, [putRule]: true } } } },
  );
  expect(
    diagnostics.filter((d) => d.code === code || d.code === putRule).map((d) => d.code),
  ).toEqual([putRule]);
});

it("compiles the documented incorrect and correct examples", async () => {
  const docs = readFileSync(
    new URL("../../src/rules/resource-path-validation.md", import.meta.url),
    "utf8",
  );
  const snippets = [...docs.matchAll(/```tsp\n([\s\S]*?)```/g)].map((match) => match[1]);
  expect(snippets).toHaveLength(4);
  const setup = `
    @armProviderNamespace namespace Microsoft.Test;
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
  `;
  await tester.expect(setup + snippets[0]).toEmitDiagnostics(nested);
  await tester.expect(snippets[1]).toEmitDiagnostics(tracked);
  await tester.expect(setup + snippets[2]).toBeValid();
  await tester.expect(snippets[3]).toBeValid();
});
