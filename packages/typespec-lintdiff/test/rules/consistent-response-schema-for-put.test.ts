import { getSourceLocation, resolvePath } from "@typespec/compiler";
import {
  createLinterRuleTester,
  createTester,
  expectDiagnostics,
  type LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { consistentResponseSchemaForPutRule } from "../../src/rules/consistent-response-schema-for-put.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-autorest",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "Azure.ResourceManager")
  .wrap(
    (code) => `
      @service
      @armProviderNamespace
      namespace Microsoft.TestService {
        model OkBody<T> {
          @statusCode statusCode: 200;
          @body body: T;
        }
        model CreatedBody<T> {
          @statusCode statusCode: 201;
          @body body: T;
        }
        ${code}
      }
    `,
  );

const diagnostic = {
  code: "tsp-lintdiff-local-linter/consistent-response-schema-for-put",
  severity: "warning" as const,
  message:
    "200 response schema does not match 201 response schema. A PUT API must always return the same response schema for both the 200 and 201 status codes.",
};

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    consistentResponseSchemaForPutRule,
    "tsp-lintdiff-local-linter",
  );
});

describe("operation templates", () => {
  it("reports only the differing concrete alias, not its instantiated source", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        @route("/same") op same is Template<string>;
        @route("/different") op /*different*/different is Template<int32>;
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });

  it("ignores unused operation and interface template declarations", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<int32>;
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<int32>;
        }
      `,
      )
      .toBeValid();
  });

  it("checks concrete interface aliases of operation templates", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        interface Widgets {
          @route("/same") same is Template<string>;
          @route("/different") /*different*/different is Template<int32>;
        }
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });

  it("checks inherited operations on concrete interfaces, not template interface sources", async () => {
    await tester
      .expect(
        `
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<T>;
        }
        @route("/same") interface Same extends Templates<string> {}
        @route("/different") interface Different extends Templates<int32> {}
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("reports each concrete alias of a shared violating template instance", async () => {
    await tester
      .expect(
        `
        @put op Template<T>(): OkBody<string> | CreatedBody<T>;
        @route("/first") op first is Template<int32>;
        @route("/second") op second is Template<int32>;
      `,
      )
      .toEmitDiagnostics([diagnostic, diagnostic]);
  });

  it("checks aliases of operations on instantiated interfaces", async () => {
    await tester
      .expect(
        `
        interface Templates<T> {
          @put put(): OkBody<string> | CreatedBody<T>;
        }
        alias Same = Templates<string>;
        alias Different = Templates<int32>;
        @route("/same") op same is Same.put;
        @route("/different") op /*different*/different is Different.put;
      `,
      )
      .toEmitDiagnostics(({ different }) => ({
        ...diagnostic,
        pos: getSourceLocation(different).pos,
        end: getSourceLocation(different).end,
      }));
  });
});

describe("native response type equality", () => {
  it("accepts separately authored tuples with the same native element types", async () => {
    await tester
      .expect(
        `
        @put op put(): OkBody<[string, { value: int32 }]> | CreatedBody<[string, { value: int32 }]>;
      `,
      )
      .toBeValid();
  });

  it("reports separately authored tuples with different native element types", async () => {
    await tester
      .expect(
        `
        @put op put(): OkBody<[string]> | CreatedBody<[int32]>;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not collapse a tuple and an unknown array", async () => {
    await tester
      .expect(
        `
        @put op put(): OkBody<[string]> | CreatedBody<unknown[]>;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not collapse distinct multipart body types", async () => {
    await tester
      .expect(
        `
        model FormData { value: HttpPart<string>; }
        model OtherFormData { count: HttpPart<int32>; }
        model MultipartOk {
          @statusCode statusCode: 200;
          @multipartBody body: FormData;
        }
        model MultipartCreated {
          @statusCode statusCode: 201;
          @multipartBody body: OtherFormData;
        }
        @put op put(): MultipartOk | MultipartCreated;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not collapse multipart and ordinary string bodies", async () => {
    await tester
      .expect(
        `
        model FormData { value: HttpPart<string>; }
        model MultipartOk {
          @statusCode statusCode: 200;
          @multipartBody body: FormData;
        }
        @put op put(): MultipartOk | CreatedBody<string>;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });

  it("does not collapse multipart and ordinary bodies that share a type", async () => {
    await tester
      .expect(
        `
        model FormData { value: HttpPart<string>; }
        model MultipartOk {
          @statusCode statusCode: 200;
          @multipartBody body: FormData;
        }
        @put op put(): MultipartOk | CreatedBody<FormData>;
      `,
      )
      .toEmitDiagnostics(diagnostic);
  });
});

describe("response content variants", () => {
  const responses = `
      model Response<Status extends int32, Body, ContentType extends string> {
        @statusCode statusCode: Status;
        @header contentType: ContentType;
        @body body: Body;
      }
    `;

  it.each([
    [200, 201],
    [201, 200],
  ])(
    "ignores conflicting body types at status %s regardless of their order",
    async (status, otherStatus) => {
      for (const bodies of ["Json | Xml", "Xml | Json"]) {
        const code = `
            ${responses}
            model Json is Response<${status}, string, "application/json">;
            model Xml is Response<${status}, int32, "application/xml">;
            model Other is Response<${otherStatus}, string, "application/json">;
            @put op put(): ${bodies} | Other;
          `;
        await tester.expect(code).toBeValid();
        const diagnostics = await Tester.emit("@azure-tools/typespec-autorest").diagnose(code);
        expectDiagnostics(
          diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
          { code: "@azure-tools/typespec-autorest/duplicate-body-types" },
        );
      }
    },
  );

  it("does not merge distinct inline types merely because their properties agree", async () => {
    await tester
      .expect(
        `
          ${responses}
          model Json is Response<200, { value: string }, "application/json">;
          model Xml is Response<200, { value: string }, "application/xml">;
          @put op put(): Json | Xml | CreatedBody<int32>;
        `,
      )
      .toBeValid();
  });

  it.each([
    [200, 201],
    [201, 200],
  ])(
    "ignores conflicting body kinds at status %s regardless of their order",
    async (status, otherStatus) => {
      for (const bodies of ["Ordinary | Multipart", "Multipart | Ordinary"]) {
        await tester
          .expect(
            `
              ${responses}
              model FormData { value: HttpPart<string>; }
              model Ordinary is Response<${status}, FormData, "application/json">;
              model Multipart {
                @statusCode statusCode: ${status};
                @multipartBody body: FormData;
              }
              model Other is Response<${otherStatus}, FormData, "application/json">;
              @put op put(): ${bodies} | Other;
            `,
          )
          .toBeValid();
      }
    },
  );

  it.each(["Json | Xml", "Xml | Json"])(
    "allows shared body types across reordered variants: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Payload { value: string; }
            model Json is Response<200, Payload, "application/json">;
            model Xml is Response<200, Payload, "application/xml">;
            @put op put(): ${variants} | CreatedBody<Payload>;
          `,
        )
        .toBeValid();
    },
  );

  it.each(["Json | Xml", "Xml | Json"])(
    "still reports different schemas across valid status groups: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Payload { value: string; }
            model Other { value: int32; }
            model Json is Response<200, Payload, "application/json">;
            model Xml is Response<200, Payload, "application/xml">;
            @put op /*put*/put(): ${variants} | CreatedBody<Other>;
          `,
        )
        .toEmitDiagnostics(({ put }) => ({
          ...diagnostic,
          pos: getSourceLocation(put).pos,
          end: getSourceLocation(put).end,
        }));
    },
  );

  it.each(["Json | Binary", "Binary | Json"])(
    "ignores content-type-driven byte schema differences for the same native body: %s",
    async (variants) => {
      await tester
        .expect(
          `
            ${responses}
            model Json is Response<200, bytes, "application/json">;
            model Binary is Response<200, bytes, "application/octet-stream">;
            model Created is Response<201, bytes, "application/octet-stream">;
            @put op put(): ${variants} | Created;
          `,
        )
        .toBeValid();
    },
  );

  it("ignores emitter-specific byte schema differences for the same native body type", async () => {
    await tester
      .expect(
        `
          ${responses}
          model Binary is Response<200, bytes, "application/octet-stream">;
          model Json is Response<201, bytes, "application/json">;
          @put op put(): Binary | Json;
        `,
      )
      .toBeValid();
  });

  it.each(["Empty | OkBody<string>", "OkBody<string> | Empty"])(
    "does not treat a bodyless variant as a conflicting body: %s",
    async (variants) => {
      await tester
        .expect(
          `
            model Empty { @statusCode statusCode: 200; }
            @put op put(): ${variants} | CreatedBody<int32>;
          `,
        )
        .toEmitDiagnostics(diagnostic);
    },
  );
});
