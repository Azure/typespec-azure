import { Tester } from "#test/tester.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noGetRequestBodyRule } from "../../src/rules/no-get-request-body.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noGetRequestBodyRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-get-request-body",
  severity: "warning",
  message: "GET operations must not have a request body. Remove the request body.",
} as const;

describe("GET request bodies", () => {
  it.each([
    ["explicit model", "@body body: { value: string }"],
    ["optional", "@body body?: { value: string }"],
    ["empty model", "@body body: {}"],
    ["primitive", "@body body: string"],
    ["body root", "@bodyRoot body: { value: string }"],
    ["implicit", "value: string"],
  ])("reports a GET operation with an %s body", async (_, parameters) => {
    await tester
      .expect(
        `
        /*target*/@get
        op read(${parameters}): string;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports one diagnostic for an implicit body with multiple inherited properties", async () => {
    await tester
      .expect(
        `
        model BaseParameters {
          first: string;
        }

        model ReadParameters extends BaseParameters {
          second: string;
        }

        /*target*/@get
        op read(...ReadParameters): string;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it.each([
    ["optional header-options wrapper", "params?: SearchRequestOptions"],
    ["void body and header-options wrapper", "body: void, params?: SearchRequestOptions"],
  ])("reports a client-only GET with an %s outside the declared service", async (_, parameters) => {
    await tester
      .expect(
        `
        @service
        namespace Microsoft.Search {
          @get
          op read(@header("x-ms-client-request-id") clientRequestId?: string): string;
        }

        namespace Customizations {
          model SearchRequestOptions {
            @header("x-ms-client-request-id")
            clientRequestId?: string;
          }

          /*target*/@autoRoute
          @get
          @action("searchGetCustomization")
          op searchGetCustomization(${parameters}): string;
        }
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports a multipart GET body", async () => {
    await tester
      .expect(
        `
        /*target*/@get
        op read(
          @header contentType: "multipart/form-data",
          @multipartBody body: { value: HttpPart<string> },
        ): string;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports a concrete operation derived from a generic GET template only once", async () => {
    await tester
      .expect(
        `
        @get
        op ReadTemplate<T>(@body body: T): string;

        /*target*/op read is ReadTemplate<{ value: string }>;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports additional body parameters on a standard ARM read operation", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Contoso;

        model Widget is TrackedResource<{}> {
          ...ResourceNameParameter<Widget>;
        }

        model ReadParameters {
          @body filter: { name: string };
        }

        @armResourceOperations
        interface Widgets {
          /*target*/get is ArmResourceRead<Widget, Parameters = ReadParameters>;
        }
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });
});

describe("operations without a GET request body", () => {
  it("allows GET operations with spread header-only request options", async () => {
    await tester
      .expect(
        `
        namespace Customizations {
          model SearchRequestOptions {
            @header("x-ms-client-request-id")
            clientRequestId?: string;
          }

          @autoRoute
          @get
          @action("searchGetCustomization")
          op searchGetCustomization(...SearchRequestOptions): string;
        }
      `,
      )
      .toBeValid();
  });

  it("allows GET operations with only HTTP metadata parameters", async () => {
    await tester
      .expect(
        `
        @route("/widgets/{name}")
        @get
        op read(
          @path name: string,
          @query apiVersion: string,
          @header traceId?: string,
        ): { value: string };
      `,
      )
      .toBeValid();
  });

  it("allows ignored and non-request-visible properties", async () => {
    await tester
      .expect(
        `
        @get
        op read(
          @bodyIgnore options: { value: string },
          @visibility(Lifecycle.Create) value?: string,
        ): string;
      `,
      )
      .toBeValid();
  });

  it("allows a void body", async () => {
    await tester
      .expect(
        `
        @get
        op read(@body body: void): string;
      `,
      )
      .toBeValid();
  });

  it.each(["post", "put", "patch", "delete", "head"])(
    "does not restrict %s request bodies",
    async (verb) => {
      await tester
        .expect(
          `
          @${verb}
          op submit(@body body: { value: string }): void;
        `,
        )
        .toBeValid();
    },
  );

  it("uses the inferred HTTP verb rather than the operation name", async () => {
    await tester
      .expect(
        `
        op getWidget(@body body: { value: string }): string;
        op readWidget(): { value: string };
      `,
      )
      .toBeValid();
  });

  it("allows a standard ARM read operation without additional body parameters", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Contoso;

        model Widget is TrackedResource<{}> {
          ...ResourceNameParameter<Widget>;
        }

        @armResourceOperations
        interface Widgets {
          get is ArmResourceRead<Widget>;
        }
      `,
      )
      .toBeValid();
  });
});
