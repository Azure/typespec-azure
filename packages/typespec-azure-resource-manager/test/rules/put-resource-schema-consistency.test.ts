import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { readFileSync } from "node:fs";
import { beforeEach, it } from "vitest";
import { putResourceSchemaConsistencyRule } from "../../src/rules/put-resource-schema-consistency.js";

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    putResourceSchemaConsistencyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const code = "@azure-tools/typespec-azure-resource-manager/put-resource-schema-consistency";
const models = `
  @armProviderNamespace namespace Resources {
    model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
    model Other is ProxyResource<{}> { ...ResourceNameParameter<Other>; }
  }
  using Resources;
  model Ok<T> { @statusCode statusCode: 200; @body body: T; }
  model Created<T> { @statusCode statusCode: 201; @body body: T; }
`;
const diagnostic = (bodies: string, target = "put") => ({
  code,
  severity: "warning" as const,
  message: `PUT bodies must reuse the same resource model. Found ${bodies.replaceAll("Widget", "Resources.Widget").replaceAll("Other", "Resources.Other")}.`,
  target,
});

it("accepts the same model across the request and both responses", async () => {
  await tester
    .expect(
      `${models}
    @put op put(@body body: Widget): Ok<Widget> | Created<Widget>;
  `,
    )
    .toBeValid();
});

it.each([200, 201])("compares the request with a lone %s response", async (status) => {
  const response = status === 200 ? "Ok" : "Created";
  await tester
    .expect(
      `${models}
    @put op put(@body body: Other): ${response}<Widget>;
  `,
    )
    .toEmitDiagnostics([diagnostic(`request: Other; ${status} response: Widget`)]);
});

it.each([
  ["Other", "Widget", "Widget"],
  ["Widget", "Other", "Widget"],
  ["Widget", "Widget", "Other"],
])("reports one diagnostic for request %s, 200 %s and 201 %s", async (request, ok, created) => {
  await tester
    .expect(
      `${models}
    @put op put(@body body: ${request}): Ok<${ok}> | Created<${created}>;
  `,
    )
    .toEmitDiagnostics([
      diagnostic(`request: ${request}; 200 response: ${ok}; 201 response: ${created}`),
    ]);
});

const missingRequest = {
  code,
  severity: "warning" as const,
  message: "ARM PUT operations must have a request body.",
  target: "put",
};
const unregistered = (bodies: string) => ({
  code,
  severity: "warning" as const,
  message: `PUT bodies must use registered ARM resource models. Found ${bodies}.`,
  target: "put",
});

it("prioritizes the missing request over response mismatches", async () => {
  await tester
    .expect(`${models} @put op put(): Ok<Widget> | Created<Other>;`)
    .toEmitDiagnostics([missingRequest]);
});

it.each([
  "@put op put(): Ok<Widget>;",
  "@put op put(): void;",
  "@put op put(@body body: void): Ok<Widget>;",
  "@put op put(@header token: string, @query filter?: string): Created<Widget>;",
])("reports an absent request body: %s", async (operation) => {
  await tester.expect(`${models} ${operation}`).toEmitDiagnostics([missingRequest]);
});

it.each([200, 201])(
  "requires registration for a shared plain model at status %s",
  async (status) => {
    await tester
      .expect(
        `${models}
    model Plain { name: string; type: string; }
    @put op put(@body body: Plain): ${status === 200 ? "Ok" : "Created"}<Plain>;
  `,
      )
      .toEmitDiagnostics([unregistered(`request: Plain; ${status} response: Plain`)]);
  },
);

it("does not require name/type property heuristics to reject an unregistered model", async () => {
  await tester
    .expect(
      `${models}
    model Plain { value: string; }
    @put op put(@body body: Plain): Ok<Plain> | Created<Plain>;
  `,
    )
    .toEmitDiagnostics([unregistered("request: Plain; 200 response: Plain; 201 response: Plain")]);
});

it("checks an identifiable unregistered response even with an unsupported request", async () => {
  await tester
    .expect(
      `${models}
    model Plain { value: string; }
    @put op put(@body body: string): Created<Plain>;
  `,
    )
    .toEmitDiagnostics([unregistered("201 response: Plain")]);
});

it("compares request and 201 even when 200 is bodyless", async () => {
  await tester
    .expect(
      `${models}
    @put op put(@body body: Other): { @statusCode status: 200; } | Created<Widget>;
  `,
    )
    .toEmitDiagnostics([diagnostic("request: Other; 201 response: Widget")]);
});

it.each([
  "@put op put(@body body: Widget): void;",
  "@put op put(@body body: Widget): { @statusCode status: 204; };",
  "@post op put(@body body: Other): Ok<Widget> | Created<Other>;",
  "@patch op put(@body body: Other): Ok<Widget> | Created<Other>;",
])("does not require missing participants or check other verbs: %s", async (operation) => {
  await tester.expect(`${models} ${operation}`).toBeValid();
});

it("ignores 202 and error bodies", async () => {
  await tester
    .expect(
      `${models}
    @error model Failure { @statusCode status: 400; @body body: Other; }
    @put op put(@body body: Widget): Ok<Widget> | Created<Widget> |
      { @statusCode status: 202; @body body: Other; } | Failure;
  `,
    )
    .toBeValid();
});

it("accepts shared models with lifecycle visibility, defaults and constraints", async () => {
  await tester
    .expect(
      `
    ${models}
    @armProviderNamespace namespace Custom {
      model ResourceModel is ProxyResource<{
        @visibility(Lifecycle.Create, Lifecycle.Update) secret?: string;
        @minLength(1) value: string = "same";
      }> { ...ResourceNameParameter<ResourceModel>; }
    }
    @put op put(@bodyRoot body: Custom.ResourceModel):
      Ok<Custom.ResourceModel> | Created<Custom.ResourceModel>;
  `,
    )
    .toBeValid();
});

it.each(["alias Copy = Widget;", ""])(
  "accepts aliases and implicit bodies using original properties: %s",
  async (alias) => {
    await tester
      .expect(
        `${models}
    ${alias}
    @put op put(...Widget): {
      @statusCode status: 200;
      @header etag: string;
      ...Widget;
    } | Created<${alias ? "Copy" : "Widget"}>;
  `,
      )
      .toBeValid();
  },
);

it.each(["model Copy is Widget;", "model Copy extends Widget {}", "model Copy { ...Widget; }"])(
  "does not equate separately declared resource models: %s",
  async (copy) => {
    await tester
      .expect(
        `${models}
      @armProviderNamespace namespace Copies { ${copy} }
      @put op put(@body body: Widget): Ok<Copies.Copy>;
    `,
      )
      .toEmitDiagnostics([diagnostic("request: Widget; 200 response: Copies.Copy")]);
  },
);

it("does not equate same-named models in different namespaces", async () => {
  await tester
    .expect(
      `${models}
    namespace One { model Resource { value: string; } }
    namespace Two { model Resource { value: string; } }
    @put op put(@body body: One.Resource): Ok<Two.Resource>;
  `,
    )
    .toEmitDiagnostics([diagnostic("request: One.Resource; 200 response: Two.Resource")]);
});

it.each([
  "{ value: string; }",
  "string",
  "bytes",
  "[string]",
  "Widget[]",
  "Record<Widget>",
  "Widget | Other",
])("skips unsupported or unidentified resource bodies: %s", async (body) => {
  await tester
    .expect(
      `${models}
      @put op put(@body body: ${body}): Ok<Other>;
    `,
    )
    .toBeValid();
});

it.each([200, 201])("skips ambiguous %s body types in either order", async (status) => {
  for (const variants of ["First | Second", "Second | First"]) {
    await tester
      .expect(
        `${models}
      model First { @statusCode status: ${status}; @body body: Widget; }
      model Second { @statusCode status: ${status}; @body body: Other; }
      @put op put(@body body: Widget): ${variants};
    `,
      )
      .toBeValid();
  }
});

it.each([200, 201])("skips ambiguous %s body kinds in either order", async (status) => {
  for (const variants of ["Json | Multi", "Multi | Json"]) {
    await tester
      .expect(
        `${models}
      model Parts { value: HttpPart<string>; }
      model Json { @statusCode status: ${status}; @body body: Parts; }
      model Multi {
        @statusCode status: ${status};
        @header contentType: "multipart/form-data";
        @multipartBody body: Parts;
      }
      @put op put(@body body: Widget): ${variants};
    `,
      )
      .toBeValid();
  }
});

it("still compares known participants when another status is ambiguous", async () => {
  await tester
    .expect(
      `${models}
    model Alternative { @statusCode status: 200; @body body: Other; }
    @put op put(@body body: Widget): Ok<Widget> | Alternative | Created<Other>;
  `,
    )
    .toEmitDiagnostics([diagnostic("request: Widget; 201 response: Other")]);
});

it("accepts shared content variants and ignores bodyless variants regardless of order", async () => {
  for (const variants of ["Json | Xml | Empty", "Empty | Xml | Json"]) {
    await tester
      .expect(
        `${models}
      model Json { @statusCode status: 200; @header contentType: "application/json"; @body body: Widget; }
      model Xml { @statusCode status: 200; @header contentType: "application/xml"; @body body: Widget; }
      model Empty { @statusCode status: 200; }
      @put op put(@body body: Widget): ${variants} | Created<Widget>;
    `,
      )
      .toBeValid();
  }
});

it.each(["Record<string>", "Array<string>"])("skips inherited indexers from %s", async (base) => {
  await tester
    .expect(
      `${models}
    model Indexed extends ${base} {}
    model Derived extends Indexed {}
    @put op put(@body body: Derived): Ok<Widget>;
  `,
    )
    .toBeValid();
});

it("compares identifiable responses when the request is an inherited dictionary", async () => {
  await tester
    .expect(
      `${models}
    model Dictionary extends Record<string> {}
    @put op put(@body body: Dictionary): Ok<Widget> | Created<Other>;
  `,
    )
    .toEmitDiagnostics([diagnostic("200 response: Widget; 201 response: Other")]);
});

it("skips file bodies", async () => {
  await tester
    .expect(
      `${models}
    @put op put(@body body: Http.File): Ok<Widget>;
  `,
    )
    .toBeValid();
});

it("skips multipart resource comparison", async () => {
  await tester
    .expect(
      `${models}
    model Parts { value: HttpPart<string>; }
    @put op put(@header contentType: "multipart/form-data", @multipartBody body: Parts): Ok<Widget>;
  `,
    )
    .toBeValid();
});

it("accepts standard ARM create-or-replace templates", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace @service namespace Microsoft.Test;
    model Widget is TrackedResource<{ value?: string }> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      createOrReplace is ArmResourceCreateOrReplaceSync<Widget>;
    }
  `,
    )
    .toBeValid();
});

it.each(["TrackedResource", "ProxyResource"])(
  "accepts %s with both success statuses",
  async (base) => {
    await tester
      .expect(
        `
    @armProviderNamespace @service namespace Microsoft.Test;
    model Widget is ${base}<{}> { ...ResourceNameParameter<Widget>; }
    @armResourceOperations interface Widgets {
      createOrReplace is ArmResourceCreateOrReplaceSync<Widget>;
    }
  `,
      )
      .toBeValid();
  },
);

it("keeps canonical-resource validation in the existing lifecycle rule", async () => {
  const { armResourceOperationsRule } =
    await import("../../src/rules/arm-resource-operation-response.js");
  const source = `${models}
    @armProviderNamespace namespace Operations {
      @armResourceOperations interface Widgets {
        @put @armResourceCreateOrUpdate(Resources.Widget)
        put(...ResourceInstanceParameters<Resources.Widget>, @bodyRoot body: Other):
          ArmResponse<Other> | ErrorResponse;
      }
    }
  `;
  await tester.expect(source).toBeValid();
  await createLinterRuleTester(
    await Tester.createInstance(),
    armResourceOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  )
    .expect(source)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    });
});

it("checks unannotated and nested namespaces", async () => {
  await tester
    .expect(
      `${models}
    namespace Custom {
      @put op put(@bodyRoot body: Widget): Ok<Other>;
    }
  `,
    )
    .toEmitDiagnostics([diagnostic("request: Widget; 200 response: Other")]);
});

it("ignores Azure library declarations", async () => {
  await tester
    .expect(
      `${models}
    namespace Azure.Core { @put op core(@body body: Widget): Ok<Other>; }
    namespace Azure.ResourceManager { @put op arm(@body body: Widget): Ok<Other>; }
  `,
    )
    .toBeValid();
});

it("skips unused templates and checks each concrete operation alias", async () => {
  await tester
    .expect(
      `${models}
    @put op Template<T>(@body body: Widget): Ok<T>;
    interface Unused<T> { @put put(@body body: Widget): Ok<Other>; }
    @route("/first") op first is Template<Other>;
    @route("/second") op second is Template<Other>;
    @route("/valid") op valid is Template<Widget>;
  `,
    )
    .toEmitDiagnostics([
      diagnostic("request: Widget; 200 response: Other", "first"),
      diagnostic("request: Widget; 200 response: Other", "second"),
    ]);
});

it("checks inherited concrete interface operations", async () => {
  await tester
    .expect(
      `${models}
    interface Template<T> { @put put(@body body: Widget): Ok<T>; }
    @route("/same") interface Same extends Template<Widget> {}
    @route("/different") interface Different extends Template<Other> {}
  `,
    )
    .toEmitDiagnostics([diagnostic("request: Widget; 200 response: Other")]);
});

it("reports once on an authored versioned operation", async () => {
  await tester
    .expect(
      `
    ${models}
    @service @versioned(Versions) namespace Test {
      enum Versions { v1, v2 }
      @put op put(@bodyRoot body: Widget): ArmResponse<Other>;
    }
  `,
    )
    .toEmitDiagnostics([diagnostic("request: Widget; 200 response: Other")]);
});

it("supports the fully qualified suppression directive", async () => {
  const options = { compilerOptions: { linterRuleSet: { enable: { [code]: true } } } };
  const operation = "@put op put(@body body: Widget): Ok<Other>;";
  expectDiagnostics(await Tester.diagnose(`${models} ${operation}`, options), [
    diagnostic("request: Widget; 200 response: Other"),
  ]);
  await Tester.compile(
    `${models}
    #suppress "${code}" "Existing API uses separate resource models."
    ${operation}
  `,
    options,
  );
});

it("ignores imported library operations but checks their project aliases", async () => {
  const libraryTester = createLinterRuleTester(
    await Tester.import("put-library").createInstance(),
    putResourceSchemaConsistencyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
  await libraryTester
    .expect({
      "node_modules/put-library/package.json": JSON.stringify({
        name: "put-library",
        version: "1.0.0",
        tspMain: "main.tsp",
      }),
      "node_modules/put-library/main.tsp": `
      import "@typespec/http";
      namespace PutLibrary;
      @TypeSpec.Http.put op missing(): void;
    `,
      "main.tsp": `
      op put is PutLibrary.missing;
    `,
    })
    .toEmitDiagnostics([missingRequest]);
});

const examples = [
  ...readFileSync(
    new URL("../../src/rules/put-resource-schema-consistency.md", import.meta.url),
    "utf8",
  ).matchAll(/```typespec\r?\n([\s\S]*?)```/g),
].map((match) => match[1]);

it("compiles the documented standard template", async () => {
  await tester.expect(examples[0]).toBeValid();
});

it("diagnoses the documented request override", async () => {
  await tester.expect(examples[1]).toEmitDiagnostics([
    {
      code,
      message:
        "PUT bodies must reuse the same resource model. Found request: Microsoft.Example.WidgetInput; 200 response: Microsoft.Example.Widget; 201 response: Microsoft.Example.Widget.",
    },
  ]);
});

it("honors the documented suppression through the compiler pipeline", async () => {
  await Tester.compile(examples[2], {
    compilerOptions: { linterRuleSet: { enable: { [code]: true } } },
  });
});
