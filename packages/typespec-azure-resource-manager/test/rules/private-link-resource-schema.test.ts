import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { privateLinkResourceSchemaRule } from "../../src/rules/private-link-resource-schema.js";

const setup = `
  @armProviderNamespace @service namespace Microsoft.Test;
  model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
`;
const base =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Test/widgets/{widgetName}";
const connectionCollection = `${base}/privateEndpointConnections`;
const connectionPoint = `${connectionCollection}/{connectionName}`;
const linkCollection = `${base}/privateLinkResources`;
const linkPoint = `${linkCollection}/{linkName}`;
const validConnection = `
  model Connection {
    properties: {
      privateEndpoint?: string;
      privateLinkServiceConnectionState?: string;
    };
  }
`;
const validLink = `
  model Link {
    properties: { groupId?: string; requiredMembers?: string[]; requiredZoneNames?: string[]; };
  }
`;
const code = "@azure-tools/typespec-azure-resource-manager/private-link-resource-schema";
const connectionDiagnostic = {
  code,
  message:
    "The private endpoint connection GET response must contain `properties.privateEndpoint` and `properties.privateLinkServiceConnectionState`.",
};
const connectionListDiagnostic = {
  code,
  message:
    "The private endpoint connection GET response must contain a `value` array with items containing `properties.privateEndpoint` and `properties.privateLinkServiceConnectionState`.",
};
const linkListDiagnostic = {
  code,
  message:
    "The private link resource GET response must contain a `value` array with items containing `properties.groupId`, `properties.requiredMembers`, and `properties.requiredZoneNames`.",
};

let tester: LinterRuleTester;
beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    privateLinkResourceSchemaRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
}, 30_000);

function parameters(path: string): string {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => `@path ${match[1]}: string`).join(", ");
}

function point(path: string, response: string, extra = ""): string {
  return `@get @route("${path}") @armResourceRead(Widget)
    ${extra}read(${parameters(path)}): ${response};`;
}

function list(path: string, response: string): string {
  return `@get @route("${path}") @armResourceList(Widget)
    list(${parameters(path)}): ${response};`;
}

function spec(models: string, ...operations: string[]): string {
  return `${setup}\n${models}\ninterface Widgets { ${operations.join("\n")} }`;
}

describe("private link resource schema", () => {
  it("accepts custom point and collection responses with optional properties", async () => {
    await tester
      .expect(
        spec(
          `${validConnection} model Page { value: Connection[]; }`,
          point(connectionPoint, "Connection"),
          list(connectionCollection, "Page"),
        ),
      )
      .toBeValid();
    await tester
      .expect(
        spec(
          `${validLink} model Page { value: Link[]; }`,
          point(linkPoint, "Widget"),
          list(linkCollection, "Page"),
        ),
      )
      .toBeValid();
  });

  it.each([
    ["privateEndpoint", "privateLinkServiceConnectionState"],
    ["privateLinkServiceConnectionState", "privateEndpoint"],
  ])("reports a missing %s in a point response", async (_missing, present) => {
    await tester
      .expect(
        spec(
          `model Connection { properties: { ${present}?: string; }; }`,
          point(connectionPoint, "Connection"),
        ),
      )
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it("reports a missing properties bag", async () => {
    await tester
      .expect(spec("model Connection { id?: string; }", point(connectionPoint, "Connection")))
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it.each([
    "model Page { nextLink?: string; }",
    "model Page { value: Connection; }",
    "model Page { value: InvalidConnection[]; } model InvalidConnection { properties: {}; }",
  ])("reports malformed connection collection responses", async (page) => {
    await tester
      .expect(
        spec(
          `${validConnection} ${page}`,
          point(connectionPoint, "Connection"),
          list(connectionCollection, "Page"),
        ),
      )
      .toEmitDiagnostics(connectionListDiagnostic);
  });

  it.each(["groupId", "requiredMembers", "requiredZoneNames"])(
    "reports a missing %s in private link collection items",
    async (missing) => {
      const fields = ["groupId", "requiredMembers", "requiredZoneNames"]
        .filter((name) => name !== missing)
        .map((name) => `${name}?: string;`)
        .join("\n");
      await tester
        .expect(
          spec(
            `model Link { properties: { ${fields} }; } model Page { value: Link[]; }`,
            point(linkPoint, "Widget"),
            list(linkCollection, "Page"),
          ),
        )
        .toEmitDiagnostics(linkListDiagnostic);
    },
  );

  it("checks inherited and JSON-encoded payload properties", async () => {
    await tester
      .expect(
        spec(
          `
          model BaseProperties {
            @encodedName("application/json", "privateEndpoint") endpoint?: string;
          }
          model Properties extends BaseProperties { privateLinkServiceConnectionState?: string; }
          model Base { properties: Properties; }
          model Connection extends Base {}
          `,
          point(connectionPoint, "Connection"),
        ),
      )
      .toBeValid();
  });

  it("does not count properties hidden from read responses", async () => {
    await tester
      .expect(
        spec(
          `model Connection {
            properties: {
              @visibility(Lifecycle.Create) privateEndpoint?: string;
              privateLinkServiceConnectionState?: string;
            };
          }`,
          point(connectionPoint, "Connection"),
        ),
      )
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it("checks an explicit body instead of the HTTP response wrapper", async () => {
    await tester
      .expect(
        spec(
          `model Connection { properties: {}; }
           model Response { @statusCode status: 200; @body body: Connection; }`,
          point(connectionPoint, "Response"),
        ),
      )
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it("accepts nullable property bags and nullable collection arrays", async () => {
    await tester
      .expect(
        spec(
          `model Props { privateEndpoint?: string; privateLinkServiceConnectionState?: string; }
           model Connection { properties: Props | null; }
           model Page { value: Connection[] | null; }`,
          point(connectionPoint, "Connection"),
          list(connectionCollection, "Page"),
        ),
      )
      .toBeValid();
  });

  it("does not count never properties or body-ignored properties", async () => {
    await tester
      .expect(
        spec(
          `model Connection { properties: {
             privateEndpoint?: never;
             privateLinkServiceConnectionState?: string;
           }; }`,
          point(connectionPoint, "Connection"),
        ),
      )
      .toEmitDiagnostics(connectionDiagnostic);
    await tester
      .expect(
        spec(
          `model Connection { properties: {
             @bodyIgnore privateEndpoint?: string;
             privateLinkServiceConnectionState?: string;
           }; }
           model Response { @statusCode status: 200; @body body: Connection; }`,
          point(connectionPoint, "Response"),
        ),
      )
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it("ignores non-200 responses and other paths", async () => {
    await tester
      .expect(
        spec(
          "model Created { @statusCode status: 201; @body body: {}; }",
          point(connectionPoint, "Created"),
        ),
      )
      .toBeValid();
    await tester
      .expect(spec("model Bad { properties: {}; }", point(`${base}/other/{name}`, "Bad")))
      .toBeValid();
  });

  it("ignores non-GET operations on matching paths", async () => {
    await tester
      .expect(
        spec(
          "model Bad { properties: {}; }",
          `@put @route("${connectionPoint}") @armResourceCreateOrUpdate(Widget)
           create(${parameters(connectionPoint)}): Bad;`,
        ),
      )
      .toBeValid();
  });

  it("checks custom responses on the standard connection operation", async () => {
    await tester
      .expect(
        `
        ${setup}
        model Connection is PrivateEndpointConnectionResource {}
        model BadConnection { properties: { privateEndpoint?: string; }; }
        alias Connections = PrivateEndpoints<Connection>;
        @armResourceOperations interface Widgets {
          read is Connections.Read<Widget, Response = ArmResponse<BadConnection>>;
        }
      `,
      )
      .toEmitDiagnostics(connectionDiagnostic);
  });

  it("excludes unregistered routes and unmatched list-only operations", async () => {
    await tester
      .expect(
        spec(
          "model Page { value: string[]; }",
          list(connectionCollection, "Page"),
          `@get @route("${connectionPoint}")
           unregistered(${parameters(connectionPoint)}): Page;`,
        ),
      )
      .toBeValid();
  });

  it("accepts the standard ARM private endpoint and private link templates", async () => {
    await tester
      .expect(
        `
        ${setup}
        model Connection is PrivateEndpointConnectionResource {}
        model Link is PrivateLink {}
        alias Connections = PrivateEndpoints<Connection>;
        alias Links = PrivateLinks<Link>;
        @armResourceOperations interface Widgets {
          read is Connections.Read<Widget>;
          list is Connections.ListByParent<Widget>;
          readLink is Links.Read<Widget>;
          listLinks is Links.ListByParent<Widget>;
        }
      `,
      )
      .toBeValid();
  });
});
