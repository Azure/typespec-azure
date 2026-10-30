import { Tester } from "#test/tester.js";
import { createLinterRuleTester, type LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { privateEndpointApisMissingRule } from "../../src/rules/private-endpoint-apis-missing.js";

const setup = `
  @armProviderNamespace @service namespace Microsoft.TestService;
  model Widget is TrackedResource<{}> {
    ...ResourceNameParameter<Resource = Widget, KeyName = "widgetName", SegmentName = "widgets">;
  }
  model PrivateEndpointConnection is PrivateEndpointConnectionResource {}
  model PrivateLinkResource is PrivateLink {}
  alias Connections = PrivateEndpoints<PrivateEndpointConnection>;
  alias Links = PrivateLinks<PrivateLinkResource>;
`;
const basePath =
  "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";
const suffixes = [
  "/privateEndpointConnections/{privateEndpointConnectionName}",
  "/privateEndpointConnections",
  "/privateLinkResources",
];
const operations = [
  "read is Connections.Read<Widget>;",
  "list is Connections.ListByParent<Widget>;",
  "links is Links.ListByParent<Widget>;",
];

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    privateEndpointApisMissingRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function diagnostic(path: string) {
  return {
    code: "@azure-tools/typespec-azure-resource-manager/private-endpoint-apis-missing",
    message: `The private endpoint API: ${path} is missing.`,
  };
}

async function checkPresence(mask: number) {
  const expectation = tester.expect(`${setup}
    /*target*/@armResourceOperations interface Widgets {
      ${operations.filter((_, index) => mask & (1 << index)).join("\n")}
    }
  `);
  if (mask === 0 || mask === 7) {
    await expectation.toBeValid();
  } else {
    await expectation.toEmitDiagnostics((result) =>
      suffixes
        .filter((_, index) => !(mask & (1 << index)))
        .map((suffix) => ({
          ...diagnostic(basePath + suffix),
          pos: result.pos.target.pos,
        })),
    );
  }
}

describe("registered ARM path completeness", () => {
  it("accepts a resource without private endpoint APIs", () => checkPresence(0));
  it("requires collections when only the connection point exists", () => checkPresence(1));
  it("requires the point and links when only the connection collection exists", () =>
    checkPresence(2));
  it("requires private link discovery when both connection paths exist", () => checkPresence(3));
  it("requires both connection paths when only private links exist", () => checkPresence(4));
  it("requires the connection collection when the point and links exist", () => checkPresence(5));
  it("requires the connection point when both collections exist", () => checkPresence(6));
  it("accepts the complete standard private endpoint API set", () => checkPresence(7));

  it("accepts a private link collection implemented with the standard action template", async () => {
    await tester
      .expect(
        `${setup}
      @armResourceOperations interface Widgets {
        read is Connections.Read<Widget>;
        list is Connections.ListByParent<Widget>;
        @get @action("privateLinkResources")
        links is ArmResourceActionSync<
          Widget, void, ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `,
      )
      .toBeValid();
  });

  it("requires both connection paths when only the action-template link collection exists", async () => {
    await tester
      .expect(
        `${setup}
      /*target*/@armResourceOperations interface Widgets {
        @get @action("privateLinkResources")
        links is ArmResourceActionSync<
          Widget, void, ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `,
      )
      .toEmitDiagnostics((result) =>
        suffixes.slice(0, 2).map((suffix) => ({
          ...diagnostic(basePath + suffix),
          pos: result.pos.target.pos,
        })),
      );
  });

  it.each([true, false])(
    "retains same-name actions across interfaces: linkFirst=%s",
    async (linkFirst) => {
      const linkAction = `
      /*links*/@armResourceOperations interface PrivateLinkResources {
        @get @action("privateLinkResources")
        listByWidget is ArmResourceActionSync<
          Widget, void, ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `;
      const otherAction = `
      @armResourceOperations interface OtherActions {
        @get @action("otherResources")
        listByWidget is ArmResourceActionSync<
          Widget, void, ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `;
      const actions = linkFirst ? linkAction + otherAction : otherAction + linkAction;
      const expectation = tester.expect(`${setup}
        @armResourceOperations interface EndpointOperations {
          ${linkFirst ? operations.slice(0, 2).join("\n") : ""}
        }
        ${actions}
      `);
      if (linkFirst) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics((result) =>
          suffixes.slice(0, 2).map((suffix) => ({
            ...diagnostic(basePath + suffix),
            pos: result.pos.links.pos,
          })),
        );
      }
    },
  );

  it.each([
    { legacy: false, widgetFirst: true, includeLinks: false },
    { legacy: true, widgetFirst: false, includeLinks: true },
  ])(
    "retains same-name read/list registrations: legacy=$legacy, widgetFirst=$widgetFirst, links=$includeLinks",
    async ({ legacy, widgetFirst, includeLinks }) => {
      const parents = widgetFirst ? ["Widget", "Other"] : ["Other", "Widget"];
      const interfaces = parents.map(
        (parent) => `
              ${
                legacy
                  ? `
                alias ${parent}Connections = Legacy.LegacyOperations<
                  ResourceInstanceParameters<${parent}>,
                  {
                    @path @key @segment("privateEndpointConnections")
                    privateEndpointConnectionName: string;
                  }
                >;
              `
                  : ""
              }
              /*${parent}*/@armResourceOperations interface ${parent}Endpoints {
                read is ${legacy ? `${parent}Connections.Read<PrivateEndpointConnection>` : `Connections.Read<${parent}>`};
                list is ${legacy ? `${parent}Connections.ListSinglePage<PrivateEndpointConnection>` : `Connections.ListByParent<${parent}>`};
                ${includeLinks ? `${parent.toLowerCase()}Links is Links.ListByParent<${parent}>;` : ""}
              }
            `,
      );
      const expectation = tester.expect(`${setup}
            model Other is TrackedResource<{}> {
              ...ResourceNameParameter<Resource = Other, KeyName = "otherName", SegmentName = "others">;
            }
            ${interfaces.join("\n")}
          `);
      if (includeLinks) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics((result) =>
          parents.map((parent) => ({
            ...diagnostic(
              (parent === "Widget"
                ? basePath
                : basePath.replace("widgets/{widgetName}", "others/{otherName}")) + suffixes[2],
            ),
            pos: result.pos[parent].pos,
          })),
        );
      }
    },
  );

  it.each([
    { customResource: false, includeConnections: true },
    { customResource: true, includeConnections: false },
  ])(
    "checks legacy operations on an unlisted registered model: custom=$customResource, connections=$includeConnections",
    async ({ customResource, includeConnections }) => {
      const expectation = tester.expect(`${setup}
          ${customResource ? "@Legacy.customAzureResource" : ""}
          model LinkInformation {
            id?: string;
            name?: string;
            type?: string;
          }
          alias LinkOperations = Legacy.LegacyOperations<
            ResourceInstanceParameters<Widget>,
            {
              @path @key @segment("privateLinkResources")
              groupId: string;
            }
          >;
          /*target*/@armResourceOperations interface Endpoints {
            ${includeConnections ? operations.slice(0, 2).join("\n") : ""}
            links is LinkOperations.ListSinglePage<LinkInformation>;
          }
        `);
      if (includeConnections) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics((result) =>
          suffixes.slice(0, 2).map((suffix) => ({
            ...diagnostic(basePath + suffix),
            pos: result.pos.target.pos,
          })),
        );
      }
    },
  );

  it.each([true, false])(
    "checks explicit library resource registrations: links=%s",
    async (includeLinks) => {
      const expectation = tester.expect(`${setup}
        /*target*/@armResourceOperations interface Endpoints {
          read is Connections.Read<Widget, Resource = PrivateEndpointConnectionResource>;
          list is Connections.ListByParent<Widget, Resource = PrivateEndpointConnectionResource>;
          ${includeLinks ? operations[2] : ""}
        }
      `);
      if (includeLinks) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics((result) => ({
          ...diagnostic(basePath + suffixes[2]),
          pos: result.pos.target.pos,
        }));
      }
    },
  );

  it.each([true, false])(
    "excludes unregistered HTTP private link routes: connections=%s",
    async (includeConnections) => {
      const expectation = tester.expect(`${setup}
        @armResourceOperations interface Unregistered {
          @get @route("${basePath}/privateLinkResources")
          links(...ResourceInstanceParameters<Widget>): ResourceListResult<PrivateLinkResource>;
        }
        /*target*/@armResourceOperations interface Endpoints {
          ${includeConnections ? operations.slice(0, 2).join("\n") : ""}
        }
      `);
      if (includeConnections) {
        await expectation.toEmitDiagnostics((result) => ({
          ...diagnostic(basePath + suffixes[2]),
          pos: result.pos.target.pos,
        }));
      } else {
        await expectation.toBeValid();
      }
    },
  );

  it.each([true, false])(
    "checks concrete inherited operations without generic template companions: links=%s",
    async (includeLinks) => {
      const expectation = tester.expect(`${setup}
        op GenericOperation<T>(@body input: T): void;
        interface EndpointTemplates<T extends Foundations.SimpleResource> {
          read is Connections.Read<T>;
          list is Connections.ListByParent<T>;
        }
        /*target*/@armResourceOperations interface Endpoints extends EndpointTemplates<Widget> {
          ${includeLinks ? operations[2] : ""}
        }
      `);
      if (includeLinks) {
        await expectation.toBeValid();
      } else {
        await expectation.toEmitDiagnostics((result) => ({
          ...diagnostic(basePath + suffixes[2]),
          pos: result.pos.target.pos,
        }));
      }
    },
  );

  it.each([
    {
      name: "connection point over earlier connection collection",
      preferred: 0,
      other: 1,
      missing: 2,
    },
    {
      name: "connection collection over earlier private link collection",
      preferred: 1,
      other: 2,
      missing: 0,
    },
  ])("prefers $name for the diagnostic target", async ({ preferred, other, missing }) => {
    await tester
      .expect(
        `${setup}
        @armResourceOperations interface Earlier { ${operations[other]} }
        /*target*/@armResourceOperations interface Preferred { ${operations[preferred]} }
      `,
      )
      .toEmitDiagnostics((result) => ({
        ...diagnostic(basePath + suffixes[missing]),
        pos: result.pos.target.pos,
      }));
  });

  it("does not let one parent's link collection complete another parent's API set", async () => {
    await tester
      .expect(
        `${setup}
      model Other is TrackedResource<{}> {
        ...ResourceNameParameter<Resource = Other, KeyName = "otherName", SegmentName = "others">;
      }
      /*connections*/@armResourceOperations interface ConnectionsOnly {
        read is Connections.Read<Widget>;
        list is Connections.ListByParent<Widget>;
      }
      /*links*/@armResourceOperations interface LinksOnly {
        links is Links.ListByParent<Other>;
      }
    `,
      )
      .toEmitDiagnostics((result) => [
        { ...diagnostic(basePath + suffixes[2]), pos: result.pos.connections.pos },
        ...suffixes.slice(0, 2).map((suffix) => ({
          ...diagnostic(basePath.replace("widgets/{widgetName}", "others/{otherName}") + suffix),
          pos: result.pos.links.pos,
        })),
      ]);
  });
});
