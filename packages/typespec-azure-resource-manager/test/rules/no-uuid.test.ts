import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { noUuidRule } from "../../src/rules/no-uuid.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner: TesterInstance = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    noUuidRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

function inArmService(code: string): string {
  return `
    @armProviderNamespace
    @service(#{ title: "Test service" })
    namespace Microsoft.Test {
      ${code}
    }
  `;
}

function versionedArmService(resourceName: string): string {
  return `
    @armProviderNamespace
    @service(#{ title: "Test service" })
    @versioned(Versions)
    @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v6)
    namespace Microsoft.Test;

    enum Versions {
      @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
      v2024_01_01: "2024-01-01",
    }

    model Widget is TrackedResource<WidgetProperties> {
      ...ResourceNameParameter<
        Resource = Widget,
        KeyName = "widgetName",
        SegmentName = "widgets",
        ${resourceName}
        NamePattern = ""
      >;
    }

    model WidgetProperties {
      @visibility(Lifecycle.Read)
      provisioningState?: ResourceProvisioningState;
    }

    interface Operations extends Azure.ResourceManager.Operations {}

    @armResourceOperations
    interface Widgets {
      get is ArmResourceRead<Widget>;
      createOrUpdate is ArmResourceCreateOrReplaceAsync<Widget>;
      update is ArmResourcePatchAsync<Widget, WidgetProperties>;
      delete is ArmResourceDeleteWithoutOkAsync<Widget>;
      listByResourceGroup is ArmResourceListByParent<Widget>;
    }
  `;
}

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-uuid",
};

it("reports a UUID-typed model property", async () => {
  await tester
    .expect(
      inArmService(`
        model WidgetProperties {
          id: Azure.Core.uuid;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a UUID-typed query parameter", async () => {
  await tester
    .expect(
      inArmService(`
        @route("/widgets")
        interface Widgets {
          @get read(@query requestId: Azure.Core.uuid): string;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a UUID-typed resource name template parameter", async () => {
  await tester
    .expect(versionedArmService("Type = Azure.Core.uuid,"))
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
});

it("reports a UUID-formatted resource name template parameter", async () => {
  await tester
    .expect(
      `${versionedArmService("")}
      @@format(Widget.name, "uuid");
      `,
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic, diagnostic]);
});

it("reports a direct UUID request body", async () => {
  await tester
    .expect(
      inArmService(`
        @route("/widgets")
        interface Widgets {
          @post create(@body body: Azure.Core.uuid): string;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a direct UUID response body", async () => {
  await tester
    .expect(
      inArmService(`
        @route("/widgets")
        interface Widgets {
          @get read(): Azure.Core.uuid;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a UUID response body through an ARM response template", async () => {
  await tester
    .expect(
      inArmService(`
        @route("/widgets")
        interface Widgets {
          @get read(): ArmResponse<Azure.Core.uuid>;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a custom scalar derived from UUID", async () => {
  await tester
    .expect(
      inArmService(`
        scalar WidgetId extends Azure.Core.uuid;

        model WidgetProperties {
          id: WidgetId;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a custom scalar with an explicit UUID format", async () => {
  await tester
    .expect(
      inArmService(`
        @format("uuid")
        scalar WidgetId extends string;

        model WidgetProperties {
          id: WidgetId;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a property-level UUID format", async () => {
  await tester
    .expect(
      inArmService(`
        model IdentifierProperties {
          id: string;
        }

        model WidgetProperties {
          ...IdentifierProperties;
        }

        @@format(WidgetProperties.id, "uuid");
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports an array property containing UUID values", async () => {
  await tester
    .expect(
      inArmService(`
        model WidgetProperties {
          relatedIds: Azure.Core.uuid[];
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("allows non-UUID shapes and UUIDs in client-only namespaces", async () => {
  await tester
    .expect(
      `
      ${inArmService(`
        model WidgetProperties {
          id: string;
          relatedIds: string[];
        }
      `)}

      namespace Azure.ResourceManager.Test.Models {
        model ClientOnlyModel {
          id: Azure.Core.uuid;
        }
      }
    `,
    )
    .toBeValid();
});

it("reports a UUID property on an unreferenced named model", async () => {
  await tester
    .expect(
      inArmService(`
        model UnreferencedModel {
          id: Azure.Core.uuid;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports UUID values nested in records, tuples, and unions", async () => {
  await tester
    .expect(
      inArmService(`
        model WidgetProperties {
          recordIds: Record<Azure.Core.uuid>;
          tupleIds: [Azure.Core.uuid];
          unionId: Azure.Core.uuid | string;
        }
      `),
    )
    .toEmitDiagnostics([diagnostic, diagnostic, diagnostic]);
});

it("reports a UUID-typed response header", async () => {
  await tester
    .expect(
      inArmService(`
        @route("/widgets")
        interface Widgets {
          @get read(): {
            @header requestId: Azure.Core.uuid;
            @body body: string;
          };
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});

it("deduplicates a property reached through declarations and HTTP payloads", async () => {
  await tester
    .expect(
      inArmService(`
        model Widget {
          id: Azure.Core.uuid;
        }

        @route("/widgets")
        interface Widgets {
          @get read(): Widget;
        }
      `),
    )
    .toEmitDiagnostics(diagnostic);
});
