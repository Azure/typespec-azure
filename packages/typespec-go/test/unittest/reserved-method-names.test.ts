import { execFileSync } from "child_process";
import { describe, expect, it } from "vitest";
import { emitGoFor } from "./scenario-runner.js";

const reservedNames = [
  "import",
  "break",
  "default",
  "func",
  "interface",
  "select",
  "case",
  "defer",
  "go",
  "map",
  "struct",
  "chan",
  "else",
  "goto",
  "package",
  "switch",
  "const",
  "fallthrough",
  "if",
  "range",
  "type",
  "continue",
  "for",
  "return",
  "var",
  "error",
  "nil",
  "string",
  "append",
  "delete",
  "new",
];

type MethodKind = "basic" | "paging" | "lro" | "lropaging";

interface TestCase {
  kind: MethodKind;
  arm: boolean;
  internal: boolean;
  exactName: boolean;
  singleClient: boolean;
}

const methodKinds: MethodKind[] = ["basic", "paging", "lro", "lropaging"];
const cases = methodKinds.flatMap((kind) =>
  (kind === "lropaging" ? [true] : [false, true]).flatMap((arm) =>
    [false, true].flatMap((internal) =>
      [false, true].flatMap((exactName) =>
        [false, true].map((singleClient) => ({ kind, arm, internal, exactName, singleClient })),
      ),
    ),
  ),
);

function createSpec({ kind, arm, internal, exactName }: TestCase): string {
  const signatures: Record<MethodKind, string> = {
    basic: "(): Widget;",
    paging: "(): WidgetPage;",
    lro: `is global.Azure.Core.LongRunningRpcOperation<
      { @bodyRoot body: Widget; },
      WidgetStatus,
      Widget
    >;`,
    lropaging: `is ArmResourceActionAsyncBase<
      Resource,
      void,
      | ArmResponse<WidgetPage>
      | ArmAcceptedLroResponse<LroHeaders = ArmLroLocationHeader<FinalResult = WidgetPage>>,
      BaseParameters = Azure.ResourceManager.Foundations.DefaultBaseParameters<Resource>
    >;`,
  };
  const isLro = kind === "lro" || kind === "lropaging";
  const operations = reservedNames
    .map(
      (name, index) => `
        @route("/${name}")
        ${isLro ? "" : "@get"}
        ${kind === "paging" || kind === "lropaging" ? "@list" : ""}
        ${internal ? "@access(Access.internal)" : ""}
        ${exactName ? `@clientName(exact("${name}"), "go")` : ""}
        op ${exactName ? `operation${index}` : `\`${name}\``} ${signatures[kind]}
      `,
    )
    .join("\n");

  return `
    ${arm ? "@armProviderNamespace" : "@service"}
    namespace Keywords;

    model Widget {
      name: string;
    }

    model WidgetPage {
      @pageItems
      values: Widget[];
      @nextLink
      nextLink?: url;
    }

    model WidgetStatus is global.Azure.Core.Foundations.OperationStatus<Widget>;
    @@visibility(global.Azure.Core.Foundations.OperationStatus.id, Lifecycle.Read);

    ${
      kind === "lropaging"
        ? `
          model Resource is TrackedResource<ResourceProperties> {
            ...ResourceNameParameter<
              Resource,
              KeyName = "resourceName",
              SegmentName = "resources",
              NamePattern = ""
            >;
          }

          model ResourceProperties {
            @visibility(Lifecycle.Read)
            provisioningState?: "Succeeded" | "Failed" | "Canceled";
          }
        `
        : ""
    }

    ${operations}
  `;
}

function createExample({ kind, exactName }: TestCase): string {
  const parameters: Record<string, unknown> = {};
  if (kind === "lro" || kind === "lropaging") {
    parameters["api-version"] = "2026-09-01";
  }
  if (kind === "lro") {
    parameters.body = { name: "widget" };
  } else if (kind === "lropaging") {
    parameters.subscriptionId = "00000000-0000-0000-0000-000000000000";
    parameters.resourceGroupName = "group";
    parameters.resourceName = "resource";
  }

  return JSON.stringify({
    operationId: exactName ? "operation0" : "import",
    title: "Reserved method name",
    parameters,
    responses:
      kind === "lro" || kind === "lropaging"
        ? { "202": {} }
        : { "200": { body: kind === "paging" ? { values: [] } : { name: "widget" } } },
  });
}

describe("reserved method names", () => {
  it.each(cases)(
    "covers $kind: arm=$arm, internal=$internal, exactName=$exactName, singleClient=$singleClient",
    async (testCase) => {
      const { kind, arm, internal, singleClient } = testCase;
      const isLro = kind === "lro" || kind === "lropaging";
      const files = await emitGoFor(
        createSpec(testCase),
        {
          "generate-fakes": true,
          "generate-samples": arm,
          "inject-spans": true,
          "single-client": singleClient,
        },
        arm ? { "examples/keyword.json": createExample(testCase) } : {},
      );
      const client = files.get("zz_keywords_client.go");
      const options = files.get("zz_options.go");
      const responses = files.get("zz_responses.go");
      const fake = files.get("fake/zz_keywords_server.go");
      const sample = files.get("zz_keywords_client_example_test.go");
      expect(client).toBeDefined();
      expect(options).toBeDefined();
      expect(responses).toBeDefined();
      for (const [fileName, content] of files) {
        if (fileName.endsWith(".go")) {
          execFileSync("gofmt", ["-s"], { input: content, stdio: "pipe" });
        }
      }

      for (const name of reservedNames) {
        const capitalized = name[0]!.toUpperCase() + name.slice(1);
        const methodName = isLro
          ? `${internal ? "begin" : "Begin"}${capitalized}`
          : kind === "paging"
            ? `${internal ? "new" : "New"}${capitalized}Pager`
            : internal
              ? `${name}Method`
              : capitalized;
        const prefix = singleClient ? "" : internal ? "keywordsClient" : "KeywordsClient";
        const methodTypeName = kind === "basic" && internal ? `${capitalized}Method` : capitalized;
        let optionsName = `${prefix}${isLro ? "Begin" : ""}${methodTypeName}Options`;
        let responseName = `${prefix}${methodTypeName}Response`;
        if (internal) {
          optionsName = optionsName[0]!.toLowerCase() + optionsName.slice(1);
          responseName = responseName[0]!.toLowerCase() + responseName.slice(1);
        }
        expect(client).toContain(`func (client *KeywordsClient) ${methodName}(`);
        expect(client).toContain(`${name}CreateRequest(`);
        expect(client).toMatch(new RegExp(`urlPath := "[^"\\n]*/${name}(?:/|")`));
        expect(options).toContain(`type ${optionsName} struct`);
        expect(responses).toContain(`type ${responseName} struct`);
        if (isLro) {
          expect(client).toContain(`func (client *KeywordsClient) ${name}Operation(`);
          expect(client).toContain(`client.${name}Operation(`);
        } else {
          expect(client).toContain(`${name}HandleResponse(`);
        }
        if (!internal) {
          expect(fake).toContain(`${methodName} func(`);
          expect(fake).toContain(`case "KeywordsClient.${methodName}":`);
          expect(fake).toContain(`dispatch${methodName}(req *http.Request)`);
        }
      }

      if (internal) {
        expect(fake).toBeUndefined();
      }
      if (internal || !arm) {
        expect(sample).toBeUndefined();
      } else {
        const methodName = isLro ? "BeginImport" : kind === "paging" ? "NewImportPager" : "Import";
        expect(sample).toContain(`func ExampleKeywordsClient_${methodName}()`);
        expect(sample).toContain(`.${methodName}(`);
      }
    },
  );

  it("avoids the internal client field when naming an internal basic method", async () => {
    const files = await emitGoFor(`
      @service
      namespace Keywords;
      @access(Access.internal)
      @get
      @route("/internal")
      op \`internal\`(): void;
    `);
    expect(files.get("zz_keywords_client.go")).toContain(
      "func (client *KeywordsClient) internalMethod(",
    );
  });
});
