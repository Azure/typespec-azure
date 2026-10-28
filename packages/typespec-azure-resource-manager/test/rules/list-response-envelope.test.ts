import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    listResponseEnvelopeRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function armGet(route: string, response: string, models: string): string {
  return `
    @armProviderNamespace
    namespace Microsoft.TestService;

    ${models}

    @route("${route}")
    @get
    op getCollection(): ${response};
  `;
}

const widgetModel = `model Widget { name: string; }`;
const diagnosticCode = "@azure-tools/typespec-azure-resource-manager/list-response-envelope";

it("reports an extra property on a collection response", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           nextLink?: string;
           totalCount?: int32;
         }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("reports every extra property on a collection response", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           nextLink?: string;
           totalCount?: int32;
           metadata?: string;
         }`,
      ),
    )
    .toEmitDiagnostics([{ code: diagnosticCode }, { code: diagnosticCode }]);
});

it("does not report a redundant missing-property diagnostic when an extra property is reported", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           totalCount?: int32;
         }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("reports a value-only response on an extension-scope collection path", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("reports operations in a nested provider namespace", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.TestService {
          namespace V1 {
            ${widgetModel}
            model WidgetListResult { value: Widget[]; }

            @route("/scope/providers/Microsoft.TestService/widgets")
            @get
            op getCollection(): WidgetListResult;
          }
        }
      `,
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("ignores operations outside an ARM provider namespace", async () => {
  await tester
    .expect(
      `
        namespace Contoso {
          ${widgetModel}
          model WidgetListResult { value: Widget[]; }

          @route("/scope/providers/Contoso/widgets")
          @get
          op getCollection(): WidgetListResult;
        }
      `,
    )
    .toBeValid();
});

it("accepts a response containing only value and nextLink", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult {
           value: Widget[];
           nextLink?: string;
         }`,
      ),
    )
    .toBeValid();
});

it("accepts a named array response body", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets",
        "WidgetCollection",
        `${widgetModel}
         model WidgetCollection is Widget[];`,
      ),
    )
    .toBeValid();
});

it("accepts a direct array response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgets", "Widget[]", widgetModel))
    .toBeValid();
});

it("accepts a record response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgets", "Record<string>", ""))
    .toBeValid();
});

it("accepts a file response body", async () => {
  await tester
    .expect(armGet("/scope/providers/Microsoft.TestService/widgetFiles", "Http.File", ""))
    .toBeValid();
});

it("accepts a multipart response body", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgetArchives",
        "{ @multipartBody fields: { archive: HttpPart<Http.File>; description: HttpPart<string>; }; }",
        "",
      ),
    )
    .toBeValid();
});

it("accepts an invalid collection shape on a point path with a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/widgets/exampleWidget?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("accepts an invalid collection shape when the raw path ends with operations", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customoperations",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("reports an invalid collection shape when operations is followed by a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customoperations?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

it("accepts an invalid collection shape when the raw path ends with default", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customdefault",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toBeValid();
});

it("reports an invalid collection shape when default is followed by a query suffix", async () => {
  await tester
    .expect(
      armGet(
        "/scope/providers/Microsoft.TestService/customdefault?disambiguation_dummy",
        "WidgetListResult",
        `${widgetModel}
         model WidgetListResult { value: Widget[]; }`,
      ),
    )
    .toEmitDiagnostics({ code: diagnosticCode });
});

describe("paging response payloads", () => {
  const envelopeMessage =
    "Collection GET response models must declare exactly the `value` and `nextLink` properties.";
  const correspondenceMessage =
    "Include 'nextLink' as a body property in the selected paging response.";

  function paging(models: string, response = "Page", provider = true): string {
    return `
      ${provider ? "@armProviderNamespace" : ""}
      namespace Microsoft.TestService;
      ${models}
      @route("/widgets")
      @list @get
      op listWidgets(): ${response};
    `;
  }

  it.each(["@header", "@bodyIgnore"])(
    "does not count an inherited %s nextLink as a 200 body member or report twice",
    async (annotation) => {
      await tester
        .expect(
          paging(`
            model Base {
              @pageItems value: string[];
              ${annotation} @nextLink nextLink?: string;
            }
            /*target*/model Page extends Base {}
          `),
        )
        .toEmitDiagnostics((result) => ({
          code: diagnosticCode,
          message: envelopeMessage,
          pos: result.pos.target.pos,
        }));
    },
  );

  it.each(["@statusCode code: 202;", ""])(
    "requires a body nextLink on a selected non-200 response (%s)",
    async (status) => {
      await tester
        .expect(
          paging(`
            ${status ? "" : "@error"}
            model Page {
              ${status}
              @pageItems value: string[];
              /*target*/@header @nextLink nextLink?: string;
            }
          `),
        )
        .toEmitDiagnostics((result) => ({
          code: diagnosticCode,
          message: correspondenceMessage,
          pos: result.pos.target.pos,
        }));
    },
  );

  it("selects 201 before 202 regardless of source union order", async () => {
    await tester
      .expect(
        paging(
          `
            /*target*/model CreatedBody { value: string[]; }
            model Created {
              @statusCode code: 201;
              @body body: CreatedBody;
            }
            model Accepted {
              @statusCode code: 202;
              @pageItems value: string[];
              @nextLink nextLink?: string;
            }
          `,
          "Accepted | Created",
        ),
      )
      .toEmitDiagnostics((result) => ({
        code: diagnosticCode,
        message: correspondenceMessage,
        pos: result.pos.target.pos,
      }));
  });

  it.each(["", "@statusCode code: 202;", "@error"])(
    "accepts ordinary body paging in 200, 202 and default responses (%s)",
    async (status) => {
      await tester
        .expect(
          paging(`
            ${status === "@error" ? status : ""}
            model Page {
              ${status === "@error" ? "" : status}
              @pageItems value: string[];
              @nextLink nextLink?: string;
            }
          `),
        )
        .toBeValid();
    },
  );

  it.each(["", "@bodyIgnore"])(
    "accepts explicit body paging with %s members",
    async (annotation) => {
      await tester
        .expect(
          paging(
            `
            model Page {
              @pageItems value: string[];
              ${annotation} @nextLink nextLink?: string;
            }
            model Response { @body body: Page; }
          `,
            "Response",
          ),
        )
        .toBeValid();
    },
  );

  it("accepts custom fallback names and additional body properties", async () => {
    await tester
      .expect(
        paging(`
          model Page {
            @statusCode code: 202;
            @pageItems items: string[];
            @nextLink cursor?: string;
            totalCount?: int32;
          }
        `),
      )
      .toBeValid();
  });

  it("uses the actual custom next-link name for fallback correspondence", async () => {
    await tester
      .expect(
        paging(`
          model Page {
            @statusCode code: 202;
            @pageItems items: string[];
            /*target*/@header @nextLink cursor?: string;
            nextLink?: string;
          }
        `),
      )
      .toEmitDiagnostics((result) => ({
        code: diagnosticCode,
        message: "Include 'cursor' as a body property in the selected paging response.",
        pos: result.pos.target.pos,
      }));
  });

  it.each([
    [
      "valid 200 body",
      "model Page { @pageItems value: string[]; @nextLink nextLink?: string; }",
      "",
    ],
    ["bodyless 200", "model Page { @statusCode code: 200; }", "@pageItems"],
  ])("does not fall through a %s to a bad 202", async (_, selected, items) => {
    await tester
      .expect(
        paging(
          `
            ${selected}
            model Accepted {
              @statusCode code: 202;
              ${items} value: string[];
              ${items ? "@nextLink" : ""} @header nextLink?: string;
            }
          `,
          "Accepted | Page",
        ),
      )
      .toBeValid();
  });

  it("skips a selected response without a body", async () => {
    await tester
      .expect(
        paging(`
          model Page {
            @pageItems @header value: string[];
            @nextLink @header nextLink?: string;
          }
        `),
      )
      .toBeValid();
  });

  it("does not impose new fallback validation without an ARM provider", async () => {
    await tester
      .expect(
        paging(
          `
            model Page {
              @statusCode code: 202;
              @pageItems value: string[];
              @nextLink @header nextLink?: string;
            }
          `,
          "Page",
          false,
        ),
      )
      .toBeValid();
  });

  it("retains strict 200 validation for provider-free paging", async () => {
    await tester
      .expect(
        paging(
          `
            model Page {
              @pageItems value: string[];
              /*target*/@nextLink cursor?: string;
            }
          `,
          "Page",
          false,
        ),
      )
      .toEmitDiagnostics((result) => ({
        code: diagnosticCode,
        message: envelopeMessage,
        pos: result.pos.target.pos,
      }));
  });

  it("checks a supported success status range when no numeric success exists", async () => {
    await tester
      .expect(
        paging(`
          @minValue(200) @maxValue(299) scalar SuccessCode extends int32;
          model Page {
            @statusCode code: SuccessCode;
            @pageItems value: string[];
            /*target*/@header @nextLink nextLink?: string;
          }
        `),
      )
      .toEmitDiagnostics((result) => ({
        code: diagnosticCode,
        message: correspondenceMessage,
        pos: result.pos.target.pos,
      }));
  });

  it("selects a numeric success before a success range", async () => {
    await tester
      .expect(
        paging(
          `
            @minValue(200) @maxValue(299) scalar SuccessCode extends int32;
            model Range {
              @statusCode code: SuccessCode;
              @pageItems value: string[];
              @header @nextLink nextLink?: string;
            }
            model Accepted {
              @statusCode code: 202;
              nextLink?: string;
            }
          `,
          "Range | Accepted",
        ),
      )
      .toBeValid();
  });
});
