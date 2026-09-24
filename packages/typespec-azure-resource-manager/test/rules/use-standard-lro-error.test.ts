import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { createSourceFile, isImportDeclaration, isStringLiteral, ScriptTarget } from "typescript";
import { beforeEach, describe, expect, it } from "vitest";
import { useStandardLroErrorRule } from "../../src/rules/use-standard-lro-error.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useStandardLroErrorRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = `
  @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;

  @route("/status")
  op poll is Azure.Core.Foundations.GetOperationStatus;

  model Accepted {
    @statusCode statusCode: 202;
    @header("Operation-Location") operationLocation: string;
  }

  model Failure<T> {
    @statusCode statusCode: 400;
    @body body: T;
  }

  @Azure.Core.pollingOperation(poll)
  @post
  op Lro<T>(): Accepted | Failure<T>;
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/use-standard-lro-error",
  message: useStandardLroErrorRule.messages.default,
};

describe("use-standard-lro-error", () => {
  it("does not import TCGC, OpenAPI, or experimental compiler APIs", async () => {
    const source = await readFile(
      new URL("../../src/rules/use-standard-lro-error.ts", import.meta.url),
      "utf8",
    );
    const imports = createSourceFile("use-standard-lro-error.ts", source, ScriptTarget.Latest)
      .statements.filter(isImportDeclaration)
      .flatMap((statement) =>
        isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : [],
      );

    expect(imports).not.toContain("@azure-tools/typespec-client-generator-core");
    expect(imports).not.toContain("@typespec/openapi");
    expect(imports).not.toContain("@typespec/compiler/experimental");
  });

  it("accepts common-type errors, model-is copies, and nullable standard errors", async () => {
    await tester
      .expect(
        `${header}
        model Copy is CommonTypes.ErrorResponse;
        model CopyAgain is Copy;
        alias StandardError = CommonTypes.ErrorResponse;
        @route("/standard") op standard is Lro<CommonTypes.ErrorResponse>;
        @route("/copy") op copy is Lro<Copy>;
        @route("/copy-again") op copyAgain is Lro<CopyAgain>;
        @route("/alias") op aliasError is Lro<StandardError>;
        @route("/nullable") op nullable is Lro<CommonTypes.ErrorResponse | null>;
        @route("/nullable-copy") op nullableCopy is Lro<CopyAgain | null>;
      `,
      )
      .toBeValid();
  });

  it("accepts the standard error from ARM templates", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Microsoft.Contoso;

        model Widget is ProxyResource<{}> {
          ...ResourceNameParameter<Widget>;
        }
        @armResourceOperations
        interface Widgets {
          action is ArmResourceActionAsync<Widget, void, void>;
        }
      `,
      )
      .toBeValid();
  });

  it.each([
    "{ ...CommonTypes.ErrorResponse; @statusCode status: 400; @header requestId: string; }",
    "SpreadError",
    "CopiedError",
  ])("accepts a standard error payload wrapped with HTTP metadata: %s", async (response) => {
    await tester
      .expect(
        `${header}
        model SpreadError {
          ...CommonTypes.ErrorResponse;
          @statusCode status: 400;
          @header requestId: string;
        }
        model CopiedError is CommonTypes.ErrorResponse {
          @statusCode status: 400;
          @header requestId: string;
        }
        @Azure.Core.pollingOperation(poll) @route("/wrapped") @post
        op wrapped(): Accepted | ${response};
      `,
      )
      .toBeValid();
  });

  it.each(["Copy", "CopyAgain", "CopyAgain | null", "{ ...CopyAgain; }"])(
    "rejects a model-is copy with an added payload field: %s",
    async (payload) => {
      await tester
        .expect(
          `${header}
        model Copy is CommonTypes.ErrorResponse { extra: string; }
        model CopyAgain is Copy;
        @route("/modified") op modified is Lro<${payload}>;
      `,
        )
        .toEmitDiagnostics([diagnostic]);
    },
  );

  it("rejects a model-is copy with an added indexer", async () => {
    await tester
      .expect(
        `${header}
        model Copy is CommonTypes.ErrorResponse { ...Record<string>; }
        @route("/modified") op modified is Lro<Copy>;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    "{ ...CommonTypes.ErrorResponse; extra: string; @statusCode status: 400; }",
    "CopiedError",
  ])("rejects wrapped standard errors with an added payload field: %s", async (response) => {
    await tester
      .expect(
        `${header}
        model CopiedError is CommonTypes.ErrorResponse {
          extra: string;
          @statusCode status: 400;
          @header requestId: string;
        }
        @Azure.Core.pollingOperation(poll) @route("/modified") @post
        op modified(): Accepted | ${response};
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("rejects a custom error supplied to an ARM template", async () => {
    await tester
      .expect(
        `
        @armProviderNamespace
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace Microsoft.Contoso;

        model Widget is ProxyResource<{}> {
          ...ResourceNameParameter<Widget>;
        }
        @error model CustomError { code: string; }

        @armResourceOperations
        interface Widgets {
          action is ArmResourceActionAsync<Widget, void, void, Error = CustomError>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it.each([
    "../../common-types/resource-management/v1/types.json#/definitions/ErrorResponse",
    "../../common-types/resource-management/v2/types.json#/definitions/ErrorResponse",
    "../../common-types/resource-management/v5/types.json#/definitions/ErrorResponse",
    "../../common-types/resource-management/v10/types.json#/definitions/ErrorResponse",
    "../../common-types/resource-management/v5/types.json#/definitions/ErrorDetail",
    "#/definitions/ErrorResponse",
  ])("does not accept a custom model based on the external reference %s", async (reference) => {
    await tester
      .expect(
        `${header}
        @Legacy.externalTypeRef("${reference}")
        model Custom { code?: string; }
        @route("/custom") op custom is Lro<Custom>;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("does not let an external reference override the standard TypeSpec model", async () => {
    await tester
      .expect(
        `${header}
        @Legacy.externalTypeRef("#/definitions/OtherError")
        model Copy is CommonTypes.ErrorResponse;
        @route("/copy") op copy is Lro<Copy>;
      `,
      )
      .toBeValid();
  });

  it.each(["v3", "v4", "v5", "v6"])(
    "accepts the standard TypeSpec model with common-types %s",
    async (version) => {
      await tester
        .expect(
          `${header.replace("Versions.v5", `Versions.${version}`)}
          @route("/standard") op standard is Lro<CommonTypes.ErrorResponse>;
        `,
        )
        .toBeValid();
    },
  );

  it("rejects a same-named model with the standard shape in a different namespace", async () => {
    await tester
      .expect(
        `${header}
        model ErrorResponse { error?: CommonTypes.ErrorDetail; }
        @route("/custom") op custom is Lro<ErrorResponse>;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("rejects custom model reference shapes", async () => {
    await tester
      .expect(
        `${header}
        model Named { code: string; }
        model Derived extends CommonTypes.ErrorResponse {}
        model Spread { ...CommonTypes.ErrorResponse; extra: string; }
        @route("/named") op named is Lro<Named>;
        @route("/derived") op derived is Lro<Derived>;
        @route("/spread") op spread is Lro<Spread>;
        @route("/effective") op effective is Lro<{ ...Named; }>;
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
  });

  it("rejects named scalar, enum, union, collection, generic, and nullable custom errors", async () => {
    await tester
      .expect(
        `${header}
        scalar CustomScalar extends string;
        enum CustomEnum { bad }
        union CustomUnion { bad: "bad", worse: "worse" }
        model NamedArray is string[];
        model NamedRecord is Record<string>;
        model Generic<T> { value: T; }
        @friendlyName("FriendlyError") model Friendly<T> { value: T; }
        model Custom { code: string; }
        @route("/scalar") op scalarError is Lro<CustomScalar>;
        @route("/enum") op enumError is Lro<CustomEnum>;
        @route("/union") op unionError is Lro<CustomUnion>;
        @route("/array") op arrayError is Lro<NamedArray>;
        @route("/record") op recordError is Lro<NamedRecord>;
        @route("/generic") op genericError is Lro<Generic<string>>;
        @route("/friendly") op friendlyError is Lro<Friendly<string>>;
        @route("/nullable") op nullableError is Lro<Custom | null>;
      `,
      )
      .toEmitDiagnostics([
        diagnostic,
        diagnostic,
        diagnostic,
        diagnostic,
        diagnostic,
        diagnostic,
        diagnostic,
        diagnostic,
      ]);
  });

  it("rejects inline, primitive, literal, tuple, unknown, and bytes error payloads", async () => {
    await tester
      .expect(
        `${header}
        model Generic<T> { value: T; }
        enum Codes { bad }
        @route("/model") op modelBody is Lro<{ code: string; }>;
        @route("/array") op arrayBody is Lro<string[]>;
        @route("/record") op recordBody is Lro<Record<string>>;
        @route("/generic") op genericBody is Lro<Generic<string>>;
        @route("/string") op stringBody is Lro<string>;
        @route("/literal") op literalBody is Lro<"bad">;
        @route("/number") op numberBody is Lro<42>;
        @route("/boolean") op booleanBody is Lro<false>;
        @route("/template") op templateBody is Lro<"error-${"bad"}">;
        @route("/enum-member") op enumMemberBody is Lro<Codes.bad>;
        @route("/tuple") op tupleBody is Lro<[string, int32]>;
        @route("/union") op unionBody is Lro<"bad" | "worse">;
        @route("/unknown") op unknownBody is Lro<unknown>;
        @route("/bytes") op bytesBody is Lro<bytes>;
      `,
      )
      .toEmitDiagnostics(Array.from({ length: 14 }, () => diagnostic));
  });

  it("rejects binary and multipart error payloads", async () => {
    await tester
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

  it("checks default, explicit, and ranged error status codes", async () => {
    await tester
      .expect(
        `${header}
        @error model DefaultError { code: string; }
        @Azure.Core.pollingOperation(poll) @route("/default") @post
        op defaultError(): Accepted | DefaultError;
        @Azure.Core.pollingOperation(poll) @route("/explicit") @post
        op explicitError(): Accepted | { @statusCode statusCode: 503; @body body: string; };
        @Azure.Core.pollingOperation(poll) @route("/range") @post
        op rangedError(): Accepted |
          { @statusCode @minValue(400) @maxValue(499) statusCode: int32; @body body: string; };
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
  });

  it("reports once across multiple error responses", async () => {
    await tester
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

  it("rejects a long-running operation without an error response", async () => {
    await tester
      .expect(
        `${header}
        @Azure.Core.pollingOperation(poll) @route("/no-error") @post
        op noError(): Accepted;
      `,
      )
      .toEmitDiagnostics([
        {
          ...diagnostic,
          message: useStandardLroErrorRule.messages.missingErrorResponse,
        },
      ]);
  });

  it("ignores success responses, absent error bodies, synchronous operations, and GET operations", async () => {
    await tester
      .expect(
        `${header}
        @Azure.Core.pollingOperation(poll) @route("/no-body") @post
        op noBody(): Accepted | { @statusCode statusCode: 400; };
        @Azure.Core.pollingOperation(poll) @route("/success") @post
        op success(): Accepted | { @statusCode statusCode: 200; @body body: string; } |
          Failure<CommonTypes.ErrorResponse>;
        @route("/sync") @post op sync(): Accepted | Failure<string>;
        @route("/sync-no-error") @post op syncNoError(): Accepted;
        @Azure.Core.pollingOperation(poll) @route("/get") @get
        op getOperation(): Accepted | Failure<string>;
        @Azure.Core.pollingOperation(poll) @route("/get-no-error") @get
        op getNoError(): Accepted;
      `,
      )
      .toBeValid();
  });

  it("checks ordinary and nested namespaces without an ARM provider decorator", async () => {
    await tester
      .expect(
        `${header}
        @route("/ordinary") op ordinary is Lro<string>;
        namespace Nested {
          @route("/nested") op nested is Lro<string>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it("checks operations without a service decorator", async () => {
    await tester
      .expect(
        `${header.replace("@service", "")}
        @route("/custom") op custom is Lro<string>;
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("does not diagnose imported Azure.Core or Azure.ResourceManager library operations", async () => {
    await tester.expect("").toBeValid();
  });

  it("reports a nested service operation without an ARM provider decorator", async () => {
    await tester
      .expect(
        `${header}
        @service
        namespace Child {
          @Azure.Core.pollingOperation(Arm.poll) @route("/child") @post
          op run(): Arm.Accepted | Arm.Failure<string>;
        }
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });

  it("ignores unused operation templates", async () => {
    await tester
      .expect(
        `${header}
        @Azure.Core.pollingOperation(poll) @post
        op Unused<T>(): Accepted | Failure<T>;
        @Azure.Core.pollingOperation(poll) @post
        op UnusedInvalid<T>(): Accepted | Failure<string>;
        interface UnusedActions<T> {
          @Azure.Core.pollingOperation(poll) @post
          op run(): Accepted | Failure<string>;
        }
        @route("/valid") op valid is Lro<CommonTypes.ErrorResponse>;
      `,
      )
      .toBeValid();
  });

  it("reports a shared operation declaration once across template instantiations", async () => {
    await tester
      .expect(
        `${header}
        interface Actions<T> { @route("/run") op run is Lro<T>; }
        @route("/one") interface One extends Actions<string> {}
        @route("/two") interface Two extends Actions<int32> {}
      `,
      )
      .toEmitDiagnostics([diagnostic]);
  });
});
