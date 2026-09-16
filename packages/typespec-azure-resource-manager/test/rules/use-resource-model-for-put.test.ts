import { Tester } from "#test/tester.js";
import { resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { beforeEach, it } from "vitest";
import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";
import { useInterfaceRule } from "../../src/rules/use-interface.js";
import { useOperationDecoratorRule } from "../../src/rules/use-operation-decorator.js";
import { useResourceModelForPutRule } from "../../src/rules/use-resource-model-for-put.js";

let tester: LinterRuleTester;
const library = "@azure-tools/typespec-azure-resource-manager";
const diagnostic = {
  code: `${library}/use-resource-model-for-put`,
  message: "PUT 200/201 resource response models must be registered as ARM resources.",
  target: "Response",
};
const manual = "model Response { name: string; type: string; }";

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    useResourceModelForPutRule,
    library,
  );
});

function service(model = manual, response = "ArmResponse<Response>") {
  return `
    @armProviderNamespace @service namespace Microsoft.Contoso;
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    ${model}
    @armResourceOperations interface Widgets {
      @put @armResourceCreateOrUpdate(Widget)
      create(...ResourceInstanceParameters<Widget>, @bodyRoot resource: Widget):
        ${response} | ErrorResponse;
    }
  `;
}

it("reports a decorated manual response not checked by existing operation rules", async () => {
  const code = service();
  for (const rule of [useInterfaceRule, useOperationDecoratorRule, armResourceOperationsRule]) {
    await createLinterRuleTester(await Tester.createInstance(), rule, library)
      .expect(code)
      .toBeValid();
  }
  await tester.expect(code).toEmitDiagnostics(diagnostic);
});

it("reports a resource-shaped response from a namespace-level PUT", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      ${manual}
      @put op create(): Response;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a resource-shaped response in a nested provider namespace", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      namespace Nested {
        ${manual}
        @put op create(): Response;
      }
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("accepts a registered tracked resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("accepts a registered proxy resource", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace namespace Microsoft.Contoso;
      model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
      @armResourceOperations interface Widgets {
        createOrUpdate is ArmResourceCreateOrReplaceSync<Widget>;
      }
    `,
    )
    .toBeValid();
});

it("ignores PATCH responses", async () => {
  await tester.expect(`${manual} @patch op update(): global.Response;`).toBeValid();
});

it("checks global PUT responses when the ARM rule is selected", async () => {
  await tester.expect(`${manual} @put op create(): global.Response;`).toEmitDiagnostics(diagnostic);
});

it("checks ordinary namespaces without a provider decorator", async () => {
  await tester
    .expect(`namespace Contoso; ${manual} @put op create(): Response;`)
    .toEmitDiagnostics(diagnostic);
});

it("checks nested namespaces without a provider decorator", async () => {
  await tester
    .expect(`namespace Contoso { namespace Nested { ${manual} @put op create(): Response; } }`)
    .toEmitDiagnostics(diagnostic);
});

it("checks inherited resource envelope properties", async () => {
  await tester
    .expect(service("model Base { name: string; type: string; } model Response extends Base {}"))
    .toEmitDiagnostics(diagnostic);
});

it("checks a 201 response when no 200 model exists", async () => {
  await tester
    .expect(service(manual, "ArmCreatedResponse<Response>"))
    .toEmitDiagnostics(diagnostic);
});

it("prefers a 200 model over a 201 model", async () => {
  await tester
    .expect(service(manual, "ArmResponse<Widget> | ArmCreatedResponse<Response>"))
    .toBeValid();
});

it("ignores an unrelated response status", async () => {
  await tester
    .expect(service(manual, "{ @statusCode statusCode: 202; @body body: Response; }"))
    .toBeValid();
});

it("ignores responses without a body", async () => {
  await tester.expect("@put op create(): void;").toBeValid();
});

it("ignores non-resource-shaped model bodies", async () => {
  await tester.expect(service("model Response { result: string; }")).toBeValid();
});

it("ignores scalar bodies", async () => {
  await tester.expect(service("", "string")).toBeValid();
});

it("reports once per PUT when operations share a response model", async () => {
  await tester
    .expect(
      `
      ${manual}
      @route("/one") @put op createOne(): global.Response;
      @route("/two") @put op createTwo(): global.Response;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("ignores uninstantiated operation and interface templates", async () => {
  await tester
    .expect(
      `
      ${manual}
      @put op Create<T>(@body body: T): global.Response;
      interface Operations<T> {
        @put create(@body body: T): global.Response;
      }
    `,
    )
    .toBeValid();
});

it("ignores PUT operations declared by an imported library", async () => {
  const libraryTester = createTester(resolvePath(import.meta.dirname, "../.."), {
    libraries: [
      "@typespec/http",
      "@typespec/rest",
      "@typespec/versioning",
      "@azure-tools/typespec-azure-core",
      "@azure-tools/typespec-azure-resource-manager",
    ],
  })
    .files({
      "node_modules/test-resource-library/package.json": JSON.stringify({
        name: "test-resource-library",
        version: "1.0.0",
        tspMain: "main.tsp",
      }),
      "node_modules/test-resource-library/main.tsp": `
        import "@typespec/http";
        import "@azure-tools/typespec-azure-resource-manager";
        using TypeSpec.Http;
        using Azure.ResourceManager;
        namespace TestResourceLibrary;
        model Response { name: string; type: string; }
        @put op create(): ArmResponse<Response>;
      `,
    })
    .importLibraries()
    .import("test-resource-library");
  const libraryRuleTester = createLinterRuleTester(
    await libraryTester.createInstance(),
    useResourceModelForPutRule,
    library,
  );

  await libraryRuleTester.expect("").toBeValid();
});

it("preserves source diagnostic counts for a template instantiation and alias", async () => {
  await tester
    .expect(
      `
      ${manual}
      @put op Create<T>(@body body: T): global.Response;
      op create is global.Create<string>;
    `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("verifies the documented incorrect and correct examples", async () => {
  const docs = readFileSync(
    new URL("../../src/rules/use-resource-model-for-put.md", import.meta.url),
    "utf8",
  );
  const examples = [...docs.matchAll(/```tsp\r?\n([\s\S]*?)```/g)].map((match) => match[1]);
  if (examples.length !== 2) throw new Error("Expected exactly two documented TypeSpec examples.");
  const docsTester = createTester(resolvePath(import.meta.dirname, "../.."), {
    libraries: [
      "@typespec/http",
      "@typespec/rest",
      "@typespec/versioning",
      "@azure-tools/typespec-azure-core",
      "@azure-tools/typespec-azure-resource-manager",
    ],
  });
  const docsRuleTester = createLinterRuleTester(
    await docsTester.createInstance(),
    useResourceModelForPutRule,
    library,
  );
  await docsRuleTester.expect(examples[0]).toEmitDiagnostics(diagnostic);
  await docsRuleTester.expect(examples[1]).toBeValid();
});
