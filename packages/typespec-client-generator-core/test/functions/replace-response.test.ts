import { ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createClientCustomizationInput,
  createSdkContextForTester,
  SimpleBaseTester,
  SimpleTesterWithService,
} from "../tester.js";
import { getServiceMethodOfClient } from "../utils.js";

it("replaces the generated method response without changing HTTP responses", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    @error
    model Error {
      code: string;
    }

    model Widget {
      name: string;
    }

    @post op create(): Widget | Error;

    alias CustomizedCreate = replaceResponse(TestService.create, void);
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

it("uses a different response type supplied by @override", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model Widget {
      name: string;
    }

    model DeleteResult {
      deleted: boolean;
    }

    @post op create(): Widget;

    op customizedCreate(): DeleteResult;
    @@override(TestService.create, TestService.customizedCreate);
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  ok(method.response.type);
  strictEqual(method.response.type.kind, "model");
  strictEqual(method.response.type.name, "DeleteResult");
  ok(method.operation.responses[0].type);
  strictEqual(method.operation.responses[0].type.name, "Widget");
});

it("replaces a response with bytes", async () => {
  const { program } = await SimpleTesterWithService.compile(`
    model Metadata {
      name: string;
    }

    @get op download(): Metadata;

    #suppress "experimental-feature" "testing replaceResponse"
    @@override(TestService.download, replaceResponse(TestService.download, bytes));
  `);

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  ok(method.response.type);
  strictEqual(method.response.type.kind, "bytes");
  strictEqual(method.response.type.encode, "base64");
  strictEqual(method.operation.responses[0].type?.kind, "model");
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

    @route("/bytes")
    op listBlobsAsBytes(): bytes;
    @@override(TestService.listBlobs, TestService.listBlobsAsBytes, "rust");
  `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-rust",
  });
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.kind, "basic");
  ok(method.response.type);
  strictEqual(method.response.type.kind, "bytes");
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
        #suppress "experimental-feature" "testing replaceResponse"
        @@override(TestService.create, replaceResponse(WithRequiredName, CreateResult));
      `,
    ),
  );

  const context = await createSdkContextForTester(program);
  const method = getServiceMethodOfClient(context.sdkPackage);

  strictEqual(method.parameters[0].name, "id");
  strictEqual(method.parameters[0].optional, false);
  ok(method.response.type);
  strictEqual(method.response.type.name, "CreateResult");
  strictEqual(method.operation.responses[0].type?.name, "Widget");
});

describe("scoped response replacement", () => {
  const mainCode = `
    @service
    namespace TestService;

    model Widget {
      name: string;
    }

    model CreateResult {
      id: string;
    }

    op create(): Widget;
  `;

  const customizationCode = `
    model CreateResult {
      id: string;
    }

    #suppress "experimental-feature" "testing replaceResponse"
    @@override(TestService.create, replaceResponse(TestService.create, CreateResult), "python");
  `;

  it("applies the response replacement in the selected scope", async () => {
    const { program } = await SimpleBaseTester.compile(
      createClientCustomizationInput(mainCode, customizationCode),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = getServiceMethodOfClient(context.sdkPackage);

    strictEqual(method.response.type?.name, "CreateResult");
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
});
