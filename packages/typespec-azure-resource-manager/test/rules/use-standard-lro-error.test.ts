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
        @route("/standard") op standard is Lro<CommonTypes.ErrorResponse>;
        @route("/copy") op copy is Lro<Copy>;
        @route("/nullable") op nullable is Lro<CommonTypes.ErrorResponse | null>;
      `,
      )
      .toBeValid();
  });

  it("uses native ARM external references and rejects v1, local, and wrong definitions", async () => {
    await tester
      .expect(
        `${header}
        @Legacy.externalTypeRef("../../common-types/resource-management/v2/types.json#/definitions/ErrorResponse")
        model V2 { code?: string; }
        @Legacy.externalTypeRef("../../common-types/resource-management/v10/types.json#/definitions/ErrorResponse")
        model V10 { code?: string; }
        @Legacy.externalTypeRef("../../common-types/resource-management/v1/types.json#/definitions/ErrorResponse")
        model V1 { code?: string; }
        @Legacy.externalTypeRef("../../common-types/resource-management/v5/types.json#/definitions/ErrorDetail")
        model Wrong { code?: string; }
        @Legacy.externalTypeRef("#/definitions/ErrorResponse")
        model Local { code?: string; }
        @route("/v2") op v2 is Lro<V2>;
        @route("/v10") op v10 is Lro<V10>;
        @route("/v1") op v1 is Lro<V1>;
        @route("/wrong") op wrong is Lro<Wrong>;
        @route("/local") op localReference is Lro<Local>;
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
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

  it("ignores success responses, absent error bodies, synchronous operations, and GET operations", async () => {
    await tester
      .expect(
        `${header}
        @Azure.Core.pollingOperation(poll) @route("/no-body") @post
        op noBody(): Accepted | { @statusCode statusCode: 400; };
        @Azure.Core.pollingOperation(poll) @route("/success") @post
        op success(): Accepted | { @statusCode statusCode: 200; @body body: string; };
        @route("/sync") @post op sync(): Accepted | Failure<string>;
        @Azure.Core.pollingOperation(poll) @route("/get") @get
        op getOperation(): Accepted | Failure<string>;
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

  it("checks authored return types without reconstructing historical versions", async () => {
    await tester
      .expect(
        `${header.replace("@service", "@service @TypeSpec.Versioning.versioned(Versions)")}
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
