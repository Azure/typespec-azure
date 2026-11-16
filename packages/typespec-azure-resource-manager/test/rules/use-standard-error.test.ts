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

  @error model Failure<T> {
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

it.each(["SpreadError", "CopiedError"])(
  "rejects marked implicit standard error wrappers with HTTP metadata: %s",
  async (response) => {
    await tester
      .expect(
        `${header}
        @error model SpreadError {
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
  },
);

it("accepts direct and explicit standard error bodies with HTTP metadata", async () => {
  await tester
    .expect(
      `${header}
        @error model ExplicitError {
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
        @error model BinaryError {
          @statusCode statusCode: 500;
          @header contentType: "application/octet-stream";
          @body body: bytes;
        }
        @error model MultipartError {
          @statusCode statusCode: 500;
          @multipartBody body: { part: HttpPart<string>; };
        }
        @route("/binary") @post
        op binary(): Accepted | BinaryError;
        @route("/multipart") @post
        op multipart(): Accepted | MultipartError;
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic]);
});

it("checks marked errors with default, explicit, and ranged status codes", async () => {
  await tester
    .expect(
      `${header}
        @error model DefaultError { code: string; }
        @error model ExplicitError { @statusCode statusCode: 503; @body body: string; }
        @error model RangedError {
          @statusCode @minValue(400) @maxValue(499) statusCode: int32;
          @body body: string;
        }
        @route("/default") @post
        op defaultError(): Accepted | DefaultError;
        @route("/explicit") @post
        op explicitError(): Accepted | ExplicitError;
        @route("/range") @post
        op rangedError(): Accepted | RangedError;
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
});

it("reports once across multiple error responses", async () => {
  await tester
    .expect(
      `${header}
        @error model Custom { code: string; }
        @error model ServerError { @statusCode statusCode: 500; @body body: string; }
        @route("/run") @post
        op run(): Accepted | Custom | Failure<string> | ServerError;
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
it.each(["get", "post"])(
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
      @error model BodylessError { @statusCode statusCode: 400; }
      @route("/sync") @${verb} op sync(): Accepted | BodylessError;
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

it.each([
  "model Unmarked { @statusCode statusCode: 400; @body body: string; }",
  "model Unmarked { @statusCode statusCode: 500; @body body: CommonTypes.ErrorResponse; }",
  "model Unmarked { @statusCode @minValue(400) @maxValue(499) statusCode: int32; @body body: string; }",
])("requires a marked error rather than an HTTP error status: %s", async (declaration) => {
  await tester
    .expect(
      `${header}
      ${declaration}
      @route("/unmarked") @get op unmarked(): Accepted | Unmarked;
    `,
    )
    .toEmitDiagnostics({
      ...diagnostic,
      message: useStandardErrorRule.messages.missingErrorResponse,
    });
});

it("ignores HEAD operations without marked errors", async () => {
  await tester
    .expect(
      `${header}
      @head @route("/unmarked")
      op unmarked(): { @statusCode statusCode: 204; } | { @statusCode statusCode: 400; };
    `,
    )
    .toBeValid();
});

it.each([
  "ArmResourceCheckExistence<Widget>",
  "Extension.CheckExistence<Extension.Subscription, Widget>",
  "ArmResourceCheckExistence<Widget, Error = CustomError>",
  "Extension.CheckExistence<Extension.Subscription, Widget, Error = CustomError>",
])("ignores HEAD error payloads from CheckExistence templates: %s", async (template) => {
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
        checkExistence is ${template};
      }
    `,
    )
    .toBeValid();
});

it.each(["string", "CommonTypes.ErrorResponse"])(
  "checks marked errors with a non-error HTTP status: %s",
  async (payload) => {
    const expectation = tester.expect(
      `${header}
      @error model Marked {
        @statusCode statusCode: 200;
        @body body: ${payload};
      }
      @route("/marked") @get op marked(): Marked;
    `,
    );
    if (payload === "string") {
      await expectation.toEmitDiagnostics(diagnostic);
    } else {
      await expectation.toBeValid();
    }
  },
);

it.each(["string", "CommonTypes.ErrorResponse"])(
  "recognizes inherited error markers: %s",
  async (payload) => {
    const expectation = tester.expect(
      `${header}
      @error model Marked {}
      model Inherited extends Marked {
        @statusCode statusCode: 200;
        @body body: ${payload};
      }
      @route("/inherited") @get op inherited(): Inherited;
    `,
    );
    if (payload === "string") {
      await expectation.toEmitDiagnostics(diagnostic);
    } else {
      await expectation.toBeValid();
    }
  },
);

it.each(["Unmarked | Marked", "Marked | Unmarked"])(
  "ignores unmarked payloads sharing a status with a marked standard error: %s",
  async (responses) => {
    await tester
      .expect(
        `${header}
        model Unmarked { @statusCode statusCode: 400; @body body: string; }
        @error model Marked {
          @statusCode statusCode: 400;
          @body body: CommonTypes.ErrorResponse;
        }
        @route("/shared") @get op shared(): ${responses};
      `,
      )
      .toBeValid();
  },
);

it.each(["Unmarked | Marked", "Marked | Unmarked"])(
  "checks every marked variant sharing a non-error status: %s",
  async (responses) => {
    await tester
      .expect(
        `${header}
        model Unmarked { @statusCode statusCode: 200; @body body: CommonTypes.ErrorResponse; }
        @error model Marked { @statusCode statusCode: 200; @body body: string; }
        @route("/shared") @get op shared(): ${responses};
      `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it.each(["Standard | Custom", "Custom | Standard"])(
  "rejects a custom marked variant sharing a status with a standard error: %s",
  async (responses) => {
    await tester
      .expect(
        `${header}
        @error model Standard {
          @statusCode statusCode: 200;
          @body body: CommonTypes.ErrorResponse;
        }
        @error model Custom { @statusCode statusCode: 200; @body body: string; }
        @route("/shared") @get op shared(): ${responses};
      `,
      )
      .toEmitDiagnostics(diagnostic);
  },
);

it("checks marked errors inside nested return unions", async () => {
  await tester
    .expect(
      `${header}
      @error model Custom { @statusCode statusCode: 200; @body body: string; }
      alias Errors = Custom | CommonTypes.ErrorResponse;
      @route("/nested") @get op nested(): Accepted | Errors;
    `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("does not treat error models nested inside a discriminated payload as error responses", async () => {
  await tester
    .expect(
      `${header}
      @error model Custom { message: string; }
      @discriminated union Payload { failure: Custom, success: string }
      @route("/payload") @get op payload(): Payload;
    `,
    )
    .toEmitDiagnostics({
      ...diagnostic,
      message: useStandardErrorRule.messages.missingErrorResponse,
    });
});
