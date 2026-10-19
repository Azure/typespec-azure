import { resolvePath } from "@typespec/compiler";
import { createLinterRuleTester, createTester } from "@typespec/compiler/testing";
import { describe, it } from "vitest";
import { implementPrivateEndpointApisRule } from "../../src/rules/implement-private-endpoint-apis.js";

const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
  ],
})
  .importLibraries()
  .using("TypeSpec.Http", "TypeSpec.Rest", "Azure.ResourceManager");

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

async function tester() {
  return createLinterRuleTester(
    await Tester.createInstance(),
    implementPrivateEndpointApisRule,
    "tsp-lintdiff-local-linter",
  );
}

function diagnostic(path: string) {
  return {
    code: "tsp-lintdiff-local-linter/implement-private-endpoint-apis",
    message: `The private endpoint API: ${path} is missing.`,
  };
}

describe("implement-private-endpoint-apis", () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    "checks each missing path once at the existing interface for presence mask %s",
    async (mask) => {
      const code = `${setup}
        /*target*/@armResourceOperations interface Widgets {
          ${operations.filter((_, index) => mask & (1 << index)).join("\n")}
        }
      `;
      const expectation = (await tester()).expect(code);
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
    },
  );

  it("accepts a private link collection implemented with the standard action template", async () => {
    await (
      await tester()
    )
      .expect(
        `${setup}
        @armResourceOperations interface Widgets {
          read is Connections.Read<Widget>;
          list is Connections.ListByParent<Widget>;
          @get @action("privateLinkResources")
          links is ArmResourceActionSync<
            Widget,
            void,
            ArmResponse<ResourceListResult<PrivateLinkResource>>
          >;
        }
      `,
      )
      .toBeValid();
  });

  it("requires both connection paths when only the action-template link collection exists", async () => {
    await (
      await tester()
    )
      .expect(
        `${setup}
        /*target*/@armResourceOperations interface Widgets {
          @get @action("privateLinkResources")
          links is ArmResourceActionSync<
            Widget,
            void,
            ArmResponse<ResourceListResult<PrivateLinkResource>>
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

  for (const linkFirst of [true, false]) {
    const linkAction = `
      /*links*/@armResourceOperations interface PrivateLinkResources {
        @get @action("privateLinkResources")
        listByWidget is ArmResourceActionSync<
          Widget,
          void,
          ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `;
    const otherAction = `
      @armResourceOperations interface OtherActions {
        @get @action("otherResources")
        listByWidget is ArmResourceActionSync<
          Widget,
          void,
          ArmResponse<ResourceListResult<PrivateLinkResource>>
        >;
      }
    `;
    const actions = linkFirst ? linkAction + otherAction : otherAction + linkAction;

    it(`accepts complete APIs with same-name actions across interfaces, link first: ${linkFirst}`, async () => {
      await (
        await tester()
      )
        .expect(
          `${setup}
          @armResourceOperations interface EndpointOperations {
            read is Connections.Read<Widget>;
            list is Connections.ListByParent<Widget>;
          }
          ${actions}
        `,
        )
        .toBeValid();
    });

    it(`reports both missing connections with same-name actions, link first: ${linkFirst}`, async () => {
      await (await tester()).expect(`${setup}${actions}`).toEmitDiagnostics((result) =>
        suffixes.slice(0, 2).map((suffix) => ({
          ...diagnostic(basePath + suffix),
          pos: result.pos.links.pos,
        })),
      );
    });
  }

  for (const legacy of [false, true]) {
    for (const widgetFirst of [true, false]) {
      for (const includeLinks of [true, false]) {
        it(`retains same-name read/list registrations: legacy=${legacy}, widgetFirst=${widgetFirst}, links=${includeLinks}`, async () => {
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
          const expectation = (await tester()).expect(`${setup}
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
        });
      }
    }
  }

  for (const customResource of [false, true]) {
    for (const includeConnections of [true, false]) {
      it(`checks legacy operations on an unlisted registered model: custom=${customResource}, connections=${includeConnections}`, async () => {
        const expectation = (await tester()).expect(`${setup}
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
      });
    }
  }

  for (const includeLinks of [true, false]) {
    it(`checks explicit library resource registrations: links=${includeLinks}`, async () => {
      const expectation = (await tester()).expect(`${setup}
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
    });
  }

  for (const includeConnections of [true, false]) {
    it(`excludes unregistered HTTP private link routes: connections=${includeConnections}`, async () => {
      const expectation = (await tester()).expect(`${setup}
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
    });
  }

  for (const includeLinks of [true, false]) {
    it(`checks concrete inherited operations without generic template companions: links=${includeLinks}`, async () => {
      const expectation = (await tester()).expect(`${setup}
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
    });
  }

  for (const [preferred, other, missing] of [
    [0, 1, 2],
    [1, 2, 0],
  ]) {
    it(`prefers path ${preferred} over earlier path ${other} for the diagnostic target`, async () => {
      await (
        await tester()
      )
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
  }

  it("does not let one parent's link collection complete another parent's API set", async () => {
    await (
      await tester()
    )
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
