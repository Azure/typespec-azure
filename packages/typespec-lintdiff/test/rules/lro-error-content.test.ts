import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { lroErrorContentRule } from "../../src/rules/lro-error-content.js";

vi.mock("@azure-tools/typespec-autorest", () => {
  throw new Error("Native lint must not load the AutoRest emitter.");
});
vi.mock("@azure-tools/typespec-client-generator-core", () => {
  throw new Error("ARM lint must not load TCGC.");
});

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    // ARM's own TypeSpec library imports OpenAPI; the rule and test snippets do not use it.
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
}).importLibraries();

const header = `
  using TypeSpec.Http;
  using Azure.ResourceManager;
  @armProviderNamespace @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;
  @route("/status")
  op poll is Azure.Core.Foundations.GetOperationStatus;
  model Accepted {
    @statusCode statusCode: 202;
    @header("Operation-Location") operationLocation: string;
  }
  model Failure<T> { @statusCode statusCode: 400; @body body: T; }
  @Azure.Core.pollingOperation(poll)
  @post
  op Lro<T>(): Accepted | Failure<T>;
`;
const diagnostic = {
  code: "tsp-lintdiff-local-linter/lro-error-content",
  message: lroErrorContentRule.messages.default,
};

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    lroErrorContentRule,
    "tsp-lintdiff-local-linter",
  );
}

describe("lro-error-content", () => {
  it("does not import TCGC, OpenAPI, or unsafe compiler APIs", async () => {
    const source = await readFile(
      new URL("../../src/rules/lro-error-content.ts", import.meta.url),
      "utf8",
    );
    expect(source).not.toMatch(/typespec-client-generator-core|@typespec\/openapi|unsafe_/);
  });

  it("accepts native common-type errors, model-is copies, and nullable standard errors", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      model Copy is CommonTypes.ErrorResponse;
      @route("/standard") op standard is Lro<CommonTypes.ErrorResponse>;
      @route("/copy") op copy is Lro<Copy>;
      @route("/nullable") op nullable is Lro<CommonTypes.ErrorResponse | null>;
    `,
      )
      .toBeValid();
  });

  it("uses native ARM external references and rejects v1 and the wrong definition", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @Legacy.externalTypeRef("../../common-types/resource-management/v10/types.json#/definitions/ErrorResponse")
      model Standard { code?: string; }
      @Legacy.externalTypeRef("../../common-types/resource-management/v1/types.json#/definitions/ErrorResponse")
      model Old { code?: string; }
      @Legacy.externalTypeRef("../../common-types/resource-management/v5/types.json#/definitions/ErrorDetail")
      model Wrong { code?: string; }
      @route("/standard") op standard is Lro<Standard>;
      @route("/old") op old is Lro<Old>;
      @route("/wrong") op wrong is Lro<Wrong>;
    `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it.each([
    ["named model", "model Custom { code: string; }", "Custom"],
    ["derived model", "model Custom extends CommonTypes.ErrorResponse {}", "Custom"],
    ["spread model", "model Custom { ...CommonTypes.ErrorResponse; extra: string; }", "Custom"],
    ["inline model", "", "{ code: string; }"],
    ["scalar", "scalar Custom extends string;", "Custom"],
    ["enum", "enum Custom { bad }", "Custom"],
    ["union", 'union Custom { "bad", "worse" }', "Custom"],
    ["array", "", "string[]"],
    ["record", "", "Record<string>"],
    ["generic", "model Custom<T> { value: T; }", "Custom<string>"],
    ["primitive", "", "string"],
    ["literal", "", '"bad"'],
    ["tuple", "", "[string, int32]"],
    ["unknown", "", "unknown"],
    ["bytes", "", "bytes"],
    ["nullable custom error", "model Custom { code: string; }", "Custom | null"],
  ])("rejects a custom %s error payload", async (_name, declaration, payload) => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      ${declaration}
      @route("/run") op run is Lro<${payload}>;
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports once across default, 4xx, and 5xx error responses", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @error model Custom { code: string; }
      @Azure.Core.pollingOperation(poll) @route("/run") @post
      op run(): Accepted | Custom |
        { @statusCode statusCode: 400; @body body: string; } |
        { @statusCode statusCode: 500; @body body: string; };
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores success responses, absent error bodies, and synchronous operations", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @Azure.Core.pollingOperation(poll) @route("/no-body") @post
      op noBody(): Accepted | { @statusCode statusCode: 400; };
      @Azure.Core.pollingOperation(poll) @route("/success") @post
      op success(): Accepted | { @statusCode statusCode: 200; @body body: string; };
      @route("/sync") @post op sync(): Accepted | Failure<string>;
    `,
      )
      .toBeValid();
  });

  it("rejects binary and multipart error payloads", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      @Azure.Core.pollingOperation(poll) @route("/binary") @post
      op binary(): Accepted |
        { @statusCode statusCode: 500; @header contentType: "application/octet-stream"; @body body: bytes; };
      @Azure.Core.pollingOperation(poll) @route("/multipart") @post
      op multipart(): Accepted |
        { @statusCode statusCode: 500; @multipartBody body: { part: HttpPart<string>; }; };
    `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it("includes nested namespaces but not GET polling operations", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
      namespace Nested { @route("/run") op run is Lro<string>; }
      @Azure.Core.pollingOperation(poll) @route("/get") @get
      op read(): Accepted | Failure<string>;
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores unrelated data-plane services and unused templates", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header.replace("namespace Arm;", "namespace Arm {")}
      }
      @service namespace Other {
        @Azure.Core.pollingOperation(Arm.poll) @route("/run") @post
        op run(): Arm.Accepted | Arm.Failure<string>;
      }
    `,
      )
      .toBeValid();
  });

  it("reports a nested service operation only once", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
        @service namespace Child {
          @route("/child") op run is Lro<string>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("reports a shared operation declaration once across template instantiations", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header}
        interface Actions<T> { @route("/run") op run is Lro<T>; }
        @route("/one") interface One extends Actions<string> {}
        @route("/two") interface Two extends Actions<int32> {}
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("checks authored return types without reconstructing historical versions", async () => {
    const rule = await tester();
    await rule
      .expect(
        `${header.replace("@armProviderNamespace @service", "@armProviderNamespace @service @TypeSpec.Versioning.versioned(Versions)")}
      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }
      @TypeSpec.Versioning.returnTypeChangedFrom(Versions.v2, Accepted | Failure<string>)
      @route("/changed") op changed is Lro<CommonTypes.ErrorResponse>;
      @TypeSpec.Versioning.removed(Versions.v2)
      @route("/removed") op removed is Lro<string>;
    `,
      )
      .toEmitDiagnostics([diagnostic]);
  });
});
