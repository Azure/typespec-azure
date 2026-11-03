import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { listResponseEnvelopeRule } from "../../src/rules/list-response-envelope.js";

describe("paging response bodies", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    tester = createLinterRuleTester(
      await Tester.createInstance(),
      listResponseEnvelopeRule,
      "@azure-tools/typespec-azure-resource-manager",
    );
  }, 30_000);

  const diagnostic = {
    code: "@azure-tools/typespec-azure-resource-manager/list-response-envelope",
    message: "Paged ARM list responses must declare a 'value' property of array type.",
  };

  const resource = `
  @armProviderNamespace
  @service(#{ title: "Test" })
  namespace Microsoft.Test;

  model Widget is ProxyResource<{}> {
    ...ResourceNameParameter<Widget>;
  }
`;

  function listResourceWithResponse(response: string): string {
    return `
    ${resource}
    ${response}
    @armResourceOperations
    interface Widgets {
      listByParent is ArmResourceListByParent<Widget, Response = ArmResponse<WidgetPage>>;
    }
  `;
  }

  it("reports a missing value array on an ARM list response override", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model WidgetPage {
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
      `),
      )
      .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
  });

  it("reports a paginated POST list action without value", async () => {
    await tester
      .expect(
        `
        ${resource}
        model WidgetPage {
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
        @armResourceOperations
        interface Widgets {
          @list
          listCustom is ArmResourceActionSync<Widget, void, ArmResponse<WidgetPage>>;
        }
      `,
      )
      .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
  });

  it("reports a non-array value even when another property supplies page items", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model WidgetPage {
          value: string;
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
      `),
      )
      .toEmitDiagnostics({ ...diagnostic, target: "value" });
  });

  it("rejects a non-standard next-link property in the combined envelope check", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model WidgetPage {
          @pageItems value: Widget[];
          @nextLink nextPage?: string;
        }
      `),
      )
      .toEmitDiagnostics({ code: diagnostic.code, target: "nextPage" });
  });

  it("accepts a value array with the standard next link", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model WidgetPage {
          @pageItems value: Widget[];
          @nextLink nextLink?: string;
        }
      `),
      )
      .toBeValid();
  });

  it("accepts an inherited value array", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model BasePage {
          @pageItems value: Widget[];
          @nextLink nextLink?: string;
        }
        model WidgetPage extends BasePage {}
      `),
      )
      .toBeValid();
  });

  it("reports an inherited non-array value", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model BasePage {
          value: string;
          @pageItems items: Widget[];
          @nextLink nextLink?: string;
        }
        model WidgetPage extends BasePage {}
      `),
      )
      .toEmitDiagnostics({ ...diagnostic, target: "value" });
  });

  it("accepts the standard ARM list response template", async () => {
    await tester
      .expect(
        `
        ${resource}
        @armResourceOperations
        interface Widgets {
          listByParent is ArmResourceListByParent<Widget>;
        }
      `,
      )
      .toBeValid();
  });

  it("retains the collection-path envelope requirement without paging next-link metadata", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model WidgetPage {
          @pageItems items: Widget[];
        }
      `),
      )
      .toEmitDiagnostics({ code: diagnostic.code, target: "items" });
  });

  it("ignores an operation without the list decorator", async () => {
    await tester
      .expect(
        `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/widgets") @get op fetchWidgets(): WidgetPage;
      `,
      )
      .toBeValid();
  });

  it("checks authored list responses without a provider decorator", async () => {
    await tester
      .expect(
        `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/widgets") @get @list op listWidgets(): WidgetPage;
      `,
      )
      .toEmitDiagnostics({ ...diagnostic, target: "WidgetPage" });
  });

  it("reports separately on operations sharing one invalid response", async () => {
    await tester
      .expect(
        `
        @service(#{ title: "Test" })
        namespace Microsoft.Test;
        model WidgetPage {
          value: string;
          @pageItems items: string[];
          @nextLink nextLink?: string;
        }
        @route("/one") @get @list op listOne(): WidgetPage;
        @route("/two") @post @list op listTwo(): WidgetPage;
      `,
      )
      .toEmitDiagnostics([
        { ...diagnostic, target: "value" },
        { ...diagnostic, target: "value" },
      ]);
  });

  it.each(["@header", "@bodyIgnore"])(
    "reports an inherited %s next link outside the 200 response body",
    async (annotation) => {
      await tester
        .expect(
          listResourceWithResponse(`
          model BasePage {
            @pageItems value: Widget[];
            ${annotation} @nextLink nextLink?: string;
          }
          model WidgetPage extends BasePage {}
        `),
        )
        .toEmitDiagnostics({
          code: diagnostic.code,
          message:
            "Paged ARM list responses must include the 'nextLink' next-link property in the response body.",
          target: "nextLink",
        });
    },
  );

  function customList(models: string, response = "WidgetPage"): string {
    return `
    ${resource}
    ${models}
    @route("/customList") @post @list
    op listWidgets(): ${response};
  `;
  }

  it.each(["202", "*"])("reports a header-only next link in the %s response", async (status) => {
    await tester
      .expect(
        customList(`
        ${status === "*" ? "@error" : ""}
        model WidgetPage {
          ${status === "*" ? "" : `@statusCode status: ${status};`}
          @pageItems items: Widget[];
          @header @nextLink cursor?: string;
        }
      `),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
        target: "WidgetPage",
      });
  });

  it.each(["202", "*"])("accepts a custom body next link in the %s response", async (status) => {
    await tester
      .expect(
        customList(`
        ${status === "*" ? "@error" : ""}
        model WidgetPage {
          ${status === "*" ? "" : `@statusCode status: ${status};`}
          @pageItems items: Widget[];
          @nextLink cursor?: string;
          totalCount?: int32;
        }
      `),
      )
      .toBeValid();
  });

  it("selects 201 before 202 regardless of response union ordering", async () => {
    await tester
      .expect(
        customList(
          `
          model WidgetPage {
            @statusCode status: 202;
            @pageItems items: Widget[];
            @nextLink cursor?: string;
          }
          model Created {
            @statusCode status: 201;
            items: Widget[];
          }
        `,
          "WidgetPage | Created",
        ),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
        target: "Created",
      });
  });

  it.each([
    ["application/json", "application/json"],
    ["application/vnd.contoso+json", "application/json"],
    ["application/xml", "application/xml"],
  ])("reports a next link renamed in the %s response body", async (contentType, encoding) => {
    await tester
      .expect(
        customList(`
            model WidgetPage {
              @statusCode status: 202;
              @header contentType: "${contentType}";
              @pageItems items: Widget[];
              @encodedName("${encoding}", "continuation")
              @nextLink cursor?: string;
            }
          `),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
        target: "cursor",
      });
  });

  it("accepts a differently named body property serialized as the semantic next-link name", async () => {
    await tester
      .expect(
        customList(
          `
            model WidgetPage {
              @statusCode status: 202;
              @pageItems items: Widget[];
              @nextLink cursor?: string;
            }
            model Created {
              @statusCode status: 201;
              items: Widget[];
              @encodedName("application/json", "cursor") continuation?: string;
            }
          `,
          "WidgetPage | Created",
        ),
      )
      .toBeValid();
  });

  it("accepts an eligible wire-named property alongside an inherited renamed next link", async () => {
    await tester
      .expect(
        customList(`
          model BasePage {
            @pageItems items: Widget[];
            @encodedName("application/json", "continuation")
            @nextLink cursor?: string;
          }
          model WidgetPage extends BasePage {
            @statusCode status: 202;
            @encodedName("application/json", "cursor") bodyCursor?: string;
          }
        `),
      )
      .toBeValid();
  });

  it.each(["@header", "@bodyIgnore"])(
    "does not accept an encoded next-link name on an inherited %s property",
    async (annotation) => {
      await tester
        .expect(
          customList(
            `
              model WidgetPage {
                @statusCode status: 202;
                @pageItems items: Widget[];
                @nextLink cursor?: string;
              }
              model BaseCreated {
                items: Widget[];
                ${annotation}
                @encodedName("application/json", "cursor") continuation?: string;
              }
              model Created extends BaseCreated { @statusCode status: 201; }
            `,
            "WidgetPage | Created",
          ),
        )
        .toEmitDiagnostics({
          code: diagnostic.code,
          message:
            "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
          target: "Created",
        });
    },
  );

  it("does not apply XML encoded names to a JSON response body", async () => {
    await tester
      .expect(
        customList(`
          model WidgetPage {
            @statusCode status: 202;
            @pageItems items: Widget[];
            @encodedName("application/xml", "continuation")
            @nextLink cursor?: string;
          }
        `),
      )
      .toBeValid();
  });

  it("checks each declared media type instead of accepting only the JSON name", async () => {
    await tester
      .expect(
        customList(`
          model WidgetPage {
            @statusCode status: 202;
            @header contentType: "application/json" | "application/xml";
            @pageItems items: Widget[];
            @encodedName("application/xml", "continuation")
            @nextLink cursor?: string;
          }
        `),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
        target: "cursor",
      });
  });

  it("preserves an inherited encoded header property inside an explicit response body", async () => {
    await tester
      .expect(
        customList(
          `
            model BasePage {
              @pageItems items: Widget[];
              #suppress "@typespec/http/metadata-ignored" "The header is part of an explicit body."
              @header @encodedName("application/json", "cursor") continuation?: string;
            }
            model WidgetPage extends BasePage {
              @encodedName("application/json", "continuation")
              @nextLink cursor?: string;
            }
            model Response {
              @statusCode status: 202;
              @body body: WidgetPage;
            }
          `,
          "Response",
        ),
      )
      .toBeValid();
  });

  it("accepts the corresponding body property without repeating paging metadata on 201", async () => {
    await tester
      .expect(
        customList(
          `
          model WidgetPage {
            @statusCode status: 202;
            @pageItems items: Widget[];
            @nextLink cursor?: string;
          }
          model Created {
            @statusCode status: 201;
            items: Widget[];
            cursor?: string;
          }
        `,
          "WidgetPage | Created",
        ),
      )
      .toBeValid();
  });

  it("does not fall through a bodyless 200 to an invalid 202", async () => {
    await tester
      .expect(
        customList(
          `
          model Empty { @statusCode status: 200; }
          model WidgetPage {
            @statusCode status: 202;
            @pageItems items: Widget[];
            @header @nextLink cursor?: string;
          }
        `,
          "WidgetPage | Empty",
        ),
      )
      .toBeValid();
  });

  it("ignores response headers when checking the strict 200 envelope", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model BasePage {
          @pageItems value: Widget[];
          @nextLink nextLink?: string;
          @header requestId?: string;
        }
        model WidgetPage extends BasePage {}
      `),
      )
      .toBeValid();
  });

  it("preserves properties inside an explicit response body", async () => {
    await tester
      .expect(
        customList(
          `
          model WidgetPage {
            @pageItems value: Widget[];
            #suppress "@typespec/http/metadata-ignored" "The header is part of an explicit body."
            @header @nextLink nextLink?: string;
          }
          model Response { @body body: WidgetPage; }
        `,
          "Response",
        ),
      )
      .toBeValid();
  });

  it("retains create-only next-link properties without adding a read-visibility policy", async () => {
    await tester
      .expect(
        listResourceWithResponse(`
        model BasePage {
          @pageItems value: Widget[];
          @visibility(Lifecycle.Create) @nextLink nextLink?: string;
        }
        model WidgetPage extends BasePage {}
      `),
      )
      .toBeValid();
  });

  it("checks a success status range when no numeric success status is declared", async () => {
    await tester
      .expect(
        customList(`
        model WidgetPage {
          @statusCode @minValue(200) @maxValue(299) status: int32;
          @pageItems items: Widget[];
          @header @nextLink cursor?: string;
        }
      `),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'cursor' next-link property in the response body.",
        target: "WidgetPage",
      });
  });

  it("selects a numeric success before a range containing 200", async () => {
    await tester
      .expect(
        customList(
          `
          model WidgetPage {
            @statusCode @minValue(200) @maxValue(299) status: int32;
            @pageItems items: Widget[];
            @header @nextLink cursor?: string;
          }
          model Created {
            @statusCode status: 201;
            items: Widget[];
            cursor?: int32;
          }
        `,
          "WidgetPage | Created",
        ),
      )
      .toBeValid();
  });

  it("does not treat a body root as an explicit body that preserves HTTP metadata", async () => {
    await tester
      .expect(
        customList(
          `
          model BasePage {
            @pageItems value: Widget[];
            @header @nextLink nextLink?: string;
          }
          model WidgetPage extends BasePage {}
          model Response { @bodyRoot body: WidgetPage; }
        `,
          "Response",
        ),
      )
      .toEmitDiagnostics({
        code: diagnostic.code,
        message:
          "Paged ARM list responses must include the 'nextLink' next-link property in the response body.",
        target: "nextLink",
      });
  });
});

describe("collection response bodies", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    tester = createLinterRuleTester(
      await Tester.createInstance(),
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

  it.each(["@header", "@bodyIgnore"])(
    "ignores an inherited %s property outside the collection body",
    async (annotation) => {
      await tester
        .expect(
          armGet(
            "/scope/providers/Microsoft.TestService/widgets",
            "WidgetListResult",
            `${widgetModel}
             model BasePage {
               value: Widget[];
               nextLink?: string;
               ${annotation} requestId?: string;
             }
             model WidgetListResult extends BasePage {}`,
          ),
        )
        .toBeValid();
    },
  );

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
});
