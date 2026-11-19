import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRequestBodyRule } from "../../src/rules/no-request-body.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, noRequestBodyRule, "@azure-tools/typespec-azure-core");
});

describe.each(["get", "delete"])("%s request bodies", (verb) => {
  const diagnostic = {
    code: "@azure-tools/typespec-azure-core/no-request-body",
    severity: "warning",
    message: `${verb.toUpperCase()} operations must not have a request body. Remove the request body.`,
  } as const;

  it.each([
    ["explicit model", "@body body: { value: string }"],
    ["optional", "@body body?: { value: string }"],
    ["empty model", "@body body: {}"],
    ["primitive", "@body body: string"],
    ["body root", "@bodyRoot body: { value: string }"],
    ["implicit", "value: string"],
  ])("reports an %s body", async (_, parameters) => {
    await tester
      .expect(
        `
        /*target*/@${verb}
        op execute(${parameters}): string;
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

        model RequestParameters extends BaseParameters {
          second: string;
        }

        /*target*/@${verb}
        op execute(...RequestParameters): string;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it.each([
    ["optional header-options wrapper", "params?: RequestOptions"],
    ["void body and header-options wrapper", "body: void, params?: RequestOptions"],
  ])("reports an %s outside the declared service", async (_, parameters) => {
    await tester
      .expect(
        `
        @service
        namespace Microsoft.Example {
          @${verb}
          op execute(@header traceId?: string): string;
        }

        namespace Customizations {
          model RequestOptions {
            @header traceId?: string;
          }

          /*target*/@${verb}
          op execute(${parameters}): string;
        }
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports a multipart body", async () => {
    await tester
      .expect(
        `
        /*target*/@${verb}
        op execute(
          @header contentType: "multipart/form-data",
          @multipartBody body: { value: HttpPart<string> },
        ): string;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports a concrete operation derived from a generic template only once", async () => {
    await tester
      .expect(
        `
        @${verb}
        op Template<T>(@body body: T): string;

        /*target*/op execute is Template<{ value: string }>;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("reports RPC-derived operations", async () => {
    await tester
      .expect(
        `
        /*target*/@route("/")
        @${verb}
        op execute is RpcOperation<{ @body body: { value: string } }, {}>;
      `,
      )
      .toEmitDiagnostics((result) => ({ ...diagnostic, pos: result.pos.target.pos }));
  });

  it("allows spread header-only request options", async () => {
    await tester
      .expect(
        `
        model RequestOptions {
          @header traceId?: string;
        }

        @${verb}
        op execute(...RequestOptions): string;
      `,
      )
      .toBeValid();
  });

  it("allows only HTTP metadata parameters", async () => {
    await tester
      .expect(
        `
        @route("/widgets/{name}")
        @${verb}
        op execute(
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
        @${verb}
        op execute(
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
        @${verb}
        op execute(@body body: void): string;
      `,
      )
      .toBeValid();
  });
});

it.each(["post", "put", "patch", "head"])("does not restrict %s request bodies", async (verb) => {
  await tester
    .expect(
      `
        @${verb}
        op submit(@body body: { value: string }): void;
      `,
    )
    .toBeValid();
});

it("uses the inferred HTTP verb rather than the operation name", async () => {
  await tester
    .expect(
      `
      @route("/get")
      op getWidget(@body body: { value: string }): string;
      @route("/delete")
      op deleteWidget(@body body: { value: string }): string;
      op readWidget(): { value: string };
    `,
    )
    .toBeValid();
});
