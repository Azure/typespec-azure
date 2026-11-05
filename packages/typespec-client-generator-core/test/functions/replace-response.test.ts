import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTesterWithService,
} from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("replaces the generated method response with void without changing HTTP responses", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @error
    model Error {
      code: string;
    }

    model Widget {
      name: string;
    }

    @post op create(): Widget | Error;

    alias CustomizedCreate = replaceResponseWithVoid(TestService.create);
    #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
    @@override(TestService.create, CustomizedCreate);
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.response.type, undefined);
  strictEqual(method.operation.responses.length, 1);
  const response = method.operation.responses[0];
  ok(response.type);
  strictEqual(response.type.kind, "model");
  strictEqual(response.type.name, "Widget");
  strictEqual(method.operation.exceptions.length, 1);
});

it.each(["Metadata", "bytes"])("replaces a %s response with raw bytes", async (responseType) => {
  const { program } = await SimpleTesterWithService.compile(`
    model Metadata {
      name: string;
    }

    @get op download(): {
      @header contentType: "application/json";
      @body body: ${responseType};
    };

    #suppress "experimental-feature" "testing replaceResponseWithBytes"
    #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
    @@override(TestService.download, replaceResponseWithBytes(TestService.download));
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  ok(method.response.type);
  strictEqual(method.response.type.kind, "bytes");
  strictEqual(method.response.type.encode, "bytes");
  const httpResponse = method.operation.responses[0];
  strictEqual(httpResponse.defaultContentType, "application/json");
  ok(httpResponse.type);
  if (responseType === "bytes") {
    strictEqual(httpResponse.type.kind, "bytes");
    strictEqual(httpResponse.type.encode, "base64");
  } else {
    strictEqual(httpResponse.type.kind, "model");
    strictEqual(httpResponse.type.name, "Metadata");
  }
});

it("removes pageable behavior when overriding a list operation with bytes", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model BlobPage {
      @pageItems
      items: string[];
    }

    @get
    @list
    op listBlobs(): BlobPage;

    #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
    @@override(
      TestService.listBlobs,
      replaceResponseWithBytes(TestService.listBlobs),
      "rust"
    );
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-rust",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.kind, "basic");
  ok(method.response.type);
  strictEqual(method.response.type.kind, "bytes");
  strictEqual(method.response.type.encode, "bytes");
  strictEqual(method.operation.responses[0].type?.kind, "model");
});

it("composes response replacement with other operation transformations", async () => {
  const { program } = await SimpleBaseTester.compile(
    createClientCustomizationInput(
      `
        @service
        namespace TestService;

        model Widget {
          name: string;
        }

        op create(@query name?: string): Widget;
      `,
      `
        model CreateResult {
          id: string;
        }

        #suppress "experimental-feature" "testing replaceParameter"
        alias WithRequiredName = replaceParameter(TestService.create, "name", CreateResult.id);
        #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
        @@override(TestService.create, replaceResponseWithVoid(WithRequiredName));
      `,
    ),
  );

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.parameters[0].name, "id");
  strictEqual(method.parameters[0].optional, false);
  strictEqual(method.response.type, undefined);
  strictEqual(method.operation.responses[0].type?.name, "Widget");
});

describe("scoped response replacement", () => {
  const mainCode = `
    @service
    namespace TestService;

    model Widget {
      name: string;
    }

    op create(): Widget;
  `;

  const customizationCode = `
    #suppress "experimental-feature" "testing replaceResponseWithVoid"
    #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
    @@override(TestService.create, replaceResponseWithVoid(TestService.create), "python");
  `;

  it("applies the response replacement in the selected scope", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = getServiceMethodOfClient(context.sdkPackage);

    strictEqual(method.response.type, undefined);
  });

  it("does not apply the response replacement outside the selected scope", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const method = getServiceMethodOfClient(context.sdkPackage);

    strictEqual(method.response.type?.name, "Widget");
  });

  it.each(["go", "python"])("respects the scope of raw bytes replacement for %s", async (scope) => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(
        mainCode,
        `
          #suppress "@azure-tools/typespec-client-generator-core/override-response-replacement" "intentional response replacement"
          @@override(TestService.create, replaceResponseWithBytes(TestService.create), "go");
        `,
      ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: `@azure-tools/typespec-${scope}`,
    });
    const method = getServiceMethodOfClient(context.sdkPackage);

    ok(method.response.type);
    if (scope === "go") {
      strictEqual(method.response.type.kind, "bytes");
      strictEqual(method.response.type.encode, "bytes");
    } else {
      strictEqual(method.response.type.kind, "model");
      strictEqual(method.response.type.name, "Widget");
    }
    strictEqual(method.operation.responses[0].type?.kind, "model");
  });
});
