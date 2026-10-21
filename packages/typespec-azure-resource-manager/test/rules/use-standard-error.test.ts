import { Tester } from "#test/tester.js";
import {
  createLinterRuleTester,
  type LinterRuleTester,
  type TesterInstance,
} from "@typespec/compiler/testing";

import { beforeEach, it } from "vitest";
import { useStandardErrorRule } from "../../src/rules/use-standard-error.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    useStandardErrorRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const header = `
  @service
  @armCommonTypesVersion(CommonTypes.Versions.v5)
  namespace Arm;

  model Accepted {
    @statusCode statusCode: 202;
    @header("Operation-Location") operationLocation: string;
  }

  model Failure<T> {
    @statusCode statusCode: 400;
    @body body: T;
  }

  @post
  op Request<T>(): Accepted | Failure<T>;
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/use-standard-error",
  message: useStandardErrorRule.messages.default,
};

it("accepts common-type errors, aliases, and nullable standard errors", async () => {
  await tester
    .expect(
      `${header}
        alias StandardError = CommonTypes.ErrorResponse;
        @route("/standard") op standard is Request<CommonTypes.ErrorResponse>;
        @route("/alias") op aliasError is Request<StandardError>;
        @route("/nullable") op nullable is Request<CommonTypes.ErrorResponse | null>;
        @route("/nullable-alias") op nullableAlias is Request<StandardError | null>;
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
])("rejects implicit standard error wrappers with HTTP metadata: %s", async (response) => {
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
        @route("/wrapped") @post
        op wrapped(): Accepted | ${response};
      `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("accepts direct and explicit standard error bodies with HTTP metadata", async () => {
  await tester
    .expect(
      `${header}
        model ExplicitError {
          @statusCode status: 400;
          @header requestId: string;
          @body body: CommonTypes.ErrorResponse;
        }
        @route("/direct") @post
        op direct(): Accepted | CommonTypes.ErrorResponse;
        @route("/explicit") @post
        op explicit(): Accepted | ExplicitError;
      `,
    )
    .toBeValid();
});

it.each(["Copy", "CopyAgain", "CopyAgain | null", "Spread", "{ ...CommonTypes.ErrorResponse; }"])(
  "rejects unchanged copies and spreads of the standard error: %s",
  async (payload) => {
    await tester
      .expect(
        `${header}
          model Copy is CommonTypes.ErrorResponse;
          model CopyAgain is Copy;
          model Spread { ...CommonTypes.ErrorResponse; }
          @route("/copy") op copy is Request<${payload}>;
        `,
      )
      .toEmitDiagnostics([diagnostic]);
  },
);

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

it("rejects a same-named model with the standard shape in a different namespace", async () => {
  await tester
    .expect(
      `${header}
        model ErrorResponse { error?: CommonTypes.ErrorDetail; }
        @route("/custom") op custom is Request<ErrorResponse>;
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
        @route("/named") op named is Request<Named>;
        @route("/derived") op derived is Request<Derived>;
        @route("/spread") op spread is Request<Spread>;
        @route("/effective") op effective is Request<{ ...Named; }>;
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
});

it("rejects inline models, non-model payloads, nullable custom errors, and ambiguous unions", async () => {
  await tester
    .expect(
      `${header}
        model Custom { code: string; }
        @route("/inline") op inlineError is Request<{ code: string; }>;
        @route("/string") op stringError is Request<string>;
        @route("/nullable") op nullableError is Request<Custom | null>;
        @route("/ambiguous") op ambiguousError is Request<CommonTypes.ErrorResponse | Custom | null>;
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
});

it("rejects binary and multipart error payloads", async () => {
  await tester
    .expect(
      `${header}
        @route("/binary") @post
        op binary(): Accepted |
          { @statusCode statusCode: 500; @header contentType: "application/octet-stream"; @body body: bytes; };
        @route("/multipart") @post
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
        @route("/default") @post
        op defaultError(): Accepted | DefaultError;
        @route("/explicit") @post
        op explicitError(): Accepted | { @statusCode statusCode: 503; @body body: string; };
        @route("/range") @post
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
        @route("/run") @post
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
        @route("/status")
        op poll is Azure.Core.Foundations.GetOperationStatus<ErrorResponse = CommonTypes.ErrorResponse>;
        @Azure.Core.pollingOperation(poll) @route("/no-error") @post
        op noError(): Accepted;
      `,
    )
    .toEmitDiagnostics([
      {
        ...diagnostic,
        message: useStandardErrorRule.messages.missingErrorResponse,
      },
    ]);
});

it("ignores success bodies when errors use the standard contract", async () => {
  await tester
    .expect(
      `${header}
        @route("/success") @post
        op success(): Accepted | { @statusCode statusCode: 200; @body body: string; } |
          Failure<CommonTypes.ErrorResponse>;
      `,
    )
    .toBeValid();
});
it.each(["get", "post"])("checks synchronous %s error responses", async (verb) => {
  await tester
    .expect(
      `${header}
        @route("/sync") @${verb} op sync(): Accepted | Failure<string>;
      `,
    )
    .toEmitDiagnostics(diagnostic);
});
it.each(["get", "post", "head"])(
  "requires an error response on synchronous %s operations",
  async (verb) => {
    await tester
      .expect(
        `${header}
        @route("/sync") @${verb} op sync(): Accepted;
      `,
      )
      .toEmitDiagnostics({
        ...diagnostic,
        message: useStandardErrorRule.messages.missingErrorResponse,
      });
  },
);
it.each(["get", "post"])("rejects bodyless %s errors", async (verb) => {
  await tester
    .expect(
      `${header}
      @route("/sync") @${verb} op sync(): Accepted | { @statusCode statusCode: 400; };
    `,
    )
    .toEmitDiagnostics(diagnostic);
});
it.each(["get", "post"])("accepts standard synchronous %s errors", async (verb) => {
  await tester
    .expect(
      `${header}
      @route("/sync") @${verb} op sync(): Accepted | Failure<CommonTypes.ErrorResponse>;
    `,
    )
    .toBeValid();
});

it("accepts a bodyless explicit HEAD error", async () => {
  await tester
    .expect(
      `${header}
        @head @route("/exists")
        op exists(): { @statusCode statusCode: 204; } |
          { @statusCode statusCode: 400; };
      `,
    )
    .toBeValid();
});

it("accepts a bodyless default HEAD error", async () => {
  await tester
    .expect(
      `${header}
        @error model HeadError { @header requestId?: string; }
        @head @route("/exists")
        op exists(): { @statusCode statusCode: 204; } | HeadError;
      `,
    )
    .toBeValid();
});

it("checks operations without a service decorator", async () => {
  await tester
    .expect(
      `${header.replace("@service", "")}
        @route("/custom") op custom is Request<string>;
      `,
    )
    .toEmitDiagnostics([diagnostic]);
});

it("reports a shared operation declaration once across template instantiations", async () => {
  await tester
    .expect(
      `${header}
        interface Actions<T> { @route("/run") op run is Request<T>; }
        @route("/one") interface One extends Actions<string> {}
        @route("/two") interface Two extends Actions<int32> {}
      `,
    )
    .toEmitDiagnostics([diagnostic]);
});
